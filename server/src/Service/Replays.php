<?php

namespace App\Service;

use App\Entity\RunLog;
use App\Repository\RunLogRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * Replaying runs. The game sends every choice of a run played on a ticket; the replay
 * job (tools/replay-worker.ts, run by .github/workflows/replay.yml or a cron job) picks
 * them up from GET /api/admin/replays, replays each one with the game's own rules at
 * the build the player had, and posts the results back here.
 *
 * With RUN_REPLAY=on a run only reaches the boards once its replay comes back with the
 * same score; without it runs count at once (ledger checks only) and the replay just
 * flags the ones that fail. Either way a run that fails its replay takes the banked
 * raccoon with it, and so does every run started from that raccoon.
 */
final class Replays
{
    public const VERSION = 1;
    public const MAX_ACTS = 60000;
    // How far apart the run's own clock and the game's time may be: the game starts its
    // clock a moment before the first choice, and a death plays out after the last one.
    public const CLOCK_EARLY_MS = 2000;
    public const CLOCK_LATE_MS = 20000;
    // A run still waiting this long holds no prize back.
    public const PRIZE_WAIT = 'P3D';

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly RunLogRepository $logs,
        private readonly Periods $periods,
        private readonly Scores $scores,
        #[Autowire('%env(default::RUN_REPLAY)%')] private readonly ?string $mode = null,
        #[Autowire('%env(default::REPLAY_KEY)%')] private readonly ?string $key = null,
    ) {
    }

    /** Runs only count once replayed. */
    public function enforced(): bool
    {
        return 'on' === $this->mode;
    }

    public function keyMatches(?string $given): bool
    {
        return null !== $this->key && '' !== $this->key && null !== $given && hash_equals($this->key, $given);
    }

    /** A replay as the game sends it: version, build, legendary flag and choices. */
    public static function wellFormed(mixed $r): bool
    {
        return \is_array($r) && self::VERSION === ($r['v'] ?? null) && \is_string($r['build'] ?? null) && \strlen($r['build']) <= 64
            && \in_array($r['leg'] ?? null, [0, 1], true) && \is_array($r['acts'] ?? null) && array_is_list($r['acts']) && \count($r['acts']) <= self::MAX_ACTS;
    }

    /** How a ledger says the run ended: its last fight lost is a death. */
    public static function endOf(?array $ledger): ?string
    {
        $last = null;
        foreach ($ledger['e'] ?? [] as $e) {
            if ('f' === ($e[0] ?? null)) {
                $last = $e;
            }
        }

        return null === $last ? null : (0 === $last[3] ? 'death' : 'retreat');
    }

    /**
     * Runs ready for the replay job, oldest first. A run started from a raccoon whose
     * own run is still waiting comes after it.
     *
     * @return list<array<string, mixed>>
     */
    public function jobs(int $limit): array
    {
        $out = [];
        foreach ($this->logs->pendingReplays($limit * 2) as $log) {
            if (null !== $log->getBasedOn() && RunLog::PENDING === $this->logs->find($log->getBasedOn())?->getReplayStatus()) {
                continue;
            }
            $out[] = [
                'id' => $log->getId(),
                'build' => $log->getReplay()['build'] ?? '',
                'start' => $log->getStart(),
                'acts' => $log->getReplay()['acts'] ?? [],
                'claim' => ['end' => $log->getEnd(), 'stage' => $log->getStage(), 'level' => $log->getLevel(), 'distance' => $log->getDistance(), 'timeMs' => $log->getTimeMs()],
            ];
            if (\count($out) >= $limit) {
                break;
            }
        }

        return $out;
    }

    /**
     * The replay job's results. Each is what tools/replay.ts printed, or
     * {id, unverifiable: true} when the run's build couldn't be checked out.
     *
     * @param list<mixed> $results
     *
     * @return array{ok: int, failed: int, skipped: int}
     */
    public function settle(array $results): array
    {
        $n = ['ok' => 0, 'failed' => 0, 'skipped' => 0];
        foreach ($results as $res) {
            $log = \is_array($res) && isset($res['id']) ? $this->logs->find((string) $res['id']) : null;
            if (!$log || RunLog::PENDING !== $log->getReplayStatus()) {
                ++$n['skipped'];
                continue;
            }
            [$status, $reason] = $this->judge($log, $res);
            if (RunLog::REPLAYED === $status) {
                $this->pass($log, $res);
                ++$n['ok'];
            } else {
                $this->fail($log, $status, $reason);
                ++$n['failed'];
            }
        }
        $this->em->flush();

        return $n;
    }

    /** @return array{0: string, 1: ?string} */
    private function judge(RunLog $log, array $res): array
    {
        if (true === ($res['unverifiable'] ?? false)) {
            return [RunLog::UNVERIFIABLE, 'replay_unverifiable'];
        }
        if (true !== ($res['ok'] ?? null)) {
            return [RunLog::FAILED, 'replay_'.preg_replace('/[^a-z_]/', '', (string) ($res['reason'] ?? 'failed'))];
        }
        $same = ($res['end'] ?? null) === $log->getEnd() && ($res['stage'] ?? null) === $log->getStage()
            && ($res['level'] ?? null) === $log->getLevel() && ($res['distance'] ?? null) === $log->getDistance();
        if (!$same) {
            return [RunLog::FAILED, 'replay_mismatch'];
        }
        $ms = (int) ($res['ms'] ?? -1);
        if ($ms < 0 || $ms > $log->getTimeMs() + self::CLOCK_EARLY_MS || $ms < $log->getTimeMs() - self::CLOCK_LATE_MS) {
            return [RunLog::FAILED, 'replay_clock'];
        }

        return [RunLog::REPLAYED, null];
    }

    private function pass(RunLog $log, array $res): void
    {
        $log->replayed(RunLog::REPLAYED);
        $p = $log->getPlayer();
        if ($this->enforced() && $this->scores->record($p, $log->getMode(), $log->getDay(), $log->getCreatedAt()->setTimezone(new \DateTimeZone('UTC'))->format('Y-m'), $log->getStage(), $log->getLevel(), $log->getDistance(), $log->getTimeMs(), $this->periods->now())) {
            $log->markImproved();
        }
        if (!$log->isImproved()) {
            $log->forgetReplay();
        }
        // The replay's raccoon is the one that counts (the ledger's should be the same).
        if ('normal' === $log->getMode() && $p->getKeptFrom() === $log->getId()) {
            $c = $res['close'] ?? null;
            $p->setKept('retreat' === $log->getEnd() && \is_array($c) ? ['l' => (int) $c['l'], 'st' => array_map('intval', (array) $c['st']), 'p' => (int) $c['p']] : null, $log->getId());
        }
    }

    // A failed run, and every run started from the raccoon it banked.
    private function fail(RunLog $log, string $status, ?string $reason): void
    {
        $log->replayed($status, $reason);
        $p = $log->getPlayer();
        if ($p->getKeptFrom() === $log->getId()) {
            $p->setKept(null);
        }
        foreach ($this->logs->findBy(['basedOn' => $log->getId(), 'replayStatus' => RunLog::PENDING]) as $child) {
            $this->fail($child, RunLog::FAILED, 'bad_start');
        }
    }

    /** Whether a board still waits on replays before its prize is paid. */
    public function holdsPrize(string $mode, string $period): bool
    {
        return $this->enforced() && $this->logs->pendingFor($mode, $period, $this->periods->now()->sub(new \DateInterval(self::PRIZE_WAIT)));
    }
}
