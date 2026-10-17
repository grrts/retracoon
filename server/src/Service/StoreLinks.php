<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The store pages the site's buttons lead to, from env vars. An empty one means that
 * store is not live yet: hide its button.
 */
final class StoreLinks
{
    /** @var array<string, string> by store name, as in /go/{store} */
    private array $urls;

    public function __construct(
        #[Autowire('%env(default::STORE_GOOGLE_PLAY_URL)%')] ?string $googlePlay = null,
        #[Autowire('%env(default::STORE_APP_STORE_URL)%')] ?string $appStore = null,
        #[Autowire('%env(default::STORE_STEAM_URL)%')] ?string $steam = null,
    ) {
        $this->urls = ['google-play' => (string) $googlePlay, 'app-store' => (string) $appStore, 'steam' => (string) $steam];
    }

    /** The store's page, or '' when unknown or not set. */
    public function url(string $store): string
    {
        return $this->urls[$store] ?? '';
    }

    /** @return list<string> stores that have a link */
    public function live(): array
    {
        return array_keys(array_filter($this->urls, fn ($u) => '' !== $u));
    }
}
