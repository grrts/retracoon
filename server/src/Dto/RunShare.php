<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * A finished run the player shares: what its public page shows, and the card the
 * game drew (a 1200x630 PNG, base64).
 */
final class RunShare
{
    // Names come from the game's content; the pixel font only has these characters.
    public const NAME = '/^[A-Za-z0-9 .,\'!?&+:#\/()-]{1,48}$/';
    public const ID = '/^[a-z0-9_-]{1,40}$/';

    /**
     * @param list<array{slot?: mixed, id?: mixed, name?: mixed, rarity?: mixed, lvl?: mixed}> $gear
     */
    public function __construct(
        #[Assert\Choice(choices: ['normal', 'daily'])]
        public readonly string $mode,
        #[Assert\Choice(choices: ['death', 'retreat'])]
        public readonly string $reason,
        #[Assert\Range(min: 0, max: 100000)]
        public readonly int $stage,
        #[Assert\Range(min: 1, max: 10000)]
        public readonly int $area,
        #[Assert\Range(min: 1, max: 10000)]
        public readonly int $level,
        #[Assert\Regex(self::ID)]
        public readonly string $theme,
        #[Assert\Regex(self::NAME)]
        public readonly string $themeName,
        #[Assert\NotBlank]
        #[Assert\Length(max: 400000)]
        public readonly string $card,
        #[Assert\Regex('/^\d{4}-\d{2}-\d{2}$/')]
        public readonly ?string $day = null,
        #[Assert\Regex(self::NAME)]
        public readonly ?string $killer = null,
        #[Assert\Regex(self::ID)]
        public readonly ?string $killerId = null,
        #[Assert\Count(max: 7)]
        #[Assert\All(new Assert\Collection([
            'slot' => [new Assert\Choice(choices: ['head', 'face', 'body', 'back', 'paw', 'tail', 'aura'])],
            'id' => [new Assert\Type('string'), new Assert\Regex(self::ID)],
            'name' => [new Assert\Type('string'), new Assert\Regex(self::NAME)],
            'rarity' => [new Assert\Type('int'), new Assert\Range(min: 0, max: 9)],
            'lvl' => [new Assert\Type('int'), new Assert\Range(min: 1, max: 99)],
        ]))]
        public readonly array $gear = [],
    ) {
    }
}
