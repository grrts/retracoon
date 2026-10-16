<?php

namespace App\Tests;

use App\Dto\RunResult;
use App\Entity\Player;
use App\Entity\RunLog;
use App\Service\RunAudit;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Clock\Clock;
use Symfony\Component\Clock\MockClock;
use Symfony\Component\Clock\NativeClock;

/**
 * Run logbooks: honest runs pass, edited or made-up ones don't count, and a hidden
 * player drops off the boards and out of prizes.
 */
final class RunAuditTest extends WebTestCase
{
    private KernelBrowser $client;
    private int $accounts = 0;

    protected function setUp(): void
    {
        Clock::set(new MockClock('2026-11-14 12:00:00', 'UTC'));
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

    /**
     * A logbook like the game writes: a level-up every other fight, 3 s walks, 2 turns
     * a fight. The last fight is lost when $died.
     *
     * @return array<string, mixed>
     */
    private static function log(int $fights, bool $died = false, string $mode = 'normal', ?string $day = null, int $level = 1): array
    {
        $st = [3, 2, 2, 2, 3];
        $out = [];
        $t = 500;
        $l = $level;
        for ($i = 0; $i < $fights; ++$i) {
            $lost = $died && $i === $fights - 1;
            $out[] = ['s' => $i, 'a' => intdiv($i, 4), 'th' => 'street', 'k' => 'f', 'f' => ['rat'], 'tr' => [0], 'l' => $l, 'st' => $st, 'p' => 0, 'h' => 30, 'm' => 40, 'sh' => 10 * $i, 'd' => 24 * $i, 't' => $t, 'w' => $lost ? 0 : 1, 'n' => 2, 'u' => 3, 'x' => $lost ? 0 : 8, 'h2' => $lost ? -3 : 25, 't2' => $t + 4000];
            $t += 4000 + 3000;
            if (1 === $i % 2) {
                ++$l;
                $st[0] += 3;
            }
        }

        return ['v' => 1, 'ver' => '1.0.0', 'mode' => $mode, 'day' => $day, 'seed' => null, 'start' => ['l' => $level, 'st' => [3, 2, 2, 2, 3], 'p' => 0], 'fights' => $out];
    }

    /** The summary the game sends with a logbook. */
    private static function summary(array $log, string $mode = 'normal', array $over = []): RunResult
    {
        $f = $log['fights'];
        $last = end($f);
        $stage = \count($f) - (0 === $last['w'] ? 1 : 0);
        $a = ['stage' => $stage, 'level' => $last['l'], 'distance' => $last['d'] + 24, 'mode' => $mode, 'day' => $log['day'], 'timeMs' => $last['t2'] + 2000, 'log' => $log] + [];

        return new RunResult(...array_merge($a, $over));
    }

    private function audit(RunResult $r, int $best = 0): array
    {
        return (new RunAudit())->check($r, $best);
    }

    public function testHonestRunsPass(): void
    {
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::log(12, died: true))));
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::log(12))));
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::log(9, true, 'daily', '2026-11-14'), 'daily')));
        // A banked raccoon starts high.
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::log(6, true, level: 30))));
        // No logbook: older games, and bests made while signed out.
        self::assertSame([RunAudit::UNLOGGED, []], $this->audit(new RunResult(stage: 12, level: 8, distance: 300, timeMs: 600000)));
        self::assertSame([RunAudit::UNLOGGED, []], $this->audit(new RunResult(stage: 12, level: 8, mode: 'best')));
    }

    public function testEditedScoresAreRejected(): void
    {
        $log = self::log(12, true);
        $cases = [
            'fight_count' => self::summary($log, over: ['stage' => 40]),
            'level_mismatch' => self::summary($log, over: ['level' => 2]),
            'distance_mismatch' => self::summary($log, over: ['distance' => 10]),
            'time_mismatch' => self::summary($log, over: ['timeMs' => 20000]),
            'log_wrong_run' => self::summary($log, 'daily', ['day' => '2026-11-14']),
        ];
        foreach ($cases as $why => $run) {
            [$v, $reasons] = $this->audit($run);
            self::assertSame(RunAudit::REJECTED, $v, $why);
            self::assertContains($why, $reasons, $why);
        }
    }

    public function testMadeUpLogbooksAreRejected(): void
    {
        $tamper = function (callable $fn): RunResult {
            $log = self::log(12, true);
            $fn($log);

            return self::summary($log);
        };
        $cases = [
            'too_fast' => $tamper(function (array &$l) { foreach ($l['fights'] as $i => &$f) { $f['t'] = $i * 300; $f['t2'] = $i * 300 + 100; } }),
            'fight_order' => $tamper(fn (array &$l) => $l['fights'][3]['s'] = 7),
            'level_dropped' => $tamper(fn (array &$l) => $l['fights'][5]['l'] = 1),
            'stats_jump' => $tamper(fn (array &$l) => $l['fights'][4]['st'][0] = 99),
            'hp_vs_outcome' => $tamper(fn (array &$l) => $l['fights'][2]['h2'] = 0),
            'fought_after_death' => $tamper(fn (array &$l) => $l['fights'][2]['w'] = 0),
            'log_malformed' => $tamper(fn (array &$l) => $l['fights'][2]['n'] = 'lots'),
        ];
        foreach ($cases as $why => $run) {
            [$v, $reasons] = $this->audit($run);
            self::assertSame(RunAudit::REJECTED, $v, $why);
            self::assertContains($why, $reasons, $why);
        }
        // The daily run is a fresh raccoon.
        [$v, $reasons] = $this->audit(self::summary(self::log(6, true, 'daily', '2026-11-14', level: 20), 'daily'));
        self::assertSame(RunAudit::REJECTED, $v);
        self::assertContains('daily_not_fresh', $reasons);
    }

    public function testSummaryOnlyChecks(): void
    {
        // 300 fights in five minutes can't be played.
        self::assertSame([RunAudit::REJECTED, ['too_fast']], $this->audit(new RunResult(stage: 300, level: 40, timeMs: 200000)));
        self::assertSame([RunAudit::REJECTED, ['level_too_high']], $this->audit(new RunResult(stage: 5, level: 80, mode: 'daily', day: '2026-11-14', timeMs: 300000)));
        // A best far past the last one is fine, but worth a look.
        self::assertSame([RunAudit::SUSPECT, ['big_jump']], $this->audit(new RunResult(stage: 90, level: 40, timeMs: 3600000), 20));
        self::assertSame(RunAudit::UNLOGGED, $this->audit(new RunResult(stage: 50, level: 40, timeMs: 3600000), 20)[0]);
    }

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

    /** @return array{0: string, 1: string} token and player id */
    private function register(string $name): array
    {
        $r = $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:acct'.++$this->accounts, 'name' => $name], expect: 201);

        return [$r['token'], $r['player']['id']];
    }

    private function send(string $token, RunResult $r): array
    {
        return $this->call('POST', '/api/me/runs', array_filter(get_object_vars($r), fn ($v) => null !== $v), $token);
    }

    public function testRejectedRunsCountNowhereButAreKept(): void
    {
        [$a] = $this->register('HONEST');
        [$b] = $this->register('CHEATER');
        $r = $this->send($a, self::summary(self::log(10, true)));
        self::assertTrue($r['counted']);
        self::assertTrue($r['improved']);
        $r = $this->send($b, self::summary(self::log(10, true), over: ['stage' => 500]));
        self::assertFalse($r['counted']);
        self::assertFalse($r['improved']);

        $board = $this->call('GET', '/api/leaderboard');
        self::assertSame(['HONEST'], array_column($board['players'], 'name'));
        self::assertSame(1, $this->call('GET', '/api/season')['total']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $kept = $em->getRepository(RunLog::class)->findBy([], ['id' => 'ASC']);
        self::assertSame([RunAudit::OK, RunAudit::REJECTED], array_map(fn (RunLog $l) => $l->getVerdict(), $kept));
        self::assertCount(10, $kept[0]->getLog()['fights']);
        self::assertContains('fight_count', $kept[1]->getReasons());

        // A worse honest run changes nothing and isn't kept.
        $this->send($a, self::summary(self::log(4, true)));
        self::assertCount(2, $em->getRepository(RunLog::class)->findAll());
    }

    public function testHiddenPlayersLeaveTheBoards(): void
    {
        [$a] = $this->register('ALPHA');
        [$b, $bid] = $this->register('BRAVO');
        $this->send($a, self::summary(self::log(6, true)));
        $this->send($a, self::summary(self::log(6, true, 'daily', '2026-11-14'), 'daily'));
        $this->send($b, self::summary(self::log(9, true)));
        $this->send($b, self::summary(self::log(9, true, 'daily', '2026-11-14'), 'daily'));
        self::assertSame('BRAVO', $this->call('GET', '/api/leaderboard')['players'][0]['name']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $em->find(Player::class, $bid)->setHidden(true);
        $em->flush();

        foreach (['/api/leaderboard', '/api/daily', '/api/season'] as $board) {
            $res = $this->call('GET', $board);
            self::assertSame(['ALPHA'], array_column($res['players'], 'name'), $board);
            self::assertSame(1, $res['total'], $board);
        }
        // They still see their own scores, so nothing tells them.
        $me = $this->call('GET', '/api/me', token: $b)['player'];
        self::assertSame(8, $me['bestStage']);
        self::assertSame(8, $me['daily']['stage']);
    }
}
