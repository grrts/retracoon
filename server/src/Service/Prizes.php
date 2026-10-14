<?php

namespace App\Service;

use App\Entity\Prize;
use App\Repository\DailyScoreRepository;
use App\Repository\SeasonScoreRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Lock\LockFactory;

/**
 * Pays the winners of closed boards: the best daily run of each day, and the best run
 * of each season. Runs whenever a board or a profile is read (and from the app:prizes
 * command, for a cron job), so nothing depends on a scheduler being set up. A lock and
 * a unique row per board and place make sure a board is paid once.
 */
final class Prizes
{
    public const DAILY_GEMS = 10;
    public const SEASON_GEMS = 300;

    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly DailyScoreRepository $daily,
        private readonly SeasonScoreRepository $seasons,
        private readonly Periods $periods,
        private readonly LockFactory $locks,
    ) {
    }

    /** @return int prizes paid */
    public function settle(): int
    {
        $lock = $this->locks->createLock('prizes', 30);
        if (!$lock->acquire()) {
            return 0;
        }
        try {
            $now = $this->periods->now();
            $paid = 0;
            foreach ($this->daily->unpaidDays($this->periods->firstOpenDay()) as $day) {
                if ($w = $this->daily->winner($day)) {
                    $w->getPlayer()->addGems(self::DAILY_GEMS);
                    $this->em->persist(new Prize(Prize::DAILY, $day, 1, $w->getPlayer(), self::DAILY_GEMS, $now));
                    ++$paid;
                }
            }
            foreach ($this->seasons->unpaidSeasons($this->periods->firstOpenSeason()) as $season) {
                if ($w = $this->seasons->winner($season)) {
                    $w->getPlayer()->addGems(self::SEASON_GEMS);
                    $this->em->persist(new Prize(Prize::SEASON, $season, 1, $w->getPlayer(), self::SEASON_GEMS, $now));
                    ++$paid;
                }
            }
            if ($paid) {
                $this->em->flush();
            }

            return $paid;
        } finally {
            $lock->release();
        }
    }
}
