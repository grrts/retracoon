<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

final class FriendCode
{
    public function __construct(
        #[Assert\NotBlank]
        #[Assert\Length(max: 12)]
        public readonly string $code = '',
    ) {
    }
}
