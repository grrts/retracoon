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

    /** @return array{0: string, 1: array<string, mixed>} token and player */
    private function register(?string $name = null): array
    {
        $r = $this->call('POST', '/api/players', null === $name ? [] : ['name' => $name], expect: 201);

        return [$r['token'], $r['player']];
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

    public function testRegisterIsRateLimited(): void
    {
        for ($i = 0; $i < 20; ++$i) {
            $this->register();
        }
        $this->call('POST', '/api/players', [], expect: 429);
    }
}
