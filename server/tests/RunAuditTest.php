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
 * Run ledgers: honest runs pass, edited or made-up ones don't count, and a hidden
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
     * A ledger like the game writes: 3 s walks of 24 m, 2-turn fights of 4 s, 12 XP a
     * fight with the points from each level put into STR. The last fight is lost when
     * $died. Returns the ledger and the summary the game sends with it.
     *
     * @return array{0: array<string, mixed>, 1: array<string, mixed>}
     */
    private static function ledger(int $fights, bool $died = false, string $mode = 'normal', ?string $day = null, int $level = 1): array
    {
        $st = [3, 2, 2, 2, 3];
        $e = [];
        $t = 500;
        $l = $level;
        $xp = 0;
        $won = 0;
        for ($i = 0; $i < $fights; ++$i) {
            $lost = $died && $i === $fights - 1;
            $e[] = ['f', $t, $t + 4000, $lost ? 0 : 1, 2, 24];
            $t += 4000 + 3000;
            if ($lost) {
                break;
            }
            ++$won;
            $e[] = ['x', 12];
            for ($xp += 12; $xp >= RunAudit::xpToLevel($l); ++$l) {
                $xp -= RunAudit::xpToLevel($l);
                $st[0] += 3;
            }
        }
        $e[] = ['d', 10];
        $book = ['v' => 2, 'ver' => '1.0.0', 'mode' => $mode, 'day' => $day, 'open' => ['l' => $level, 'st' => [3, 2, 2, 2, 3], 'p' => 0], 'e' => $e, 'close' => ['l' => $l, 'st' => $st, 'p' => 0]];

        return [$book, ['stage' => $won, 'level' => $l, 'distance' => 24 * $fights + 10, 'mode' => $mode, 'day' => $day, 'timeMs' => $t]];
    }

    private static function summary(array $ledger, array $over = []): RunResult
    {
        [$book, $sum] = $ledger;

        return new RunResult(...array_merge($sum, ['log' => $book], $over));
    }

    private function audit(RunResult $r, int $best = 0): array
    {
        return (new RunAudit())->check($r, $best);
    }

    public function testHonestRunsPass(): void
    {
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::ledger(12, died: true))));
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::ledger(12))));
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::ledger(9, true, 'daily', '2026-11-14'))));
        // A banked raccoon starts high.
        self::assertSame([RunAudit::OK, []], $this->audit(self::summary(self::ledger(6, true, level: 30))));
        // No ledger: older games, and bests made while signed out.
        self::assertSame([RunAudit::UNLOGGED, []], $this->audit(new RunResult(stage: 12, level: 8, distance: 300, timeMs: 600000)));
        self::assertSame([RunAudit::UNLOGGED, []], $this->audit(new RunResult(stage: 12, level: 8, mode: 'best')));
    }

    public function testEditedScoresAreRejected(): void
    {
        $l = self::ledger(12, true);
        $cases = [
            'fight_count' => self::summary($l, ['stage' => 40]),
            'level_mismatch' => self::summary($l, ['level' => 30]),
            'distance_mismatch' => self::summary($l, ['distance' => 9000]),
            'time_mismatch' => self::summary($l, ['timeMs' => 20000]),
            'log_wrong_run' => self::summary($l, ['mode' => 'daily', 'day' => '2026-11-14']),
        ];
        foreach ($cases as $why => $run) {
            [$v, $reasons] = $this->audit($run);
            self::assertSame(RunAudit::REJECTED, $v, $why);
            self::assertContains($why, $reasons, $why);
        }
    }

    public function testMadeUpLedgersAreRejected(): void
    {
        $tamper = function (callable $fn): RunResult {
            [$book, $sum] = self::ledger(12, true);
            $fn($book, $sum);

            return new RunResult(...array_merge($sum, ['log' => $book]));
        };
        $cases = [
            // fights faster than the game plays them
            'too_fast' => $tamper(function (array &$b) { foreach ($b['e'] as $i => &$e) { if ('f' === $e[0]) { $e[1] = $i * 300; $e[2] = $i * 300 + 100; } } }),
            // XP that doesn't reach the level claimed
            'level_mismatch' => $tamper(function (array &$b, array &$s) { $b['close']['l'] += 5; $s['level'] += 5; }),
            // stats from nowhere
            'stats_mismatch' => $tamper(fn (array &$b) => $b['close']['st'][0] += 10),
            // an extra won fight
            'fight_count' => $tamper(fn (array &$b) => array_unshift($b['e'], ['f', 0, 400, 1, 1, 0])),
            'fought_after_death' => $tamper(fn (array &$b) => $b['e'][0][3] = 0),
            'log_malformed' => $tamper(fn (array &$b) => $b['e'][0][4] = 'lots'),
        ];
        foreach ($cases as $why => $run) {
            [$v, $reasons] = $this->audit($run);
            self::assertSame(RunAudit::REJECTED, $v, $why);
            self::assertContains($why, $reasons, $why);
        }
        // The daily run is a fresh raccoon.
        [$v, $reasons] = $this->audit(self::summary(self::ledger(6, true, 'daily', '2026-11-14', level: 20)));
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
        $r = $this->send($a, self::summary(self::ledger(10, true)));
        self::assertTrue($r['counted']);
        self::assertTrue($r['improved']);
        $r = $this->send($b, self::summary(self::ledger(10, true), ['stage' => 500]));
        self::assertFalse($r['counted']);
        self::assertFalse($r['improved']);

        $board = $this->call('GET', '/api/leaderboard');
        self::assertSame(['HONEST'], array_column($board['players'], 'name'));
        self::assertSame(1, $this->call('GET', '/api/season')['total']);

        $em = static::getContainer()->get(EntityManagerInterface::class);
        $kept = $em->getRepository(RunLog::class)->findBy([], ['id' => 'ASC']);
        self::assertSame([RunAudit::OK, RunAudit::REJECTED], array_map(fn (RunLog $l) => $l->getVerdict(), $kept));
        self::assertSame(['f', 500, 4500, 1, 2, 24], $kept[0]->getLog()['e'][0]);
        self::assertContains('fight_count', $kept[1]->getReasons());

        // A worse honest run changes nothing and isn't kept.
        $this->send($a, self::summary(self::ledger(4, true)));
        self::assertCount(2, $em->getRepository(RunLog::class)->findAll());
    }

    public function testHiddenPlayersLeaveTheBoards(): void
    {
        [$a] = $this->register('ALPHA');
        [$b, $bid] = $this->register('BRAVO');
        $this->send($a, self::summary(self::ledger(6, true)));
        $this->send($a, self::summary(self::ledger(6, true, 'daily', '2026-11-14')));
        $this->send($b, self::summary(self::ledger(9, true)));
        $this->send($b, self::summary(self::ledger(9, true, 'daily', '2026-11-14')));
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
