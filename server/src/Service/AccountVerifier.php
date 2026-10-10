<?php

namespace App\Service;

use Firebase\JWT\JWK;
use Firebase\JWT\JWT;
use Psr\Log\LoggerInterface;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Contracts\Cache\CacheInterface;
use Symfony\Contracts\Cache\ItemInterface;
use Symfony\Contracts\HttpClient\HttpClientInterface;

/**
 * Google and Apple: the game sends the ID token (a JWT) it got from signing in; we check
 * its signature against the provider's public keys, the issuer, the audience (our app's
 * client ids) and expiry. Steam: the game sends a Web API auth ticket, which Steam checks
 * for us (ISteamUserAuth/AuthenticateUserTicket).
 */
final class AccountVerifier implements IdentityVerifier
{
    private const JWKS = [
        'google' => 'https://www.googleapis.com/oauth2/v3/certs',
        'apple' => 'https://appleid.apple.com/auth/keys',
    ];
    private const ISSUERS = [
        'google' => ['accounts.google.com', 'https://accounts.google.com'],
        'apple' => ['https://appleid.apple.com'],
    ];
    public const STEAM_IDENTITY = 'retracoon';

    public function __construct(
        private readonly HttpClientInterface $http,
        private readonly CacheInterface $cache,
        private readonly LoggerInterface $logger,
        #[Autowire('%env(GOOGLE_CLIENT_IDS)%')] private readonly string $googleClientIds,
        #[Autowire('%env(APPLE_AUDIENCES)%')] private readonly string $appleAudiences,
        #[Autowire('%env(STEAM_WEB_API_KEY)%')] private readonly string $steamKey,
        #[Autowire('%env(STEAM_APP_ID)%')] private readonly string $steamAppId,
    ) {
    }

    public function verify(string $provider, string $credential): ?string
    {
        try {
            return match ($provider) {
                'google' => $this->jwt('google', $credential, $this->googleClientIds),
                'apple' => $this->jwt('apple', $credential, $this->appleAudiences),
                'steam' => $this->steam($credential),
                default => null,
            };
        } catch (\Throwable $e) {
            $this->logger->info('sign-in rejected', ['provider' => $provider, 'error' => $e->getMessage()]);

            return null;
        }
    }

    private function jwt(string $provider, string $token, string $audiences): ?string
    {
        $allowed = array_values(array_filter(array_map('trim', explode(',', $audiences))));
        if (!$allowed) {
            return null; // provider not configured on this server
        }
        $keys = $this->cache->get('jwks_'.$provider, function (ItemInterface $item) use ($provider) {
            $item->expiresAfter(3600);

            return $this->http->request('GET', self::JWKS[$provider])->toArray();
        });
        JWT::$leeway = 60;
        $claims = JWT::decode($token, JWK::parseKeySet($keys, 'RS256'));
        $aud = (array) ($claims->aud ?? []);
        if (!\in_array($claims->iss ?? '', self::ISSUERS[$provider], true) || !array_intersect($aud, $allowed)) {
            return null;
        }
        $sub = (string) ($claims->sub ?? '');

        return '' !== $sub ? $sub : null;
    }

    private function steam(string $ticket): ?string
    {
        if ('' === $this->steamKey || '' === $this->steamAppId || !preg_match('/^[0-9a-fA-F]{16,4096}$/', $ticket)) {
            return null;
        }
        $res = $this->http->request('GET', 'https://partner.steam-api.com/ISteamUserAuth/AuthenticateUserTicket/v1/', [
            'query' => ['key' => $this->steamKey, 'appid' => $this->steamAppId, 'ticket' => $ticket, 'identity' => self::STEAM_IDENTITY],
        ])->toArray(false);
        $p = $res['response']['params'] ?? null;
        if (!\is_array($p) || 'OK' !== ($p['result'] ?? null) || !empty($p['vacbanned']) || !empty($p['publisherbanned'])) {
            return null;
        }
        $id = (string) ($p['steamid'] ?? '');

        return preg_match('/^\d{17}$/', $id) ? $id : null;
    }
}
