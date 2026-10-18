<?php

namespace App\Service;

use App\Entity\DailyScore;
use App\Entity\Player;
use App\Entity\SeasonScore;
use App\Repository\DailyScoreRepository;
use App\Repository\SeasonScoreRepository;
use Doctrine\ORM\EntityManagerInterface;

/**
 * Puts a finished run on its boards. Bests only go up, so an old or worse result is
 * harmless. A normal run counts for the world board and its season, a daily run for
 * its day, and 'best' (an all-time best made while signed out) for the world board.
 */
final class Scores
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly DailyScoreRepository $daily,
        private readonly SeasonScoreRepository $seasons,
    ) {
    }

    /** @return bool whether a best went up */
    public function record(Player $p, string $mode, ?string $day, string $season, int $stage, int $level, int $distance, int $timeMs, \DateTimeImmutable $now): bool
    {
        if ('daily' === $mode) {
            $score = $this->daily->forPlayer($p, (string) $day);
            if (!$score) {
                $score = new DailyScore($p, (string) $day);
                $this->em->persist($score);
            }

            return $score->record($stage, $level, $distance, $timeMs, $now);
        }
        $improved = $p->recordRun($stage, $level, $distance);
        if ('best' === $mode) {
            return $improved;
        }
        $score = $this->seasons->forPlayer($p, $season);
        if (!$score) {
            $score = new SeasonScore($p, $season);
            $this->em->persist($score);
        }

        return $score->record($stage, $level, $distance, $now) || $improved;
    }
}
