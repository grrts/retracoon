<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class RunResult
{
    public function __construct(
        #[Assert\Range(min: 1, max: 100000)]
        public readonly int $stage,
        #[Assert\Range(min: 1, max: 10000)]
        public readonly int $level,
        #[Assert\Range(min: 0, max: 1000000000)]
        public readonly int $distance = 0,
        #[Assert\Regex('/^[a-z0-9_-]{1,40}$/')]
        public readonly ?string $skin = null,
    ) {
    }
}
