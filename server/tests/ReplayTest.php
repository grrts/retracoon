<?php

namespace App\Tests;

use App\Service\RunAudit;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;

/**
 * Run tickets and replays: the server hands out each run's seed and starting raccoon,
 * keeps the banked raccoon itself, and (with RUN_REPLAY=on) only ranks a run once the
 * replay job says it lands on its score.
 */
final class ReplayTest extends WebTestCase
{
    private const KEY = 'replay-test-key';

    private KernelBrowser $client;
    private MockClock $clock;
    private int $accounts = 0;

    protected function setUp(): void
    {
        $this->clock = new MockClock('2026-11-14 12:00:00', 'UTC');
        Clock::set($this->clock);
        $_SERVER['REPLAY_KEY'] = self::KEY;
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
        unset($_SERVER['REPLAY_KEY'], $_SERVER['RUN_REPLAY']);
        parent::tearDown();
    }

    private function enforce(): void
    {
        $_SERVER['RUN_REPLAY'] = 'on';
    }

    private function call(string $method, string $uri, ?array $body = null, ?string $token = null, int $expect = 200, array $headers = []): array
    {
        $headers += ['CONTENT_TYPE' => 'application/json', 'HTTP_ACCEPT' => 'application/json'];
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
        return $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:acct'.++$this->accounts, 'name' => $name], expect: 201)['token'];
    }

    private function ticket(string $token, string $mode = 'normal', ?array $kept = null): array
    {
        return $this->call('POST', '/api/me/runs/start', ['mode' => $mode, 'kept' => $kept], $token)['ticket'];
    }

    /**
     * A run played on a ticket, as the game sends it: the ledger (2-turn fights of 4 s
     * after 3 s walks, 12 XP a fight into STR) and a replay. The replay's choices are
     * only carried here; what they replay to is up to the fake results posted below.
     * The clock moves on by the run's length.
     */
    private function play(string $token, array $ticket, int $fights, bool $died, string $mode = 'normal'): array
    {
        $open = $ticket['kept'] ?? RunAudit::FRESH;
        $st = $open['st'];
        $l = $open['l'];
        $xp = 0;
        $e = [];
        $t = 500;
        for ($i = 0; $i < $fights; ++$i) {
            $lost = $died && $i === $fights - 1;
            $e[] = ['f', $t, $t + 4000, $lost ? 0 : 1, 2, 24];
            $t += 7000;
            if ($lost) {
                break;
            }
            $e[] = ['x', 12];
            for ($xp += 12; $xp >= RunAudit::xpToLevel($l); ++$l) {
                $xp -= RunAudit::xpToLevel($l);
                $st[0] += 3;
            }
        }
        $e[] = ['d', 0];
        $won = $fights - ($died ? 1 : 0);
        $book = ['v' => 2, 'ver' => '1.0.0', 'mode' => $mode, 'day' => $ticket['day'], 'open' => $open, 'e' => $e, 'close' => ['l' => $l, 'st' => $st, 'p' => $open['p']]];
        $this->clock->sleep($t / 1000 + 1);
        $run = ['mode' => $mode, 'day' => $ticket['day'], 'stage' => $won, 'level' => $l, 'distance' => 24 * $fights, 'timeMs' => $t, 'log' => $book, 'ticket' => $ticket['id'], 'replay' => ['v' => 1, 'build' => str_repeat('a', 40), 'leg' => 0, 'acts' => [[1500, 'a']]]];

        return [$this->call('POST', '/api/me/runs', $run, $token), $run];
    }

    private function jobs(): array
    {
        return $this->call('GET', '/api/admin/replays', headers: ['HTTP_X_REPLAY_KEY' => self::KEY])['jobs'];
    }

    // What tools/replay.ts would print for a job: its claim, or something else.
    private function replayResult(array $job, array $over = []): array
    {
        $c = $job['claim'];
        $l = $c['level'];

        return array_merge(['id' => $job['id'], 'ok' => true, 'end' => $c['end'], 'stage' => $c['stage'], 'level' => $l, 'distance' => $c['distance'], 'ms' => $c['timeMs'] - 500, 'close' => ['l' => $l, 'st' => [3 + 3 * ($l - 1), 2, 2, 2, 3], 'p' => 0]], $over);
    }

    private function settle(array $results): array
    {
        return $this->call('POST', '/api/admin/replays', ['results' => $results], headers: ['HTTP_X_REPLAY_KEY' => self::KEY]);
    }

    private function me(string $token): array
    {
        return $this->call('GET', '/api/me', token: $token)['player'];
    }

    public function testTicketsHandOutSeedsAndTheBankedRaccoon(): void
    {
        $a = $this->register('ALPHA');
        $t = $this->ticket($a);
        self::assertMatchesRegularExpression('/^[0-9a-f]{20}$/', $t['id']);
        self::assertIsInt($t['seed']);
        self::assertNull($t['kept']);
        self::assertSame('2026-11-14', $this->ticket($a, 'daily')['day']);

        // A retreat banks the raccoon it ended with; the next ticket starts from it.
        [$r] = $this->play($a, $t, 4, false);
        self::assertTrue($r['counted']);
        $kept = $this->ticket($a)['kept'];
        self::assertGreaterThan(1, $kept['l']);
        // That run was never sent (closed app, GIVE UP): it counts as a death.
        self::assertNull($this->ticket($a)['kept']);
    }

    public function testThePhonesRaccoonIsTakenOnceIfItIsPossible(): void
    {
        $a = $this->register('ALPHA');
        // Never got past level 1 here: a banked level 40 raccoon is made up.
        self::assertNull($this->ticket($a, kept: ['l' => 40, 'st' => [50, 50, 50, 50, 50], 'p' => 0])['kept']);

        $b = $this->register('BRAVO');
        $this->call('POST', '/api/me/runs', ['mode' => 'best', 'stage' => 12, 'level' => 9], $b);
        $ok = ['l' => 9, 'st' => [27, 2, 2, 2, 3], 'p' => 0];
        self::assertSame($ok, $this->ticket($b, kept: $ok)['kept']);
        // Only the first time: later the server's own record counts.
        self::assertNull($this->ticket($b, kept: $ok)['kept']);
    }

    public function testResultsMustMatchTheirTicket(): void
    {
        $a = $this->register('ALPHA');
        $t = $this->ticket($a);
        [, $run] = $this->play($a, $t, 3, true);
        // One result per ticket.
        $again = $this->call('POST', '/api/me/runs', $run, $a);
        self::assertFalse($again['counted']);
        // A ledger that starts from another raccoon than the ticket's.
        $t2 = $this->ticket($a);
        $t2['kept'] = ['l' => 30, 'st' => [90, 2, 2, 2, 3], 'p' => 0];
        [$r] = $this->play($a, $t2, 3, true);
        self::assertFalse($r['counted']);
        // Someone else's ticket.
        $b = $this->register('BRAVO');
        [$r] = $this->play($b, $this->ticket($a), 3, true);
        self::assertFalse($r['counted']);
        self::assertSame(0, $this->me($b)['bestStage']);
    }

    public function testWithReplaysOnRunsCountOnlyOnceReplayed(): void
    {
        $this->enforce();
        $a = $this->register('ALPHA');
        // No ticket, no replay: nothing to check, so it doesn't count.
        $r = $this->call('POST', '/api/me/runs', ['mode' => 'best', 'stage' => 50, 'level' => 30], $a);
        self::assertFalse($r['counted']);

        [$r] = $this->play($a, $this->ticket($a), 6, true);
        self::assertTrue($r['counted']);
        self::assertTrue($r['pending']);
        self::assertSame(0, $this->me($a)['bestStage']);
        self::assertSame([], $this->call('GET', '/api/leaderboard')['players']);

        $jobs = $this->jobs();
        self::assertCount(1, $jobs);
        self::assertSame('death', $jobs[0]['claim']['end']);
        self::assertSame(['mode', 'day', 'seed', 'kept', 'leg'], array_keys($jobs[0]['start']));
        self::assertSame(['ok' => 1, 'failed' => 0, 'skipped' => 0], $this->settle([$this->replayResult($jobs[0])]));
        self::assertSame(5, $this->me($a)['bestStage']);
        self::assertSame(5, $this->call('GET', '/api/season')['players'][0]['stage']);
        self::assertSame([], $this->jobs());
    }

    public function testARunThatDoesntReplayCountsNowhereAndTakesItsRaccoon(): void
    {
        $this->enforce();
        $a = $this->register('ALPHA');
        $this->play($a, $this->ticket($a), 5, false);
        // The next run starts from the raccoon that retreat banked, before it's checked.
        $t = $this->ticket($a);
        self::assertGreaterThan(1, $t['kept']['l']);
        $this->play($a, $t, 3, false);
        // Only the first run is ready: the second waits on the raccoon it started from.
        $jobs = $this->jobs();
        self::assertCount(1, $jobs);
        $this->settle([$this->replayResult($jobs[0], ['stage' => 99])]);
        // The second run fails with it, and the banked raccoon is gone.
        self::assertSame([], $this->jobs());
        self::assertSame(0, $this->me($a)['bestStage']);
        self::assertNull($this->ticket($a)['kept']);
        $flagged = $this->call('GET', '/api/admin/replays', headers: ['HTTP_X_REPLAY_KEY' => self::KEY]);
        self::assertSame([], $flagged['jobs']);
    }

    public function testFailedReplaysAreCaughtEvenWithReplaysOff(): void
    {
        $a = $this->register('ALPHA');
        [$r] = $this->play($a, $this->ticket($a), 5, false);
        self::assertTrue($r['counted']);
        self::assertFalse($r['pending']);
        self::assertSame(5, $this->me($a)['bestStage']);
        $jobs = $this->jobs();
        self::assertSame(['ok' => 0, 'failed' => 1, 'skipped' => 0], $this->settle([['id' => $jobs[0]['id'], 'ok' => false, 'reason' => 'illegal', 'at' => 3]]));
        // The raccoon it banked is gone; the score stays (replays are only advisory here).
        self::assertNull($this->ticket($a)['kept']);
        // Unknown builds can't be replayed.
        $this->play($a, $this->ticket($a), 2, true);
        $jobs = $this->jobs();
        self::assertSame(['ok' => 0, 'failed' => 1, 'skipped' => 0], $this->settle([['id' => $jobs[0]['id'], 'unverifiable' => true]]));
    }

    public function testTheReplayEndpointNeedsItsKey(): void
    {
        $this->call('GET', '/api/admin/replays', expect: 404);
        $this->call('GET', '/api/admin/replays', expect: 404, headers: ['HTTP_X_REPLAY_KEY' => 'wrong']);
        $this->call('POST', '/api/admin/replays', ['results' => []], expect: 404);
    }

    public function testPrizesWaitForRunsStillBeingReplayed(): void
    {
        $this->enforce();
        $a = $this->register('ALPHA');
        $this->play($a, $this->ticket($a, 'daily'), 4, true, 'daily');
        // The day closes with that run still waiting.
        $this->clock->modify('2026-11-15 06:00:00');
        $this->me($a);
        self::assertSame(0, $this->me($a)['gems']);
        $jobs = $this->jobs();
        $this->settle([$this->replayResult($jobs[0])]);
        $this->me($a);
        self::assertSame(10, $this->me($a)['gems']);
    }
}
