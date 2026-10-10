<?php

namespace App\Service;

/**
 * Checks a sign-in credential from the game with the account provider and returns that
 * account's stable user id, or null if the credential is not valid.
 */
interface IdentityVerifier
{
    public const PROVIDERS = ['google', 'apple', 'steam'];

    public function verify(string $provider, string $credential): ?string;
}
