<?php

namespace App\Service;

use App\Repository\PlayerRepository;

/**
 * NAME#1234: any number of players may share a name, each with their own 4-digit tag.
 * The (name, tag) unique index is the real guarantee; this just finds a free one.
 */
final class Tags
{
    public function __construct(private readonly PlayerRepository $players)
    {
    }

    public function free(string $name): ?int
    {
        for ($i = 0; $i < 40; ++$i) {
            $tag = random_int(1000, 9999);
            if (!$this->players->nameTaken($name, $tag)) {
                return $tag;
            }
        }

        // 9000 players already share this exact name.
        return null;
    }
}
