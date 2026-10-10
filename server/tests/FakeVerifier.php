<?php

namespace App\Tests;

use App\Service\IdentityVerifier;

/**
 * Tests sign in with credentials like "ok:alice": the part after "ok:" is the account id.
 */
final class FakeVerifier implements IdentityVerifier
{
    public function verify(string $provider, string $credential): ?string
    {
        return str_starts_with($credential, 'ok:') ? substr($credential, 3) : null;
    }
}
