<?php

namespace App\Service;

/**
 * Display names: 3-16 characters of A-Z, 0-9 and single spaces (all the game's pixel font can draw).
 */
final class Names
{
    private const ADJ = ['SNEAKY', 'GRUMPY', 'SPEEDY', 'LUCKY', 'TINY', 'MIGHTY', 'SHADY', 'FUZZY', 'SLY', 'BRAVE', 'MESSY', 'CHUNKY'];
    private const NOUN = ['BANDIT', 'COON', 'PAWS', 'RASCAL', 'TRASHER', 'MASK', 'SNOUT', 'TAIL'];

    /** Returns the cleaned name, or null if too little is left of it. */
    public static function clean(?string $name): ?string
    {
        $n = strtoupper((string) $name);
        $n = preg_replace('/[^A-Z0-9 ]/', '', $n) ?? '';
        $n = trim(preg_replace('/\s+/', ' ', $n) ?? '');
        $n = trim(substr($n, 0, 16));

        return \strlen($n) >= 3 ? $n : null;
    }

    public static function random(): string
    {
        return substr(self::ADJ[array_rand(self::ADJ)].' '.self::NOUN[array_rand(self::NOUN)].' '.random_int(10, 99), 0, 16);
    }

    /** Skin ids are lowercase words with underscores or dashes. */
    public static function skin(?string $skin): ?string
    {
        return null !== $skin && preg_match('/^[a-z0-9_-]{1,40}$/', $skin) ? $skin : null;
    }
}
