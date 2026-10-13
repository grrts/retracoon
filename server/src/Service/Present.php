<?php

namespace App\Service;

use App\Entity\DailyScore;
use App\Entity\Player;
use App\Entity\Prize;
use App\Entity\SeasonScore;

/**
 * The JSON shape of players. Friend codes, gems and unlocks are private: only the owner sees them.
 */
final class Present
{
    /** @return array<string, mixed> */
    public static function row(Player $p, ?int $rank = null): array
    {
        return [
            'id' => $p->getId(),
            'name' => $p->getName(),
            'tag' => $p->getTag(),
            'skin' => $p->getSkin(),
            'bestStage' => $p->getBestStage(),
            'bestLevel' => $p->getBestLevel(),
            'bestDistance' => $p->getBestDistance(),
            'rank' => $rank,
        ];
    }

    /** @return array<string, mixed> */
    public static function me(Player $p, ?int $rank): array
    {
        return self::row($p, $rank) + [
            'friendCode' => $p->getFriendCode(),
            'provider' => $p->getProvider(),
            'gems' => $p->getGems(),
            'noAds' => $p->hasNoAds(),
            'unlocks' => $p->getUnlocks(),
        ];
    }

    /**
     * @param Player[] $players already ranked
     *
     * @return list<array<string, mixed>>
     */
    public static function board(array $players, int $offset = 0): array
    {
        $out = [];
        foreach (array_values($players) as $i => $p) {
            $out[] = self::row($p, $p->getBestStage() > 0 ? $offset + $i + 1 : null);
        }

        return $out;
    }

    /** @return array<string, mixed> a daily board row: the player plus that day's run */
    public static function daily(DailyScore $d, ?int $rank): array
    {
        return array_merge(self::row($d->getPlayer()), ['rank' => $rank, 'stage' => $d->getStage(), 'level' => $d->getLevel(), 'distance' => $d->getDistance(), 'timeMs' => $d->getTimeMs()]);
    }

    /** @return array<string, mixed> */
    public static function season(SeasonScore $s, ?int $rank): array
    {
        return array_merge(self::row($s->getPlayer()), ['rank' => $rank, 'stage' => $s->getStage(), 'level' => $s->getLevel(), 'distance' => $s->getDistance()]);
    }

    /**
     * @param DailyScore[]|SeasonScore[] $scores already ranked
     *
     * @return list<array<string, mixed>>
     */
    public static function scores(array $scores, int $offset = 0): array
    {
        $out = [];
        foreach (array_values($scores) as $i => $x) {
            $out[] = $x instanceof DailyScore ? self::daily($x, $offset + $i + 1) : self::season($x, $offset + $i + 1);
        }

        return $out;
    }

    /** @return array<string, mixed> */
    public static function prize(Prize $p): array
    {
        return ['id' => $p->getId(), 'kind' => $p->getKind(), 'period' => $p->getPeriod(), 'place' => $p->getPlace(), 'gems' => $p->getGems()];
    }
}
