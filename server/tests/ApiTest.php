<?php

namespace App\Tests;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class ApiTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.global_clearer')->clearPool('cache.rate_limiter');
    }

    /** @return array<string, mixed> */
    private function call(string $method, string $uri, ?array $body = null, ?string $token = null, int $expect = 200): array
    {
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
        if (null !== $token) {
            $headers['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
        }
        $this->client->request($method, $uri, [], [], $headers, null === $body ? null : json_encode($body));
        $res = $this->client->getResponse();
        self::assertSame($expect, $res->getStatusCode(), (string) $res->getContent());

        return json_decode((string) $res->getContent() ?: '[]', true);
    }

    private int $accounts = 0;

    /** @return array{0: string, 1: array<string, mixed>} token and player */
    private function register(?string $name = null, ?string $account = null, string $provider = 'google', int $expect = 201): array
    {
        $body = ['provider' => $provider, 'credential' => 'ok:'.($account ?? 'acct'.++$this->accounts)];
        if (null !== $name) {
            $body['name'] = $name;
        }
        $r = $this->call('POST', '/api/auth', $body, expect: $expect);

        return [$r['token'], $r['player']];
    }

    public function testSignInIsRequiredAndChecked(): void
    {
        $this->call('POST', '/api/players', ['name' => 'NOPE'], expect: 404);
        $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'forged'], expect: 401);
        $this->call('POST', '/api/auth', ['provider' => 'myspace', 'credential' => 'ok:x'], expect: 422);
    }

    public function testSameAccountGetsSamePlayerOnEveryDevice(): void
    {
        [$phone, $p1] = $this->register('LEROY', 'g-1');
        [$pc, $p2] = $this->register('SOMEONE ELSE', 'g-1', expect: 200);
        self::assertSame($p1['id'], $p2['id']);
        self::assertSame('LEROY', $p2['name']);
        self::assertNotSame($phone, $pc);
        // Both devices stay signed in.
        $this->call('GET', '/api/me', token: $phone);
        $this->call('GET', '/api/me', token: $pc);
        // The same id at another provider is another account.
        [, $p3] = $this->register(null, 'g-1', 'steam');
        self::assertNotSame($p1['id'], $p3['id']);
        self::assertSame('steam', $p3['provider']);
    }

    public function testNameTagsNeverCollide(): void
    {
        $tags = [];
        for ($i = 0; $i < 15; ++$i) {
            [, $p] = $this->register('BANDIT');
            self::assertSame('BANDIT', $p['name']);
            self::assertGreaterThanOrEqual(1000, $p['tag']);
            self::assertLessThanOrEqual(9999, $p['tag']);
            $tags[] = $p['tag'];
        }
        self::assertCount(15, array_unique($tags));
        // Renaming to a taken name gets its own tag too.
        [$t] = $this->register('OTHER');
        $renamed = $this->call('PATCH', '/api/me', ['name' => 'bandit'], $t)['player'];
        self::assertNotContains($renamed['tag'], $tags);
    }

    public function testRegisterCleansNameAndKeepsFriendCodePrivate(): void
    {
        [$token, $me] = $this->register('le-roy  the coon!');
        self::assertSame('LEROY THE COON', $me['name']);
        self::assertMatchesRegularExpression('/^[A-Z2-9]{6}$/', $me['friendCode']);

        [, $random] = $this->register();
        self::assertGreaterThanOrEqual(3, \strlen($random['name']));

        $public = $this->call('GET', '/api/players/'.$me['id']);
        self::assertArrayNotHasKey('friendCode', $public['player']);
        self::assertSame($me['friendCode'], $this->call('GET', '/api/me', token: $token)['player']['friendCode']);
    }

    public function testNeedsAValidToken(): void
    {
        $this->call('GET', '/api/me', expect: 401);
        $this->call('GET', '/api/me', token: 'not-a-token', expect: 401);
        $this->call('POST', '/api/me/runs', ['stage' => 3, 'level' => 2], expect: 401);
    }

    public function testBestsOnlyGoUp(): void
    {
        [$token] = $this->register('TESTER');
        $r = $this->call('POST', '/api/me/runs', ['stage' => 10, 'level' => 7, 'distance' => 900], $token);
        self::assertTrue($r['improved']);
        $r = $this->call('POST', '/api/me/runs', ['stage' => 4, 'level' => 3], $token);
        self::assertFalse($r['improved']);
        self::assertSame(10, $r['player']['bestStage']);
        self::assertSame(7, $r['player']['bestLevel']);
        self::assertSame(900, $r['player']['bestDistance']);
        $this->call('POST', '/api/me/runs', ['stage' => -1, 'level' => 3], $token, 422);
        $this->call('POST', '/api/me/runs', ['stage' => 999999, 'level' => 3], $token, 422);
    }

    public function testLeaderboardOrderAndPaging(): void
    {
        foreach ([['A1', 5, 100], ['B2', 9, 50], ['C3', 9, 80], ['D4', 0, 0]] as [$name, $stage, $dist]) {
            [$t] = $this->register($name.'XX');
            if ($stage > 0) {
                $this->call('POST', '/api/me/runs', ['stage' => $stage, 'level' => 1, 'distance' => $dist], $t);
            }
        }
        $board = $this->call('GET', '/api/leaderboard');
        self::assertSame(3, $board['total']);
        self::assertSame(['C3XX', 'B2XX', 'A1XX'], array_column($board['players'], 'name'));
        self::assertSame([1, 2, 3], array_column($board['players'], 'rank'));

        $page = $this->call('GET', '/api/leaderboard?limit=1&offset=1');
        self::assertSame('B2XX', $page['players'][0]['name']);
        self::assertSame(2, $page['players'][0]['rank']);
    }

    public function testFriends(): void
    {
        [$a, $pa] = $this->register('ALICE');
        [$b, $pb] = $this->register('BOB');
        [, $pc] = $this->register('CAROL');

        $this->call('POST', '/api/me/friends', ['code' => 'ZZZZZZ'], $a, 404);
        $this->call('POST', '/api/me/friends', ['code' => $pa['friendCode']], $a, 422);
        $added = $this->call('POST', '/api/me/friends', ['code' => strtolower($pb['friendCode'])], $a, 201);
        self::assertSame('BOB', $added['friend']['name']);
        $this->call('POST', '/api/me/friends', ['code' => $pb['friendCode']], $a, 409);

        $this->call('POST', '/api/me/runs', ['stage' => 8, 'level' => 5], $b);
        // Both sides see each other, and strangers are not on the list.
        $names = fn (string $t) => array_column($this->call('GET', '/api/me/friends', token: $t)['players'], 'name');
        self::assertSame(['BOB', 'ALICE'], $names($a));
        self::assertSame(['BOB', 'ALICE'], $names($b));
        self::assertNotContains($pc['name'], $names($a));

        $this->client->request('DELETE', '/api/me/friends/'.$pb['id'], [], [], ['HTTP_AUTHORIZATION' => 'Bearer '.$a]);
        self::assertResponseStatusCodeSame(204);
        self::assertSame(['ALICE'], $names($a));
        self::assertSame(['BOB'], $names($b));
    }

    public function testDeleteRemovesPlayerAndFriendships(): void
    {
        [$a, $pa] = $this->register('ALICE');
        [$b, $pb] = $this->register('BOB');
        $this->call('POST', '/api/me/friends', ['code' => $pb['friendCode']], $a, 201);
        $this->client->request('DELETE', '/api/me', [], [], ['HTTP_AUTHORIZATION' => 'Bearer '.$b]);
        self::assertResponseStatusCodeSame(204);
        $this->call('GET', '/api/me', token: $b, expect: 401);
        $this->call('GET', '/api/players/'.$pb['id'], expect: 404);
        self::assertSame(['ALICE'], array_column($this->call('GET', '/api/me/friends', token: $a)['players'], 'name'));
    }

    public function testRename(): void
    {
        [$t] = $this->register('OLDNAME');
        self::assertSame('NEW NAME 1', $this->call('PATCH', '/api/me', ['name' => 'new name 1'], $t)['player']['name']);
        $this->call('PATCH', '/api/me', ['name' => '!!'], $t, 422);
        $this->call('PATCH', '/api/me', ['skin' => 'Not A Skin'], $t, 422);
    }

    public function testSignInIsRateLimited(): void
    {
        for ($i = 0; $i < 20; ++$i) {
            $this->register();
        }
        $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:late'], expect: 429);
    }

    /** @param array<string, mixed> $event */
    private function hook(array $event, string $secret = 'test-hook', int $expect = 200): void
    {
        $this->client->request('POST', '/api/webhooks/revenuecat', [], [], ['CONTENT_TYPE' => 'application/json', 'HTTP_AUTHORIZATION' => 'Bearer '.$secret], json_encode(['event' => $event]));
        self::assertSame($expect, $this->client->getResponse()->getStatusCode(), (string) $this->client->getResponse()->getContent());
    }

    public function testPurchasesAreBoundToTheAccount(): void
    {
        [$t, $me] = $this->register('BUYER', 'apple-1', 'apple');
        $buy = ['type' => 'NON_RENEWING_PURCHASE', 'app_user_id' => $me['id'], 'product_id' => 'retracoon.starter', 'transaction_id' => 'tx-1'];
        $this->hook($buy, 'wrong', 403);
        $this->hook($buy);
        $this->hook($buy); // RevenueCat retries: granted once
        $p = $this->call('GET', '/api/me', token: $t)['player'];
        self::assertSame(300, $p['gems']);
        self::assertTrue($p['noAds']);

        // A new device signing in with the same account sees the same gems.
        [$t2] = $this->register(null, 'apple-1', 'apple', 200);
        self::assertSame(300, $this->call('GET', '/api/me', token: $t2)['player']['gems']);

        // Spending is idempotent per unlock and can't overdraw.
        self::assertSame(200, $this->call('POST', '/api/me/spend', ['gems' => 100, 'item' => 'ninja'], $t)['player']['gems']);
        self::assertSame(200, $this->call('POST', '/api/me/spend', ['gems' => 100, 'item' => 'ninja'], $t2)['player']['gems']);
        self::assertSame(['ninja'], $this->call('GET', '/api/me', token: $t2)['player']['unlocks']);
        $this->call('POST', '/api/me/spend', ['gems' => 5000, 'item' => 'king'], $t, 409);

        // A refund takes the purchase back.
        $this->hook(['type' => 'CANCELLATION', 'app_user_id' => $me['id'], 'product_id' => 'retracoon.starter', 'transaction_id' => 'tx-1']);
        $p = $this->call('GET', '/api/me', token: $t)['player'];
        self::assertSame(0, $p['gems']);
        self::assertFalse($p['noAds']);

        // Purchases for unknown players or products are ignored, not errors.
        $this->hook(['type' => 'NON_RENEWING_PURCHASE', 'app_user_id' => 'nobody', 'product_id' => 'retracoon.gems80', 'transaction_id' => 'tx-2']);
    }
}
