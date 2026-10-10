<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class Spend
{
    public function __construct(
        #[Assert\Range(min: 1, max: 100000)]
        public readonly int $gems,
        #[Assert\Regex('/^[a-z0-9_-]{1,40}$/')]
        public readonly string $item,
    ) {
    }
}
