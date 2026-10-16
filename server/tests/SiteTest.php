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
 * The website: landing page with today's daily board, privacy policy and press kit.
 */
final class SiteTest extends WebTestCase
{
    private KernelBrowser $client;

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

    public function testPagesRenderAsHtmlWithShareCards(): void
    {
        foreach (['/', '/privacy', '/press', '/wiki'] as $url) {
            $this->client->request('GET', $url);
            self::assertResponseIsSuccessful($url);
            self::assertResponseHeaderSame('Content-Type', 'text/html; charset=UTF-8');
            self::assertSelectorExists('meta[property="og:image"][content^="http://localhost/downloads/"]');
            self::assertSelectorExists('meta[name="twitter:card"]');
            self::assertSelectorExists('footer a[href="/privacy"]');
        }
    }

    public function testLandingShowsTodaysDailyTopFive(): void
    {
        $this->client->request('GET', '/');
        self::assertSelectorTextContains('main', 'Nobody has walked today\'s road yet');
        // No store URLs are configured in tests, so no store buttons, only the wiki link.
        self::assertSelectorNotExists('a.store');
        self::assertSelectorExists('a.btn[href="/wiki"]');
        self::assertSelectorExists('a.teaser[href^="/wiki/items/"]');

        foreach (['ALPHA' => 9, 'BRAVO' => 4, 'CHARLIE' => 7, 'DELTA' => 3, 'ECHO' => 8, 'FOXTROT' => 2] as $i => $stage) {
            $this->dailyRun($i, $stage);
        }
        $crawler = $this->client->request('GET', '/');
        $rows = $crawler->filter('ol.board li .name')->each(fn ($td) => trim($td->text()));
        self::assertCount(5, $rows);
        self::assertStringStartsWith('ALPHA#', $rows[0]);
        self::assertStringStartsWith('ECHO#', $rows[1]);
        self::assertStringNotContainsString('FOXTROT', implode(' ', $rows));
        self::assertSelectorTextContains('main', '6 runners');
    }

    public function testPressKitListsTheDownloads(): void
    {
        $crawler = $this->client->request('GET', '/press');
        self::assertSelectorExists('a[download][href="/downloads/raccoons/legend.png"]');
        self::assertSelectorExists('a[download][href="/downloads/video/boss-clip-landscape.mp4"]');
        self::assertGreaterThan(30, $crawler->filter('.downloads a')->count());
    }

    private function dailyRun(string $name, int $stage): void
    {
        static $n = 0;
        $this->client->jsonRequest('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:site'.++$n, 'name' => $name]);
        $token = json_decode((string) $this->client->getResponse()->getContent(), true)['token'];
        $this->client->jsonRequest('POST', '/api/me/runs', ['stage' => $stage, 'level' => 3, 'distance' => $stage * 24, 'mode' => 'daily', 'day' => '2026-11-14', 'timeMs' => 60000 * $stage], ['HTTP_AUTHORIZATION' => 'Bearer '.$token]);
        self::assertResponseIsSuccessful();
    }
}
