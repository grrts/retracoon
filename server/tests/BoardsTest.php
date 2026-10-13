<?php

namespace App\Tests;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;

/**
 * Daily run board, season board, their prizes, and tracking events.
 */
final class BoardsTest extends WebTestCase
{
    private KernelBrowser $client;
    private MockClock $clock;
    private int $accounts = 0;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-11-14 12:00:00', 'UTC');
        Clock::set($this->clock);
        $this->client = static::createClient();
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.global_clearer')->clearPool('cache.rate_limiter');
    }

    protected function tearDown(): void
    {
        Clock::set(new NativeClock());
        parent::tearDown();
    }

    /** @return array<string, mixed> */
    private function call(string $method, string $uri, ?array $body = null, ?string $token = null, int $expect = 200, array $extra = []): array
    {
        $headers = ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'] + $extra;
        if (null !== $token) {
            $headers['HTTP_AUTHORIZATION'] = 'Bearer '.$token;
        }
        $this->client->request($method, $uri, [], [], $headers, null === $body ? null : json_encode($body));
        $res = $this->client->getResponse();
        self::assertSame($expect, $res->getStatusCode(), (string) $res->getContent());

        return json_decode((string) $res->getContent() ?: '[]', true);
    }

    private function register(string $name): string
    {
        $r = $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:acct'.++$this->accounts, 'name' => $name], expect: 201);

        return $r['token'];
    }

    private function daily(string $token, int $stage, int $timeMs, ?string $day = null): array
    {
        return $this->call('POST', '/api/me/runs', ['stage' => $stage, 'level' => 3, 'distance' => $stage * 24, 'mode' => 'daily', 'day' => $day ?? '2026-11-14', 'timeMs' => $timeMs], $token);
    }

    public function testDailyBoardRanksFurthestThenFastest(): void
    {
        $a = $this->register('ALPHA');
        $b = $this->register('BRAVO');
        $c = $this->register('CHARLIE');
        $this->daily($a, 8, 300000);
        $this->daily($b, 8, 200000);
        $this->daily($c, 5, 100000);
        // A slower run at the same stage doesn't replace the best one.
        $r = $this->daily($b, 8, 250000);
        self::assertFalse($r['improved']);
        self::assertSame(1, $r['player']['daily']['rank']);

        $board = $this->call('GET', '/api/daily');
        self::assertSame('2026-11-14', $board['day']);
        self::assertSame(10, $board['prize']);
        self::assertSame(['BRAVO', 'ALPHA', 'CHARLIE'], array_column($board['players'], 'name'));
        self::assertSame(200000, $board['players'][0]['timeMs']);

        // Daily runs don't touch the world board or the season.
        $me = $this->call('GET', '/api/me', token: $a);
        self::assertSame(0, $me['player']['bestStage']);
        self::assertNull($me['player']['season']);
    }

    public function testDailyWinnerGetsTenGemsOnceAfterTheDayCloses(): void
    {
        $a = $this->register('ALPHA');
        $b = $this->register('BRAVO');
        $this->daily($a, 9, 400000);
        $this->daily($b, 7, 100000);

        // Just after midnight the day is still open for late (offline) results.
        $this->clock->modify('2026-11-15 00:10:00');
        $r = $this->daily($b, 10, 500000, '2026-11-14');
        self::assertTrue($r['counted']);
        $me = $this->call('GET', '/api/me', token: $b);
        self::assertSame(0, $me['player']['gems']);

        // After the grace period: closed, paid once, shown once.
        $this->clock->modify('2026-11-15 01:00:00');
        $r = $this->daily($a, 20, 1000, '2026-11-14');
        self::assertFalse($r['counted']);
        $me = $this->call('GET', '/api/me', token: $b);
        self::assertSame(10, $me['player']['gems']);
        self::assertSame([['kind' => 'daily', 'period' => '2026-11-14', 'place' => 1, 'gems' => 10]], array_map(fn ($p) => array_diff_key($p, ['id' => 1]), $me['player']['prizes']));
        $this->call('GET', '/api/daily');
        $me = $this->call('POST', '/api/me/prizes/seen', [], $b);
        self::assertSame(10, $me['player']['gems']);
        self::assertSame([], $me['player']['prizes']);
        self::assertSame(0, $this->call('GET', '/api/me', token: $a)['player']['gems']);

        $board = $this->call('GET', '/api/daily');
        self::assertSame('2026-11-15', $board['day']);
        self::assertSame('BRAVO', $board['lastWinner']['name']);
    }

    public function testSeasonBoardAndPrize(): void
    {
        $a = $this->register('ALPHA');
        $b = $this->register('BRAVO');
        $this->call('POST', '/api/me/runs', ['stage' => 12, 'level' => 6, 'distance' => 300], $a);
        $this->call('POST', '/api/me/runs', ['stage' => 15, 'level' => 7, 'distance' => 360], $b);
        $board = $this->call('GET', '/api/season');
        self::assertSame('2026-11', $board['season']);
        self::assertSame(['BRAVO', 'ALPHA'], array_column($board['players'], 'name'));
        self::assertSame('2026-12-01T00:00:00+00:00', $board['endsAt']);

        // New month: a fresh board, and last season's winner is paid.
        $this->clock->modify('2026-12-01 02:00:00');
        $this->call('POST', '/api/me/runs', ['stage' => 3, 'level' => 7, 'distance' => 72], $a);
        $board = $this->call('GET', '/api/season');
        self::assertSame('2026-12', $board['season']);
        self::assertSame(['ALPHA'], array_column($board['players'], 'name'));
        self::assertSame('BRAVO', $board['lastWinner']['name']);
        self::assertSame(300, $this->call('GET', '/api/me', token: $b)['player']['gems']);
        self::assertSame(0, $this->call('GET', '/api/me', token: $a)['player']['gems']);
        // Once only.
        $this->call('GET', '/api/season');
        self::assertSame(300, $this->call('GET', '/api/me', token: $b)['player']['gems']);
    }

    public function testDeletingAnAccountRemovesItsBoardRows(): void
    {
        $a = $this->register('ALPHA');
        $this->daily($a, 4, 1000);
        $this->call('POST', '/api/me/runs', ['stage' => 4, 'level' => 2], $a);
        $this->call('DELETE', '/api/me', token: $a, expect: 204);
        self::assertSame([], $this->call('GET', '/api/daily')['players']);
        self::assertSame([], $this->call('GET', '/api/season')['players']);
    }

    public function testTrackingEventsAndStats(): void
    {
        $at = (new \DateTimeImmutable('2026-11-13 10:00:00 UTC'))->getTimestamp() * 1000;
        $batch = fn (string $device, array $events) => $this->call('POST', '/api/events', ['device' => $device, 'platform' => 'android', 'version' => '1.0.0', 'events' => $events], expect: 204);
        $batch('dev-aaaa-1111', [['name' => 'app_open', 'at' => $at], ['name' => 'tutorial_done', 'at' => $at], ['name' => 'run_end', 'at' => $at, 'props' => ['stage' => 6, 'area' => 2, 'mode' => 'normal', 'nested' => ['no']]], ['name' => 'not_a_thing']]);
        $batch('dev-bbbb-2222', [['name' => 'app_open', 'at' => $at]]);
        // Device A comes back the next day.
        $batch('dev-aaaa-1111', [['name' => 'app_open']]);
        $this->call('POST', '/api/events', ['device' => 'x', 'platform' => 'android', 'version' => '1', 'events' => [['name' => 'app_open']]], expect: 422);

        // Stats are hidden without the key.
        $this->call('GET', '/api/stats', expect: 404);
        // Day 1 retention needs the next day to be over.
        $this->clock->modify('2026-11-15 12:00:00');
        $_ENV['STATS_KEY'] = 'k3y';
        $this->client->getKernel()->shutdown();
        $r = $this->call('GET', '/api/stats?days=3', extra: ['HTTP_X_STATS_KEY' => 'k3y']);
        unset($_ENV['STATS_KEY']);
        self::assertSame(2, $r['installsAllTime']);
        self::assertSame(0.5, $r['tutorialDone']);
        $d13 = $r['days'][0];
        self::assertSame(['2026-11-13', 2, 2, 1, 6, 1.0, 0.5], [$d13['day'], $d13['installs'], $d13['players'], $d13['runs'], $d13['medianStage'], (float) $d13['leftArea1'], (float) $d13['d1']]);
        self::assertSame(1, $r['days'][1]['players']);
    }
}
