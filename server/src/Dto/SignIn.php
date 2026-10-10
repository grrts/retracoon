<?php

namespace App\Dto;

use App\Service\IdentityVerifier;
use Symfony\Component\Validator\Constraints as Assert;

final class SignIn
{
    public function __construct(
        #[Assert\Choice(choices: IdentityVerifier::PROVIDERS)]
        public readonly string $provider,
        #[Assert\NotBlank]
        #[Assert\Length(max: 8192)]
        public readonly string $credential,
        // Apple only: the authorization code, traded for a token we revoke on deletion.
        #[Assert\Length(max: 1024)]
        public readonly ?string $code = null,
        // Only used when this account plays for the first time.
        #[Assert\Length(max: 40)]
        public readonly ?string $name = null,
        #[Assert\Regex('/^[a-z0-9_-]{1,40}$/')]
        public readonly ?string $skin = null,
    ) {
    }
}
