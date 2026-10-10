<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class ProfileInput
{
    public function __construct(
        #[Assert\Length(max: 40)]
        public readonly ?string $name = null,
        #[Assert\Regex('/^[a-z0-9_-]{1,40}$/')]
        public readonly ?string $skin = null,
    ) {
    }
}
