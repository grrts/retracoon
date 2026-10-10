<?php

namespace App\Service;

use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Sign in with Apple tokens. Apple requires apps that offer Sign in with Apple to revoke
 * the user's tokens when they delete their account, so at sign-in we trade the one-time
 * authorization code for a refresh token, and on deletion we revoke it.
 * Does nothing until APPLE_TEAM_ID, APPLE_KEY_ID and APPLE_PRIVATE_KEY are set.
 */
class AppleTokens
{
    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(APPLE_TEAM_ID)%')] private readonly string $teamId,
        #[Autowire('%env(APPLE_KEY_ID)%')] private readonly string $keyId,
        #[Autowire('%env(APPLE_PRIVATE_KEY)%')] private readonly string $privateKey,
        #[Autowire('%env(APPLE_AUDIENCES)%')] private readonly string $audiences,
    ) {
    }

    private function clientId(): string
    {
        return trim(explode(',', $this->audiences)[0]);
    }

    private function configured(): bool
    {
        return '' !== $this->teamId && '' !== $this->keyId && '' !== $this->privateKey && '' !== $this->clientId();
    }

    // The client secret Apple wants: a short-lived ES256 JWT signed with our key.
    private function secret(): string
    {
        $now = time();

        return JWT::encode([
            'iss' => $this->teamId,
            'iat' => $now,
            'exp' => $now + 300,
            'aud' => 'https://appleid.apple.com',
            'sub' => $this->clientId(),
        ], str_replace('\n', "\n", $this->privateKey), 'ES256', $this->keyId);
    }

    public function refreshToken(string $code): ?string
    {
        if (!$this->configured()) {
            return null;
        }
        try {
            $res = $this->http->request('POST', 'https://appleid.apple.com/auth/token', ['body' => [
                'client_id' => $this->clientId(),
                'client_secret' => $this->secret(),
                'code' => $code,
                'grant_type' => 'authorization_code',
            ]])->toArray();

            return isset($res['refresh_token']) ? (string) $res['refresh_token'] : null;
        } catch (\Throwable $e) {
            $this->logger->warning('Apple code exchange failed', ['error' => $e->getMessage()]);

            return null;
        }
    }

    public function revoke(string $refreshToken): bool
    {
        if (!$this->configured()) {
            return false;
        }
        try {
            $this->http->request('POST', 'https://appleid.apple.com/auth/revoke', ['body' => [
                'client_id' => $this->clientId(),
                'client_secret' => $this->secret(),
                'token' => $refreshToken,
                'token_type_hint' => 'refresh_token',
            ]])->getStatusCode();

            return true;
        } catch (\Throwable $e) {
            $this->logger->warning('Apple token revoke failed', ['error' => $e->getMessage()]);

            return false;
        }
    }
}
