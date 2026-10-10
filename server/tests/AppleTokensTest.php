<?php

namespace App\Tests;

use App\Service\AppleTokens;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use PHPUnit\Framework\TestCase;
use Psr\Log\NullLogger;
use Symfony\Component\HttpClient\MockHttpClient;
use Symfony\Component\HttpClient\Response\MockResponse;

final class AppleTokensTest extends TestCase
{
    public function testExchangesAndRevokesWithASignedClientSecret(): void
    {
        $key = openssl_pkey_new(['curve_name' => 'prime256v1', 'private_key_type' => OPENSSL_KEYTYPE_EC]);
        openssl_pkey_export($key, $pem);
        $public = openssl_pkey_get_details($key)['key'];
        $calls = [];
        $http = new MockHttpClient(function (string $method, string $url, array $options) use (&$calls, $public) {
            parse_str($options['body'], $body);
            $claims = JWT::decode($body['client_secret'], new Key($public, 'ES256'));
            self::assertSame('TEAM123', $claims->iss);
            self::assertSame('com.retracoon.game', $claims->sub);
            $calls[] = [$url, $body];

            return new MockResponse(str_ends_with($url, '/token') ? '{"refresh_token":"r-1"}' : '');
        });
        $apple = new AppleTokens($http, new NullLogger(), 'TEAM123', 'KEY1', $pem, 'com.retracoon.game,web.id');

        self::assertSame('r-1', $apple->refreshToken('code-1'));
        self::assertTrue($apple->revoke('r-1'));
        self::assertSame('code-1', $calls[0][1]['code']);
        self::assertSame('https://appleid.apple.com/auth/revoke', $calls[1][0]);
        self::assertSame('r-1', $calls[1][1]['token']);
    }

    public function testDoesNothingUntilConfigured(): void
    {
        $http = new MockHttpClient(fn () => throw new \LogicException('no calls expected'));
        $apple = new AppleTokens($http, new NullLogger(), '', '', '', 'com.retracoon.game');
        self::assertNull($apple->refreshToken('code'));
        self::assertFalse($apple->revoke('token'));
    }
}
