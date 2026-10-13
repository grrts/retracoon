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
        // 'normal' runs count for the world board and the season; 'daily' runs only
        // for that day's daily board; 'best' is an all-time best made while signed out,
        // so it counts for the world board only.
        #[Assert\Choice(choices: ['normal', 'daily', 'best'])]
        public readonly string $mode = 'normal',
        #[Assert\Regex('/^\d{4}-\d{2}-\d{2}$/')]
        public readonly ?string $day = null,
        // how long the run took, for the daily board's tie-break
        #[Assert\Range(min: 0, max: 86400000)]
        public readonly int $timeMs = 0,
    ) {
    }
}
