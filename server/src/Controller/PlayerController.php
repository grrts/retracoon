<?php

namespace App\Controller;

use App\Dto\ProfileInput;
use App\Dto\RunResult;
use App\Dto\Spend;
use App\Entity\DailyScore;
use App\Entity\Player;
use App\Entity\Prize;
use App\Entity\SeasonScore;
use App\Entity\SharedRun;
use App\Entity\Purchase;
use App\Entity\RunLog;
use App\Entity\Session;
use App\Repository\DailyScoreRepository;
use App\Repository\PlayerRepository;
use App\Repository\PrizeRepository;
use App\Repository\SeasonScoreRepository;
use App\Service\AppleTokens;
use App\Service\Names;
use App\Service\Periods;
use App\Service\Prizes;
use App\Service\RunAudit;
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
     * End of a run. Bests only go up, so sending an old or worse result is harmless.
     * A normal run also counts for this season; a daily run only for its day's board,
     * and only while that day is open (today, or yesterday within the grace period).
     * A run whose ledger doesn't add up counts nowhere (see RunAudit); the answer
     * looks the same apart from `counted`, so the game drops it and moves on.
     */
    #[Route('/me/runs', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function run(#[CurrentUser] Player $me, #[MapRequestPayload] RunResult $run, RateLimiterFactoryInterface $runLimiter, DailyScoreRepository $daily, SeasonScoreRepository $seasons, RunAudit $audit): JsonResponse
    {
        if (!$runLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $now = $this->periods->now();
        $improved = false;
        $counted = true;
        [$verdict, $reasons] = $audit->check($run, $me->getBestStage());
        if (RunAudit::REJECTED === $verdict) {
            $counted = false;
        } elseif ('daily' === $run->mode) {
            $day = $run->day ?? $this->periods->today();
            $counted = \in_array($day, [$this->periods->today(), $this->periods->lateDay()], true);
            if ($counted) {
                $score = $daily->forPlayer($me, $day);
                if (!$score) {
                    $score = new DailyScore($me, $day);
                    $this->em->persist($score);
                }
                $improved = $score->record($run->stage, $run->level, $run->distance, $run->timeMs, $now);
            }
        } elseif ('best' === $run->mode) {
            $improved = $me->recordRun($run->stage, $run->level, $run->distance);
        } else {
            $improved = $me->recordRun($run->stage, $run->level, $run->distance);
            $season = $this->periods->season();
            $score = $seasons->forPlayer($me, $season);
            if (!$score) {
                $score = new SeasonScore($me, $season);
                $this->em->persist($score);
            }
            $improved = $score->record($run->stage, $run->level, $run->distance, $now) || $improved;
        }
        if (null !== $run->skin) {
            $me->setSkin($run->skin);
        }
        if ($improved || \in_array($verdict, [RunAudit::SUSPECT, RunAudit::REJECTED], true)) {
            $this->em->persist(new RunLog($me, $run->mode, 'daily' === $run->mode ? ($run->day ?? $this->periods->today()) : null, $run->stage, $run->level, $run->distance, $run->timeMs, $verdict, $reasons, $improved, \in_array('log_malformed', $reasons, true) ? null : $run->log, $now));
        }
        $this->em->flush();

        return $this->json(['improved' => $improved, 'counted' => $counted, 'player' => $this->standing->me($me)]);
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
        foreach ([Session::class, Purchase::class, DailyScore::class, SeasonScore::class, Prize::class, SharedRun::class, RunLog::class] as $class) {
            $this->em->createQuery("DELETE FROM $class x WHERE x.player = :p")->setParameter('p', $me)->execute();
        }
        $this->em->remove($me);
        $this->em->flush();

        return new Response(null, 204);
    }
}
