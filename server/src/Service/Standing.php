<?php

namespace App\Service;

use App\Entity\Player;
use App\Repository\DailyScoreRepository;
use App\Repository\PlayerRepository;
use App\Repository\PrizeRepository;
use App\Repository\SeasonScoreRepository;

/**
 * Everything the signed-in player sees about themselves: profile, today's daily run,
 * this season, and any prizes won that the game hasn't shown yet.
 */
final class Standing
{
    public function __construct(
        private readonly PlayerRepository $players,
        private readonly DailyScoreRepository $daily,
        private readonly SeasonScoreRepository $seasons,
        private readonly PrizeRepository $prizes,
        private readonly Periods $periods,
    ) {
    }

    /** @return array<string, mixed> */
    public function me(Player $p): array
    {
        $d = $this->daily->forPlayer($p, $this->periods->today());
        $s = $this->seasons->forPlayer($p, $this->periods->season());

        return Present::me($p, $this->players->rankOf($p)) + [
            'daily' => $d ? Present::daily($d, $this->daily->rankOf($d)) : null,
            'season' => $s ? Present::season($s, $this->seasons->rankOf($s)) : null,
            'prizes' => array_map(Present::prize(...), $this->prizes->unseen($p)),
        ];
    }
}
