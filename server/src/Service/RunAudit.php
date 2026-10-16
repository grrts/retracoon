<?php

namespace App\Service;

use App\Dto\RunResult;

/**
 * Checks that a finished run adds up before it counts on a board. The game sends a
 * logbook with each run (src/game/logbook.ts): the raccoon it started with, then one
 * line per fight with the raccoon going in and what came out. Here we check that the
 * logbook hangs together and matches the score, and that no part of it went faster
 * than the game can play.
 *
 * This catches a sent number that was edited, and a logbook that was made up without
 * care. It can't prove the fights went the way the logbook says: that takes replaying
 * the run, see docs/ONLINE.md#fair-scores.
 *
 * Verdicts:
 *   ok        the logbook checks out
 *   unlogged  no logbook (older game versions, and bests made while signed out)
 *   suspect   possible but unusual; counts, and shows up in `app:runs`
 *   rejected  impossible; doesn't count on any board
 */
final class RunAudit
{
    public const OK = 'ok';
    public const UNLOGGED = 'unlogged';
    public const SUSPECT = 'suspect';
    public const REJECTED = 'rejected';

    // Before every fight the raccoon walks for at least 1.2 s, and a fight takes at
    // least a moment per turn. Kept well under what the game actually takes.
    public const MIN_FIGHT_MS = 1000;
    public const MIN_TURN_MS = 200;
    // A raccoon going in can't have more stat points than its levels gave (3 each) plus
    // the few that road stops hand out (TRAIN, events). Generous on purpose.
    public const STAT_SLACK_PER_FIGHT = 3;
    // The daily run is always a fresh level 1 raccoon. Bots in `npm run sim` reach
    // about one level per fight; this is double that.
    public const DAILY_START = ['l' => 1, 'st' => [3, 2, 2, 2, 3], 'p' => 0];
    // A best this many times the player's previous best (and past MIN_JUMP_STAGE) is
    // flagged for a look.
    public const JUMP = 3;
    public const MIN_JUMP_STAGE = 30;
    // The game logs at most 500 fights (src/game/logbook.ts).
    public const MAX_FIGHTS = 500;

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
            $bad = [...$bad, ...$this->checkLog($run, $run->log)];
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

    public static function maxDailyLevel(int $stage): int
    {
        return 5 + 2 * $stage;
    }

    /**
     * @param array<mixed> $log
     *
     * @return list<string> what doesn't add up
     */
    private function checkLog(RunResult $run, array $log): array
    {
        if (1 !== ($log['v'] ?? null) || !\is_array($log['fights'] ?? null) || !array_is_list($log['fights']) || \count($log['fights']) > self::MAX_FIGHTS || !self::raccoon($log['start'] ?? null)) {
            return ['log_malformed'];
        }
        $mode = 'best' === $run->mode ? 'normal' : $run->mode;
        if (($log['mode'] ?? null) !== $mode || ('daily' === $mode && ($log['day'] ?? null) !== $run->day)) {
            return ['log_wrong_run'];
        }
        $start = $log['start'];
        if ('daily' === $mode && ($start['l'] !== 1 || $start['st'] !== self::DAILY_START['st'] || 0 !== $start['p'])) {
            return ['daily_not_fresh'];
        }
        $fights = $log['fights'];
        foreach ($fights as $f) {
            if (!self::fight($f)) {
                return ['log_malformed'];
            }
        }

        $bad = [];
        $n = \count($fights);
        $last = $fights[$n - 1] ?? null;
        // Every fight but the last was won; the last was won (then a retreat) or lost.
        $died = null !== $last && 0 === $last['w'];
        if ($n !== $run->stage + ($died ? 1 : 0)) {
            $bad[] = 'fight_count';
        }
        $prev = ['l' => $start['l'], 'st' => $start['st'], 'p' => $start['p'], 'd' => 0, 't2' => 0, 'w' => 1];
        foreach ($fights as $i => $f) {
            if ($f['s'] !== $i) {
                $bad[] = 'fight_order';
            }
            if (0 === $prev['w']) {
                $bad[] = 'fought_after_death';
            }
            if ($f['l'] < $prev['l']) {
                $bad[] = 'level_dropped';
            }
            // Stat points only come from levels, plus a few from road stops.
            $points = array_sum($f['st']) + $f['p'];
            $before = array_sum($prev['st']) + $prev['p'];
            if ($points - $before > 3 * ($f['l'] - $prev['l']) + self::STAT_SLACK_PER_FIGHT) {
                $bad[] = 'stats_jump';
            }
            if ($f['h'] <= 0) {
                $bad[] = 'fought_without_hp';
            }
            if (1 === $f['w'] ? $f['h2'] <= 0 : $f['h2'] > 0) {
                $bad[] = 'hp_vs_outcome';
            }
            if ($f['d'] < $prev['d']) {
                $bad[] = 'distance_dropped';
            }
            if ($f['n'] < 1) {
                $bad[] = 'no_turns';
            }
            if ($f['t'] - $prev['t2'] < self::MIN_FIGHT_MS * ($i > 0 ? 1 : 0) || $f['t2'] - $f['t'] < $f['n'] * self::MIN_TURN_MS) {
                $bad[] = 'too_fast';
            }
            $prev = $f;
        }
        $finalLevel = $last['l'] ?? $start['l'];
        if ($run->level < $finalLevel) {
            $bad[] = 'level_mismatch';
        }
        if ('daily' === $mode && $run->level > self::maxDailyLevel($run->stage)) {
            $bad[] = 'level_too_high';
        }
        if ($run->level - $start['l'] > self::maxDailyLevel($run->stage)) {
            $bad[] = 'level_gain_too_high';
        }
        if (null !== $last && $run->distance < $last['d']) {
            $bad[] = 'distance_mismatch';
        }
        if (null !== $last && 'best' !== $run->mode && $run->timeMs < $last['t2']) {
            $bad[] = 'time_mismatch';
        }

        return array_values(array_unique($bad));
    }

    private static function raccoon(mixed $r): bool
    {
        return \is_array($r) && self::int($r['l'] ?? null, 1) && self::int($r['p'] ?? null) && self::stats($r['st'] ?? null);
    }

    private static function stats(mixed $st): bool
    {
        if (!\is_array($st) || !array_is_list($st) || 5 !== \count($st)) {
            return false;
        }
        foreach ($st as $v) {
            if (!self::int($v)) {
                return false;
            }
        }

        return true;
    }

    private static function fight(mixed $f): bool
    {
        if (!\is_array($f) || !self::raccoon($f) || !\in_array($f['w'] ?? null, [0, 1], true)) {
            return false;
        }
        foreach (['s', 'h', 'm', 'd', 't', 'n', 't2'] as $k) {
            if (!self::int($f[$k] ?? null, $k === 'h' ? \PHP_INT_MIN : 0)) {
                return false;
            }
        }

        return \is_int($f['h2'] ?? null);
    }

    private static function int(mixed $v, int $min = 0): bool
    {
        return \is_int($v) && $v >= $min;
    }
}
