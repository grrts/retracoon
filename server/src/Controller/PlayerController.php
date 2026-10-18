<?php

namespace App\Controller;

use App\Dto\ProfileInput;
use App\Dto\RunResult;
use App\Dto\RunStart;
use App\Dto\Spend;
use App\Entity\DailyScore;
use App\Entity\Player;
use App\Entity\Prize;
use App\Entity\SeasonScore;
use App\Entity\SharedRun;
use App\Entity\Purchase;
use App\Entity\RunLog;
use App\Entity\RunTicket;
use App\Entity\Session;
use App\Repository\PlayerRepository;
use App\Repository\PrizeRepository;
use App\Repository\RunLogRepository;
use App\Repository\RunTicketRepository;
use App\Service\AppleTokens;
use App\Service\Names;
use App\Service\Periods;
use App\Service\Prizes;
use App\Service\Replays;
use App\Service\RunAudit;
use App\Service\Scores;
use App\Service\Standing;
use App\Service\Tags;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
final class PlayerController extends AbstractController
{
    // A result may be a little late against its ticket's clock (network, the death
    // animation), never early.
    private const TICKET_SLACK_MS = 60000;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
        private readonly Tags $tags,
        private readonly Standing $standing,
        private readonly Periods $periods,
    ) {
    }

    #[Route('/me', methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function me(#[CurrentUser] Player $me, Prizes $prizes): JsonResponse
    {
        $prizes->settle();

        return $this->json(['player' => $this->standing->me($me)]);
    }

    #[Route('/me', methods: ['PATCH'])]
    #[IsGranted('ROLE_PLAYER')]
    public function update(#[CurrentUser] Player $me, #[MapRequestPayload] ProfileInput $input): JsonResponse
    {
        if (null !== $input->name) {
            $name = Names::clean($input->name) ?? throw new UnprocessableEntityHttpException('Names need 3-16 letters or numbers.');
            if ($name !== $me->getName()) {
                $tag = $this->tags->free($name) ?? throw new ConflictHttpException('That name is full. Pick another.');
                $me->setName($name, $tag);
            }
        }
        if (null !== $input->skin) {
            $me->setSkin($input->skin);
        }
        $this->em->flush();

        return $this->json(['player' => $this->standing->me($me)]);
    }

    /**
     * Start of a run: a ticket with the run's seed and the raccoon it starts from. A
     * normal ticket still open from before was never finished (the app was closed, or
     * GIVE UP), so it counts as a death and the banked raccoon is gone. Daily tickets
     * are always a fresh raccoon on today's road.
     */
    #[Route('/me/runs/start', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function startRun(#[CurrentUser] Player $me, #[MapRequestPayload] RunStart $in, RateLimiterFactoryInterface $ticketLimiter, RunTicketRepository $tickets): JsonResponse
    {
        if (!$ticketLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $now = $this->periods->now();
        $day = null;
        $kept = null;
        $basedOn = null;
        if ('daily' === $in->mode) {
            $day = $this->periods->today();
        } else {
            if (!$me->isKeptSet()) {
                $me->adoptKept($in->kept);
            }
            foreach ($tickets->openNormal($me) as $old) {
                $old->close(RunTicket::ABANDONED, $now);
                $me->setKept(null);
            }
            $kept = $me->getKept();
            $basedOn = $me->getKeptFrom();
        }
        $ticket = new RunTicket(bin2hex(random_bytes(10)), $me, $in->mode, $day, random_int(0, 0xFFFFFFFF), $kept, $basedOn, $now);
        $this->em->persist($ticket);
        $this->em->flush();

        return $this->json(['ticket' => ['id' => $ticket->getId(), 'seed' => $ticket->getSeed(), 'day' => $day, 'kept' => $kept]]);
    }

    /**
     * End of a run. Bests only go up, so sending an old or worse result is harmless.
     * A normal run also counts for this season; a daily run only for its day's board,
     * and only while that day is open (today, or yesterday within the grace period).
     * A run whose ledger doesn't add up counts nowhere (see RunAudit). A run played on
     * a ticket also brings every choice it made: with RUN_REPLAY=on it waits for the
     * replay job (`pending`) and only counts once it replays to the same score; runs
     * without a ticket then count nowhere. The answer looks the same apart from
     * `counted` and `pending`, so the game drops the run and moves on.
     */
    #[Route('/me/runs', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function run(#[CurrentUser] Player $me, #[MapRequestPayload] RunResult $run, RateLimiterFactoryInterface $runLimiter, RunAudit $audit, Scores $scores, Replays $replays, RunTicketRepository $tickets, RunLogRepository $logs): JsonResponse
    {
        if (!$runLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $now = $this->periods->now();
        $improved = false;
        $pending = false;
        [$verdict, $reasons] = $audit->check($run, $me->getBestStage());
        $day = 'daily' === $run->mode ? ($run->day ?? $this->periods->today()) : null;
        $timeMs = $run->timeMs;

        $ticket = null === $run->ticket ? null : $tickets->find($run->ticket);
        if (null !== $run->ticket) {
            $bad = $this->ticketProblem($ticket, $me, $run, $day, $now, $logs);
            if (null === $bad) {
                $ticket->close(RunTicket::DONE, $now);
                // The daily board breaks ties on time: never less than the server saw pass.
                $elapsed = (int) (($now->format('U.u') - $ticket->getIssuedAt()->format('U.u')) * 1000);
                if ('daily' === $run->mode) {
                    $timeMs = max($timeMs, $elapsed - self::TICKET_SLACK_MS);
                }
                if ($run->timeMs > $elapsed + self::TICKET_SLACK_MS) {
                    $bad = 'ticket_clock';
                }
            }
            if (null !== $bad) {
                $verdict = RunAudit::REJECTED;
                $reasons[] = $bad;
                $ticket = null;
            }
        }
        $withReplay = null !== $ticket && Replays::wellFormed($run->replay);
        if (null !== $ticket && !$withReplay) {
            $verdict = RunAudit::REJECTED;
            $reasons[] = 'replay_malformed';
        }

        $counted = RunAudit::REJECTED !== $verdict;
        if ($counted && 'daily' === $run->mode) {
            $counted = \in_array($day, [$this->periods->today(), $this->periods->lateDay()], true);
        }
        $queue = $counted && $withReplay;
        if ($counted && $replays->enforced()) {
            // Only runs played on a ticket can be replayed, so only they can count.
            $counted = $withReplay;
            $pending = $withReplay;
        } elseif ($counted) {
            $improved = $scores->record($me, $run->mode, $day, $this->periods->season(), $run->stage, $run->level, $run->distance, $timeMs, $now);
        }
        if (null !== $run->skin) {
            $me->setSkin($run->skin);
        }
        $log = null;
        if ($improved || $queue || \in_array($verdict, [RunAudit::SUSPECT, RunAudit::REJECTED], true)) {
            $log = new RunLog($me, $run->mode, $day, $run->stage, $run->level, $run->distance, $timeMs, $verdict, array_values(array_unique($reasons)), $improved, \in_array('log_malformed', $reasons, true) ? null : $run->log, $now);
            if ($queue) {
                $log->awaitReplay($run->replay, $ticket->start(1 === $run->replay['leg']), Replays::endOf($run->log), $ticket->getBasedOn());
            }
            $this->em->persist($log);
            $this->em->flush();
        }
        // The banked raccoon follows the run it came from: a retreat banks the raccoon
        // it ended with (the replay has the last word), anything else wipes it.
        if (null !== $run->ticket && 'normal' === $run->mode && ($ticket || RunAudit::REJECTED === $verdict)) {
            $close = $run->log['close'] ?? null;
            $retreat = RunAudit::REJECTED !== $verdict && 'retreat' === Replays::endOf($run->log) && \is_array($close);
            $me->setKept($retreat ? ['l' => $close['l'], 'st' => $close['st'], 'p' => $close['p']] : null, $log?->getId());
        }
        $this->em->flush();

        return $this->json(['improved' => $improved, 'counted' => $counted, 'pending' => $pending, 'player' => $this->standing->me($me)]);
    }

    private function ticketProblem(?RunTicket $t, Player $me, RunResult $run, ?string $day, \DateTimeImmutable $now, RunLogRepository $logs): ?string
    {
        if (!$t || $t->getPlayer() !== $me) {
            return 'ticket_unknown';
        }
        if (!$t->isOpen($now)) {
            return 'ticket_closed';
        }
        if ($t->getMode() !== $run->mode || ('daily' === $run->mode && $t->getDay() !== $day)) {
            return 'ticket_wrong_run';
        }
        // The ledger must start from the raccoon the ticket handed out.
        $open = $run->log['open'] ?? null;
        $want = 'daily' === $t->getMode() || null === $t->getKept() ? RunAudit::FRESH : $t->getKept();
        if (!\is_array($open) || $open !== $want) {
            return 'ticket_start';
        }
        // Started from a raccoon whose own run has since failed its replay.
        if (null !== $t->getBasedOn() && \in_array($logs->find($t->getBasedOn())?->getReplayStatus(), [RunLog::FAILED, RunLog::UNVERIFIABLE], true)) {
            return 'bad_start';
        }

        return null;
    }

    /** The game showed these prizes ("YOU WON YESTERDAY'S DAILY RUN"). */
    #[Route('/me/prizes/seen', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function prizesSeen(#[CurrentUser] Player $me, PrizeRepository $prizes): JsonResponse
    {
        foreach ($prizes->unseen($me) as $p) {
            $p->markSeen($this->periods->now());
        }
        $this->em->flush();

        return $this->json(['player' => $this->standing->me($me)]);
    }

    /**
     * Spend gems on an unlock (a skin). Gems live on the server so they follow the
     * account; asking for the same unlock twice only charges once.
     */
    #[Route('/me/spend', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function spend(#[CurrentUser] Player $me, #[MapRequestPayload] Spend $in): JsonResponse
    {
        if (!$me->spend($in->gems, $in->item)) {
            throw new ConflictHttpException('Not enough gems.');
        }
        $this->em->flush();

        return $this->json(['player' => $this->standing->me($me)]);
    }

    /** Deletes the player, their scores, run logs, shared runs, friendships, purchases and sign-ins. */
    #[Route('/me', methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function delete(#[CurrentUser] Player $me, AppleTokens $apple): Response
    {
        // Apple requires revoking Sign in with Apple tokens on account deletion.
        if (null !== ($t = $me->getAppleRefreshToken())) {
            $apple->revoke($t);
        }
        // Explicit as well as ON DELETE CASCADE, for databases that don't enforce it.
        foreach ([Session::class, Purchase::class, DailyScore::class, SeasonScore::class, Prize::class, SharedRun::class, RunLog::class, RunTicket::class] as $class) {
            $this->em->createQuery("DELETE FROM $class x WHERE x.player = :p")->setParameter('p', $me)->execute();
        }
        $this->em->remove($me);
        $this->em->flush();

        return new Response(null, 204);
    }
}
