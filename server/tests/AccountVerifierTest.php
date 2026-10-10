<?php

namespace App\Tests;

use App\Service\AccountVerifier;
use Firebase\JWT\JWT;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\Cache\Adapter\ArrayAdapter;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class AccountVerifierTest extends TestCase
{
    private string $pem = '';
    private string $jwks;

    protected function setUp(): void
    {
        $key = openssl_pkey_new(['private_key_bits' => 2048, 'private_key_type' => OPENSSL_KEYTYPE_RSA]);
        openssl_pkey_export($key, $this->pem);
        $d = openssl_pkey_get_details($key)['rsa'];
        $b64 = fn (string $s) => rtrim(strtr(base64_encode($s), '+/', '-_'), '=');
        $this->jwks = json_encode(['keys' => [['kty' => 'RSA', 'kid' => 'k1', 'alg' => 'RS256', 'use' => 'sig', 'n' => $b64($d['n']), 'e' => $b64($d['e'])]]]);
    }

    private function verifier(?callable $http = null): AccountVerifier
    {
        $client = new MockHttpClient($http ?? fn () => new MockResponse($this->jwks));

        return new AccountVerifier($client, new ArrayAdapter(), new NullLogger(), 'web-client,ios-client', 'com.retracoon.game', 'steam-key', '480');
    }

    /** @param array<string, mixed> $claims */
    private function token(array $claims): string
    {
        return JWT::encode($claims + ['iat' => time(), 'exp' => time() + 600], $this->pem, 'RS256', 'k1');
    }

    public function testGoogleAndAppleTokens(): void
    {
        $v = $this->verifier();
        self::assertSame('g-123', $v->verify('google', $this->token(['iss' => 'https://accounts.google.com', 'aud' => 'ios-client', 'sub' => 'g-123'])));
        self::assertSame('a-9', $v->verify('apple', $this->token(['iss' => 'https://appleid.apple.com', 'aud' => 'com.retracoon.game', 'sub' => 'a-9'])));
        // Wrong audience, wrong issuer, expired, or garbage: rejected.
        self::assertNull($v->verify('google', $this->token(['iss' => 'https://accounts.google.com', 'aud' => 'someone-else', 'sub' => 'x'])));
        self::assertNull($v->verify('google', $this->token(['iss' => 'https://appleid.apple.com', 'aud' => 'web-client', 'sub' => 'x'])));
        self::assertNull($v->verify('google', JWT::encode(['iss' => 'accounts.google.com', 'aud' => 'web-client', 'sub' => 'x', 'exp' => time() - 3600], $this->pem, 'RS256', 'k1')));
        self::assertNull($v->verify('google', 'not.a.jwt'));
    }

    public function testSteamTicket(): void
    {
        $seen = null;
        $v = $this->verifier(function (string $m, string $url) use (&$seen) {
            $seen = $url;

            return new MockResponse(json_encode(['response' => ['params' => ['result' => 'OK', 'steamid' => '76561198000000001', 'vacbanned' => false, 'publisherbanned' => false]]]));
        });
        self::assertSame('76561198000000001', $v->verify('steam', 'abcdef0123456789'));
        self::assertStringContainsString('identity=retracoon', (string) $seen);
        self::assertNull($v->verify('steam', 'not hex!'));

        $banned = $this->verifier(fn () => new MockResponse(json_encode(['response' => ['params' => ['result' => 'OK', 'steamid' => '76561198000000001', 'vacbanned' => false, 'publisherbanned' => true]]])));
        self::assertNull($banned->verify('steam', 'abcdef0123456789'));
        $error = $this->verifier(fn () => new MockResponse(json_encode(['response' => ['error' => ['errorcode' => 101]]])));
        self::assertNull($error->verify('steam', 'abcdef0123456789'));
    }
}
