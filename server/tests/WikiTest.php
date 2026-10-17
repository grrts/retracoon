<?php

namespace App\Tests;

use App\Service\Wiki;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

/**
 * The content wiki: every page renders, for every piece of content the export holds.
 */
final class WikiTest extends WebTestCase
{
    private KernelBrowser $client;

    protected function setUp(): void
    {
        $this->client = static::createClient();
    }

    public function testListPagesRenderAsHtml(): void
    {
        foreach (['/wiki', '/wiki/items', '/wiki/items?slot=head&rarity=4', '/wiki/items?tag=crit&risky=1', '/wiki/sets', '/wiki/skills',
            '/wiki/skills?kind=stat&stat=lck', '/wiki/passives', '/wiki/foes', '/wiki/areas', '/wiki/events', '/wiki/skins', '/wiki/search?q=rat'] as $url) {
            $this->client->request('GET', $url);
            self::assertResponseIsSuccessful($url);
            self::assertResponseHeaderSame('Content-Type', 'text/html; charset=UTF-8');
        }
        self::assertSelectorExists('a[href="/wiki/foes/rat"]');
    }

    public function testEveryEntryHasAPage(): void
    {
        $wiki = static::getContainer()->get(Wiki::class);
        foreach (['items' => 'items', 'sets' => 'sets', 'skills' => 'skills', 'foes' => 'enemies', 'areas' => 'areas'] as $path => $kind) {
            foreach ($wiki->all($kind) as $x) {
                $this->client->request('GET', "/wiki/$path/{$x['id']}");
                self::assertResponseIsSuccessful("/wiki/$path/{$x['id']}");
            }
        }
    }

    public function testSpritesPointAtTheSheets(): void
    {
        $this->client->request('GET', '/wiki/items/ronin_kabuto');
        self::assertSelectorTextContains('h1', 'RONIN KABUTO');
        self::assertStringContainsString('/wiki-sprites/items.png?v=', (string) $this->client->getResponse()->getContent());
        foreach (['items', 'icons', 'foes', 'events', 'skins'] as $sheet) {
            self::assertFileExists(__DIR__."/../public/wiki-sprites/$sheet.png");
        }
    }

    public function testUnknownEntryIsNotFound(): void
    {
        $this->client->request('GET', '/wiki/items/no_such_item');
        self::assertResponseStatusCodeSame(404);
    }

    public function testApiStillAnswersInJson(): void
    {
        $this->client->request('GET', '/api/health');
        self::assertResponseHeaderSame('Content-Type', 'application/json');
    }
}
