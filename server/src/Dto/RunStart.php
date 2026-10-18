<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class RunStart
{
    public function __construct(
        #[Assert\Choice(choices: ['normal', 'daily'])]
        public readonly string $mode = 'normal',
        #[Assert\Regex('/^\d{4}-\d{2}-\d{2}$/')]
        public readonly ?string $day = null,
        // the phone's banked raccoon {l, st, p}: taken once, if the server has none yet
        public readonly ?array $kept = null,
    ) {
    }
}
