<?php

namespace App\Service;

/**
 * What each store product grants. Mirrors PRODUCTS in the game (src/platform/config.ts).
 */
final class Products
{
    private const ALL = [
        'retracoon.noads' => ['gems' => 0, 'noAds' => true],
        'retracoon.starter' => ['gems' => 300, 'noAds' => true],
        'retracoon.gems80' => ['gems' => 80, 'noAds' => false],
        'retracoon.gems500' => ['gems' => 500, 'noAds' => false],
        'retracoon.gems1200' => ['gems' => 1200, 'noAds' => false],
        'retracoon.gems2600' => ['gems' => 2600, 'noAds' => false],
    ];

    /** @return array{gems: int, noAds: bool}|null */
    public static function get(string $id): ?array
    {
        return self::ALL[$id] ?? null;
    }
}
