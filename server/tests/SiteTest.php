<?php

namespace App\Tests;

use App\Service\Stats;
use Doctrine\DBAL\Connection;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\Console\Application;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;
use Symfony\Component\Console\Tester\CommandTester;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\HttpKernelInterface;
use Symfony\Component\HttpKernel\KernelEvents;
use Symfony\Component\Mime\Email;

/**
 * The mailing list (double opt-in, unsubscribe, export) and the site's visit and store
 * click counters.
 */
final class SiteTest extends WebTestCase
{
    private const BROWSER = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';

    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient([], ['HTTP_USER_AGENT' => self::BROWSER]);
        $em = static::getContainer()->get(EntityManagerInterface::class);
        $tool = new SchemaTool($em);
        $meta = $em->getMetadataFactory()->getAllMetadata();
        $tool->dropSchema($meta);
        $tool->createSchema($meta);
        static::getContainer()->get('cache.global_clearer')->clearPool('cache.rate_limiter');
    }

    private function db(): Connection
    {
        return static::getContainer()->get(Connection::class);
    }

    private function signUp(string $email): ?string
    {
        $this->client->request('POST', '/list', ['email' => $email, 'website' => '']);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Check your inbox');
        $mail = self::getMailerMessage();
        if (!$mail instanceof Email) {
            return null;
        }
        preg_match('#/list/confirm/([0-9a-f]{32})#', (string) $mail->getTextBody(), $m);

        return $m[1] ?? null;
    }

    public function testSignUpIsDoubleOptIn(): void
    {
        $this->client->request('GET', '/list');
        self::assertResponseIsSuccessful();
        self::assertSelectorExists('form.signup input[name=email]');

        $token = $this->signUp('  Racc@Example.COM ');
        self::assertEmailCount(1);
        self::assertEmailAddressContains(self::getMailerMessage(), 'To', 'racc@example.com');
        self::assertNotNull($token);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM subscriber WHERE confirmed_at IS NOT NULL'));

        // Opening the link (or a mail scanner opening it) only shows a button.
        $this->client->request('GET', "/list/confirm/$token");
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'Confirm');
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM subscriber WHERE confirmed_at IS NOT NULL'));
        $this->client->submitForm('Yes, send me Retracoon news');
        self::assertSelectorTextContains('h1', 'You are on the list');
        self::assertSame(1, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM subscriber WHERE confirmed_at IS NOT NULL'));

        // Signing up again once confirmed sends nothing and looks the same.
        self::assertNull($this->signUp('racc@example.com'));
        self::assertEmailCount(0);

        $this->client->request('GET', '/list/confirm/'.str_repeat('0', 32));
        self::assertResponseStatusCodeSame(404);
    }

    public function testBadAddressesAndBots(): void
    {
        $this->client->request('POST', '/list', ['email' => 'not an email']);
        self::assertResponseStatusCodeSame(422);
        self::assertSelectorTextContains('.err', 'does not look like an email');

        $this->client->request('POST', '/list', ['email' => 'bot@example.com', 'website' => 'http://spam']);
        self::assertResponseIsSuccessful();
        self::assertEmailCount(0);
        self::assertSame(0, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM subscriber'));

        for ($i = 0; $i < 5; ++$i) {
            $this->client->request('POST', '/list', ['email' => "r$i@example.com"]);
        }
        $this->client->request('POST', '/list', ['email' => 'r9@example.com']);
        self::assertResponseStatusCodeSame(429);
    }

    public function testUnsubscribeDeletesTheAddressAndExportLinksIt(): void
    {
        foreach (['a@example.com', 'b@example.com'] as $email) {
            $this->client->request('POST', '/list/confirm/'.$this->signUp($email));
        }
        $this->signUp('waiting@example.com');

        $app = new Application(static::$kernel);
        $export = new CommandTester($app->find('app:mailing-list:export'));
        $export->execute([]);
        $lines = array_values(array_filter(explode("\n", $export->getDisplay())));
        self::assertSame('email,confirmed_at,unsubscribe_url', $lines[0]);
        self::assertCount(3, $lines, 'unconfirmed addresses are not exported');
        self::assertMatchesRegularExpression('#^a@example\.com,\d{4}-\d\d-\d\dT[\d:]+Z,http://localhost/list/unsubscribe/[0-9a-f]{32}$#', $lines[1]);

        $url = substr($lines[1], strrpos($lines[1], ',') + 1);
        $this->client->request('GET', $url);
        self::assertSelectorTextContains('h1', 'Unsubscribe');
        self::assertSame(3, (int) $this->db()->fetchOne('SELECT COUNT(*) FROM subscriber'));
        // One-click unsubscribe (RFC 8058) posts straight to the link.
        $this->client->request('POST', $url, ['List-Unsubscribe' => 'One-Click']);
        self::assertResponseIsSuccessful();
        self::assertSelectorTextContains('h1', 'You are unsubscribed');
        self::assertSame(0, (int) $this->db()->fetchOne("SELECT COUNT(*) FROM subscriber WHERE email = 'a@example.com'"));
        $this->client->request('GET', $url);
        self::assertSelectorTextContains('h1', 'You are unsubscribed');
    }

    public function testUnconfirmedSignUpsAreDroppedAfterAWeek(): void
    {
        $this->signUp('late@example.com');
        $this->db()->executeStatement("UPDATE subscriber SET created_at = '2020-01-01 00:00:00'");
        $this->signUp('next@example.com');
        self::assertSame(['next@example.com'], $this->db()->fetchFirstColumn('SELECT email FROM subscriber'));
    }

    public function testStoreClicksAreCountedByOrigin(): void
    {
        $this->client->request('GET', '/go/steam?utm_source=Reddit&utm_medium=social&utm_campaign=launch%20day&ref=www.reddit.com');
        self::assertResponseRedirects('https://store.steampowered.com/app/1/Retracoon/', 302);
        $this->client->request('GET', '/go/steam', [], [], ['HTTP_REFERER' => 'https://news.ycombinator.com/item?id=1']);
        $this->client->request('GET', '/go/steam', [], [], ['HTTP_REFERER' => 'https://news.ycombinator.com/item?id=2']);
        // Own pages and bots are not a source / not counted.
        $this->client->request('GET', '/go/steam', [], [], ['HTTP_REFERER' => 'http://localhost/']);
        $this->client->request('GET', '/go/steam', [], [], ['HTTP_USER_AGENT' => 'Googlebot/2.1']);
        self::assertResponseRedirects();
        // A store without a link has no button and no redirect.
        $this->client->request('GET', '/go/app-store');
        self::assertResponseStatusCodeSame(404);

        $rows = $this->db()->fetchAllAssociative('SELECT target, source, utm_source, utm_medium, utm_campaign, hits FROM site_count ORDER BY hits DESC, source');
        self::assertSame([
            ['target' => 'steam', 'source' => 'news.ycombinator.com', 'utm_source' => '', 'utm_medium' => '', 'utm_campaign' => '', 'hits' => 2],
            ['target' => 'steam', 'source' => '', 'utm_source' => '', 'utm_medium' => '', 'utm_campaign' => '', 'hits' => 1],
            ['target' => 'steam', 'source' => 'reddit.com', 'utm_source' => 'reddit', 'utm_medium' => 'social', 'utm_campaign' => 'launch-day', 'hits' => 1],
        ], array_map(fn ($r) => array_merge($r, ['hits' => (int) $r['hits']]), $rows));
        self::assertSame([], $this->db()->fetchAllAssociative("SELECT * FROM site_count WHERE target = 'app-store'"));
    }

    public function testLandingVisitsAndStoreLinksCarryTheOrigin(): void
    {
        $container = static::getContainer();
        $request = Request::create('http://localhost/?utm_source=tiktok&utm_campaign=glowup', server: ['HTTP_USER_AGENT' => self::BROWSER, 'HTTP_REFERER' => 'https://www.tiktok.com/@retracoon']);
        $container->get(RequestStack::class)->push($request);
        $twig = $container->get('twig');
        $html = $twig->createTemplate("{% if store_live('steam') %}{{ store_link('steam') }}{% endif %}|{{ store_live('app-store') ? 'yes' : 'no' }}")->render();
        self::assertSame('/go/steam?ref=tiktok.com&amp;utm_source=tiktok&amp;utm_campaign=glowup|no', $html);

        // The landing page (/) is counted on its way out, whatever renders it.
        $dispatch = fn (Request $r, int $status) => $container->get('event_dispatcher')->dispatch(new ResponseEvent(static::$kernel, $r, HttpKernelInterface::MAIN_REQUEST, new Response('', $status)), KernelEvents::RESPONSE);
        $dispatch($request, 200);
        $dispatch($request, 200);
        $dispatch($request, 500);
        $dispatch(Request::create('http://localhost/wiki', server: ['HTTP_USER_AGENT' => self::BROWSER]), 200);
        self::assertSame([['target' => 'landing', 'source' => 'tiktok.com', 'hits' => 2]], array_map(fn ($r) => array_merge($r, ['hits' => (int) $r['hits']]), $this->db()->fetchAllAssociative('SELECT target, source, hits FROM site_count')));

        $this->client->request('GET', '/go/steam?ref=tiktok.com&utm_source=tiktok&utm_campaign=glowup');
        $report = $container->get(Stats::class)->report(7);
        $today = end($report['site']['days']);
        self::assertSame(['landing' => 2, 'google-play' => 0, 'app-store' => 0, 'steam' => 1], array_intersect_key($today, ['landing' => 0, 'google-play' => 0, 'app-store' => 0, 'steam' => 0]));
        self::assertSame([['source' => 'tiktok.com', 'utmSource' => 'tiktok', 'utmMedium' => '', 'utmCampaign' => 'glowup', 'visits' => 2, 'storeClicks' => 1]], $report['site']['sources']);
        self::assertSame(['confirmed' => 0, 'waiting' => 0], $report['mailingList']);

        $stats = new CommandTester((new Application(static::$kernel))->find('app:stats'));
        $stats->execute(['--days' => '3']);
        self::assertStringContainsString('tiktok.com', $stats->getDisplay());
        self::assertStringContainsString('Mailing list: 0 confirmed', $stats->getDisplay());
    }
}
