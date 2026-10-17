<?php

namespace App\Tests;

use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Tools\SchemaTool;
use Symfony\Bundle\FrameworkBundle\KernelBrowser;
use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

final class RunShareTest extends WebTestCase
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

    private function signIn(string $name): string
    {
        return $this->call('POST', '/api/auth', ['provider' => 'google', 'credential' => 'ok:'.$name, 'name' => $name], expect: 201)['token'];
    }

    /** A real, blank PNG of the given size. */
    private static function png(int $w, int $h): string
    {
        $chunk = static fn (string $type, string $data) => pack('N', \strlen($data)).$type.$data.pack('N', crc32($type.$data));
        $rows = str_repeat("\0".str_repeat("\0", $w), $h);

        return "\x89PNG\r\n\x1a\n"
            .$chunk('IHDR', pack('NNCCCCC', $w, $h, 8, 0, 0, 0, 0))
            .$chunk('IDAT', (string) gzcompress($rows))
            .$chunk('IEND', '');
    }

    /** @return array<string, mixed> */
    private function body(array $over = []): array
    {
        return $over + [
            'mode' => 'daily',
            'day' => '2026-10-16',
            'reason' => 'death',
            'stage' => 23,
            'area' => 4,
            'level' => 12,
            'theme' => 'swamp',
            'themeName' => 'MURKY SWAMP',
            'killer' => 'FERAL OLD GATOR',
            'killerId' => 'gator',
            'gear' => [
                ['slot' => 'head', 'id' => 'tin_crown', 'name' => 'TIN CROWN', 'rarity' => 4, 'lvl' => 2],
                ['slot' => 'paw', 'id' => 'stick', 'name' => 'POINTY STICK', 'rarity' => 0, 'lvl' => 1],
            ],
            'card' => base64_encode(self::png(1200, 630)),
        ];
    }

    public function testSharedRunGetsAPageWithItsCardAsLinkPreview(): void
    {
        $token = $this->signIn('LEROY');
        $r = $this->call('POST', '/api/runs', $this->body(), $token, 201);
        self::assertMatchesRegularExpression('/^[A-Za-z0-9]{8}$/', $r['id']);
        self::assertSame('http://localhost/r/'.$r['id'], $r['url']);

        $this->client->request('GET', '/r/'.$r['id']);
        $res = $this->client->getResponse();
        self::assertSame(200, $res->getStatusCode());
        self::assertStringContainsString('text/html', (string) $res->headers->get('Content-Type'));
        $html = (string) $res->getContent();
        self::assertStringContainsString('<meta property="og:image" content="http://localhost/r/'.$r['id'].'.png">', $html);
        self::assertStringContainsString('<meta name="twitter:card" content="summary_large_image">', $html);
        self::assertStringContainsString('reached stage 23 on the 16 Oct daily run', $html);
        self::assertStringContainsString('Beaten by the <a href="/wiki/foes/gator">Feral Old Gator</a>', $html);
        self::assertStringContainsString('href="/wiki/items/tin_crown" style="color:#ffa300">TIN CROWN</a>', $html);
        self::assertStringContainsString('href="/wiki/areas/swamp"', $html);
        self::assertStringContainsString("Play today's daily", $html);

        $this->client->request('GET', '/r/'.$r['id'].'.png');
        $img = $this->client->getResponse();
        self::assertSame(200, $img->getStatusCode());
        self::assertSame('image/png', $img->headers->get('Content-Type'));
        self::assertSame(self::png(1200, 630), $img->getContent());
    }

    public function testRetreatsHaveNoKillerAndTextIsEscaped(): void
    {
        $token = $this->signIn('LEROY');
        $r = $this->call('POST', '/api/runs', $this->body(['mode' => 'normal', 'reason' => 'retreat']), $token, 201);
        $this->client->request('GET', '/r/'.$r['id']);
        $html = (string) $this->client->getResponse()->getContent();
        self::assertStringContainsString("LEROY#", $html);
        self::assertStringContainsString("'s raccoon reached stage 23", str_replace('&apos;', "'", $html));
        self::assertStringContainsString('Retreated in time', $html);
        self::assertStringNotContainsString('Gator', $html);

        $r = $this->call('POST', '/api/runs', $this->body(['killer' => 'POISON', 'killerId' => null]), $token, 201);
        $this->client->request('GET', '/r/'.$r['id']);
        self::assertStringContainsString('Taken out by Poison', (string) $this->client->getResponse()->getContent());

        $this->call('POST', '/api/runs', $this->body(['killer' => '<script>']), $token, 422);
        $this->call('POST', '/api/runs', $this->body(['gear' => [['slot' => 'head', 'id' => 'x', 'name' => '"><b>', 'rarity' => 1, 'lvl' => 1]]]), $token, 422);
    }

    public function testOnlySignedInPlayersWithARealCard(): void
    {
        $this->call('POST', '/api/runs', $this->body(), expect: 401);
        $token = $this->signIn('LEROY');
        $this->call('POST', '/api/runs', $this->body(['card' => base64_encode(self::png(600, 315))]), $token, 422);
        $this->call('POST', '/api/runs', $this->body(['card' => base64_encode('GIF89a not a png')]), $token, 422);
        $this->call('POST', '/api/runs', $this->body(['card' => '%%% not base64']), $token, 422);
        $this->call('POST', '/api/runs', $this->body(['mode' => 'best']), $token, 422);
    }

    public function testMissingRunsAndDeletedAccounts(): void
    {
        $this->client->request('GET', '/r/abcdEFGH');
        self::assertSame(404, $this->client->getResponse()->getStatusCode());
        self::assertStringContainsString('Run not found', (string) $this->client->getResponse()->getContent());

        $token = $this->signIn('LEROY');
        $r = $this->call('POST', '/api/runs', $this->body(), $token, 201);
        $this->client->request('DELETE', '/api/me', [], [], ['HTTP_AUTHORIZATION' => 'Bearer '.$token]);
        self::assertSame(204, $this->client->getResponse()->getStatusCode());
        $this->client->request('GET', '/r/'.$r['id']);
        self::assertSame(404, $this->client->getResponse()->getStatusCode());
    }
}
