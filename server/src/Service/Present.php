<?php

namespace App\Service;

use App\Entity\Player;

/**
 * The JSON shape of players. Friend codes are private: only the owner sees theirs.
 */
final class Present
{
    /** @return array<string, mixed> */
    public static function row(Player $p, ?int $rank = null): array
    {
        return [
            'id' => $p->getId(),
            'name' => $p->getName(),
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
        return self::row($p, $rank) + ['friendCode' => $p->getFriendCode()];
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
}
