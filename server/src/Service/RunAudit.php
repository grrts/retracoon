<?php

namespace App\Service;

use App\Dto\RunResult;

/**
 * Checks that a finished run adds up before it counts on a board. The game sends a
 * ledger with each run (src/game/ledger.ts): the raccoon it started with, a short
 * entry for each fight and each gain (XP, stat points, meters), and the raccoon it
 * ended with. Here we add the entries up and check they land exactly on the score that
 * was sent, and that no fight went faster than the game can play.
 *
 * This catches an edited score, and a ledger made up without care. It can't prove the
 * fights went the way the ledger says: that takes replaying the run, see
 * docs/ONLINE.md#fair-scores.
 *
 * Verdicts:
 *   ok        the ledger adds up
 *   unlogged  no ledger (older game versions, and bests made while signed out)
 *   suspect   possible but unusual; counts, and shows up in `app:runs`
 *   rejected  impossible; doesn't count on any board
 */
final class RunAudit
{
    public const OK = 'ok';
    public const UNLOGGED = 'unlogged';
    public const SUSPECT = 'suspect';
    public const REJECTED = 'rejected';

    public const LEDGER_VERSION = 2;
    // Before every fight the raccoon walks for at least 1.2 s, and a fight takes at
    // least a moment per turn. Kept well under what the game actually takes.
    public const MIN_FIGHT_MS = 1000;
    public const MIN_TURN_MS = 200;
    // The daily run is always a fresh level 1 raccoon.
    public const FRESH = ['l' => 1, 'st' => [3, 2, 2, 2, 3], 'p' => 0];
    // A best this many times the player's previous best (and past MIN_JUMP_STAGE) is
    // flagged for a look.
    public const JUMP = 3;
    public const MIN_JUMP_STAGE = 30;
    // The game writes at most 2000 entries (src/game/ledger.ts).
    public const MAX_ENTRIES = 2000;

    /**
     * @return array{0: string, 1: list<string>} verdict and reasons
     */
    public function check(RunResult $run, int $previousBest = 0): array
    {
        $bad = [];
        $odd = [];
        if ($run->timeMs > 0 && $run->timeMs < $run->stage * self::MIN_FIGHT_MS) {
            $bad[] = 'too_fast';
        }
        if ('daily' === $run->mode && $run->level > self::maxDailyLevel($run->stage)) {
            $bad[] = 'level_too_high';
        }
        if ('daily' !== $run->mode && $run->stage >= self::MIN_JUMP_STAGE && $previousBest > 0 && $run->stage > $previousBest * self::JUMP) {
            $odd[] = 'big_jump';
        }
        if (null !== $run->log) {
            $bad = [...$bad, ...$this->checkLedger($run, $run->log)];
        }
        $bad = array_values(array_unique($bad));
        if ($bad) {
            return [self::REJECTED, $bad];
        }
        if ($odd) {
            return [self::SUSPECT, $odd];
        }

        return [null === $run->log ? self::UNLOGGED : self::OK, []];
    }

    /** XP from one level to the next, as xpToLevel in src/game/run.ts. */
    public static function xpToLevel(int $level): int
    {
        return 10 + ($level - 1) * 7;
    }

    // Bots in `npm run sim` reach about one level per fight; this is double that.
    public static function maxDailyLevel(int $stage): int
    {
        return 5 + 2 * $stage;
    }

    /**
     * @param array<mixed> $book
     *
     * @return list<string> what doesn't add up
     */
    private function checkLedger(RunResult $run, array $book): array
    {
        $entries = $book['e'] ?? null;
        if (self::LEDGER_VERSION !== ($book['v'] ?? null) || !\is_array($entries) || !array_is_list($entries) || \count($entries) > self::MAX_ENTRIES
            || !self::raccoon($book['open'] ?? null) || !self::raccoon($book['close'] ?? null)) {
            return ['log_malformed'];
        }
        foreach ($entries as $e) {
            if (!self::entry($e)) {
                return ['log_malformed'];
            }
        }
        $mode = 'best' === $run->mode ? 'normal' : $run->mode;
        if (($book['mode'] ?? null) !== $mode || ('daily' === $mode && ($book['day'] ?? null) !== $run->day)) {
            return ['log_wrong_run'];
        }
        $open = $book['open'];
        $close = $book['close'];
        if ('daily' === $mode && $open !== self::FRESH) {
            return ['daily_not_fresh'];
        }

        $bad = [];
        // Walk the ledger the way the game played it: levels come from XP exactly as
        // gainXp hands them out, and every level gives 3 stat points.
        $level = $open['l'];
        $xp = 0;
        $points = 0; // stat points gained along the way, levels included
        $meters = 0;
        $won = 0;
        $dead = false;
        $lastEnd = 0;
        $lastTime = 0;
        foreach ($entries as $e) {
            switch ($e[0]) {
                case 'f':
                    [, $t0, $t1, $w, $turns, $m] = $e;
                    if ($dead) {
                        $bad[] = 'fought_after_death';
                    }
                    if ($t0 < $lastEnd || $t1 < $t0) {
                        $bad[] = 'time_order';
                    }
                    if (($won > 0 && $t0 - $lastEnd < self::MIN_FIGHT_MS) || $t1 - $t0 < $turns * self::MIN_TURN_MS) {
                        $bad[] = 'too_fast';
                    }
                    if ($turns < 1) {
                        $bad[] = 'no_turns';
                    }
                    $won += $w;
                    $dead = 0 === $w;
                    $meters += $m;
                    $lastEnd = $t1;
                    $lastTime = $t1;
                    break;
                case 'x':
                    $xp += $e[1];
                    while ($xp >= self::xpToLevel($level)) {
                        $xp -= self::xpToLevel($level);
                        ++$level;
                        $points += 3;
                    }
                    break;
                case 'p':
                case 's':
                    $points += $e[1];
                    break;
                case 'd':
                    $meters += $e[1];
                    break;
            }
        }
        if ($won !== $run->stage) {
            $bad[] = 'fight_count';
        }
        if ($level !== $close['l'] || $level !== $run->level) {
            $bad[] = 'level_mismatch';
        }
        if (array_sum($close['st']) + $close['p'] !== array_sum($open['st']) + $open['p'] + $points) {
            $bad[] = 'stats_mismatch';
        }
        // The game never sends a negative distance.
        if (max(0, $meters) !== $run->distance) {
            $bad[] = 'distance_mismatch';
        }
        if ('best' !== $run->mode && $run->timeMs < $lastTime) {
            $bad[] = 'time_mismatch';
        }
        if ($level - $open['l'] > self::maxDailyLevel($run->stage)) {
            $bad[] = 'level_gain_too_high';
        }

        return array_values(array_unique($bad));
    }

    private static function raccoon(mixed $r): bool
    {
        if (!\is_array($r) || !self::int($r['l'] ?? null, 1) || !self::int($r['p'] ?? null) || !\is_array($r['st'] ?? null) || !array_is_list($r['st']) || 5 !== \count($r['st'])) {
            return false;
        }
        foreach ($r['st'] as $v) {
            if (!self::int($v)) {
                return false;
            }
        }

        return true;
    }

    private static function entry(mixed $e): bool
    {
        if (!\is_array($e) || !array_is_list($e)) {
            return false;
        }

        return match ($e[0] ?? null) {
            // meters can go back: some road stops cost distance
            'f' => 6 === \count($e) && self::int($e[1]) && self::int($e[2]) && \in_array($e[3], [0, 1], true) && self::int($e[4]) && \is_int($e[5]),
            'x', 'p' => 2 === \count($e) && self::int($e[1]),
            's', 'd' => 2 === \count($e) && \is_int($e[1]),
            default => false,
        };
    }

    private static function int(mixed $v, int $min = 0): bool
    {
        return \is_int($v) && $v >= $min;
    }
}
