<?php

namespace App\Service;

use Doctrine\DBAL\Connection;

/**
 * Soft-launch numbers from the tracking events: installs, retention (day 1, 7 and 30),
 * daily players, runs and how far they get. Computed in PHP from plain queries so it
 * works the same on PostgreSQL and SQLite; fine for tens of thousands of players.
 */
final class Stats
{
    public function __construct(private readonly Connection $db, private readonly Periods $periods)
    {
    }

    /** @return array<string, mixed> */
    public function report(int $days): array
    {
        $today = new \DateTimeImmutable($this->periods->today());
        $from = $today->modify('-'.($days - 1).' days');
        $since = $from->modify('-30 days')->format('Y-m-d H:i:s');

        // First day each install was seen, all time.
        $first = [];
        foreach ($this->db->fetchAllAssociative("SELECT device, MIN(at) AS first FROM play_event WHERE name = 'app_open' GROUP BY device") as $r) {
            $first[$r['device']] = substr((string) $r['first'], 0, 10);
        }
        // Which days each install opened the game.
        $active = [];
        foreach ($this->db->fetchAllAssociative("SELECT device, at FROM play_event WHERE name = 'app_open' AND at >= ?", [$since]) as $r) {
            $active[substr((string) $r['at'], 0, 10)][$r['device']] = true;
        }
        $runs = $this->db->fetchAllAssociative("SELECT device, at, props FROM play_event WHERE name = 'run_end' AND at >= ?", [$from->format('Y-m-d H:i:s')]);
        $tutorial = (int) $this->db->fetchOne("SELECT COUNT(DISTINCT device) FROM play_event WHERE name = 'tutorial_done'");

        $cohorts = [];
        foreach ($first as $device => $day) {
            $cohorts[$day][] = $device;
        }
        $back = function (string $day, int $after) use ($cohorts, $active, $today): ?float {
            $devices = $cohorts[$day] ?? [];
            $then = (new \DateTimeImmutable($day))->modify("+$after days");
            if (!$devices || $then >= $today) {
                return null; // cohort empty or not old enough yet
            }
            $on = $active[$then->format('Y-m-d')] ?? [];
            $n = 0;
            foreach ($devices as $d) {
                $n += isset($on[$d]) ? 1 : 0;
            }

            return round($n / \count($devices), 3);
        };

        $byDay = [];
        foreach ($runs as $r) {
            $props = json_decode((string) $r['props'], true) ?: [];
            $byDay[substr((string) $r['at'], 0, 10)][] = $props;
        }

        $rows = [];
        for ($d = $from; $d <= $today; $d = $d->modify('+1 day')) {
            $day = $d->format('Y-m-d');
            $dayRuns = $byDay[$day] ?? [];
            $stages = array_map(fn ($p) => (int) ($p['stage'] ?? 0), $dayRuns);
            sort($stages);
            $rows[] = [
                'day' => $day,
                'installs' => \count($cohorts[$day] ?? []),
                'players' => \count($active[$day] ?? []),
                'runs' => \count($dayRuns),
                'dailyRuns' => \count(array_filter($dayRuns, fn ($p) => 'daily' === ($p['mode'] ?? null))),
                'medianStage' => $stages ? $stages[intdiv(\count($stages), 2)] : null,
                'leftArea1' => $dayRuns ? round(\count(array_filter($dayRuns, fn ($p) => (int) ($p['area'] ?? 1) > 1)) / \count($dayRuns), 3) : null,
                'd1' => $back($day, 1),
                'd7' => $back($day, 7),
                'd30' => $back($day, 30),
            ];
        }

        return [
            'installsAllTime' => \count($first),
            'tutorialDone' => \count($first) ? round($tutorial / \count($first), 3) : null,
            'days' => $rows,
        ];
    }
}
