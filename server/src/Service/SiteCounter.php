<?php

namespace App\Service;

use Doctrine\DBAL\Connection;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;

/**
 * Counts landing page visits and store button clicks per day, referring site and UTM
 * tags, as plain counters (table site_count). Nothing about the visitor is stored; the
 * IP address is only used, in memory, to keep one address from inflating the numbers.
 */
final class SiteCounter
{
    private const BOTS = '/bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|whatsapp|telegram|discord|curl|wget|python|java\/|go-http|headless|lighthouse|monitor/i';

    public function __construct(
        private readonly Connection $db,
        private readonly Periods $periods,
        #[Autowire(service: 'limiter.site')] private readonly RateLimiterFactoryInterface $limiter,
    ) {
    }

    /**
     * Counts one hit on $target ('landing' or a store) for this request. The referring site
     * comes from the ref query parameter (passed along by store_link() so a click keeps the
     * visit's origin), else the Referer header; the UTM tags from the query string.
     */
    public function count(Request $request, string $target): void
    {
        $agent = (string) $request->headers->get('User-Agent');
        if ('' === $agent || preg_match(self::BOTS, $agent)) {
            return;
        }
        if (!$this->limiter->create($request->getClientIp() ?? 'none')->consume()->isAccepted()) {
            return;
        }
        $key = self::origin($request);
        $this->db->executeStatement(
            'INSERT INTO site_count (day, target, source, utm_source, utm_medium, utm_campaign, hits) VALUES (?, ?, ?, ?, ?, ?, 1)
             ON CONFLICT (day, target, source, utm_source, utm_medium, utm_campaign) DO UPDATE SET hits = site_count.hits + 1',
            [$this->periods->today(), $target, $key['ref'], $key['utm_source'], $key['utm_medium'], $key['utm_campaign']],
        );
    }

    /**
     * Where this visit came from, cleaned: the referring host (own site and none give '')
     * and the UTM tags. Also what store_link() passes on to /go/{store}.
     *
     * @return array{ref: string, utm_source: string, utm_medium: string, utm_campaign: string}
     */
    public static function origin(Request $request): array
    {
        $ref = $request->query->get('ref');
        $host = \is_string($ref) ? $ref : (parse_url((string) $request->headers->get('Referer'), \PHP_URL_HOST) ?: '');
        $host = preg_replace('/^www\./', '', strtolower($host));
        if (!preg_match('/^[a-z0-9.-]{1,64}$/', $host) || $host === preg_replace('/^www\./', '', strtolower($request->getHost()))) {
            $host = '';
        }
        $tag = function (string $name) use ($request): string {
            $v = $request->query->get($name);

            return \is_string($v) ? substr(preg_replace('/[^a-z0-9._-]+/', '-', strtolower(trim($v))), 0, 40) : '';
        };

        return ['ref' => $host, 'utm_source' => $tag('utm_source'), 'utm_medium' => $tag('utm_medium'), 'utm_campaign' => $tag('utm_campaign')];
    }
}
