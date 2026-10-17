<?php

namespace App\Twig;

use App\Service\SiteCounter;
use App\Service\StoreLinks;
use Symfony\Component\HttpFoundation\RequestStack;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Store buttons for the site's pages:
 *   {% if store_live('steam') %}<a href="{{ store_link('steam') }}">Wishlist on Steam</a>{% endif %}
 */
final class SiteExtension extends AbstractExtension
{
    public function __construct(private readonly StoreLinks $links, private readonly RequestStack $requests, private readonly UrlGeneratorInterface $urls)
    {
    }

    public function getFunctions(): array
    {
        return [new TwigFunction('store_live', $this->live(...)), new TwigFunction('store_link', $this->link(...))];
    }

    /** Whether the store ('google-play', 'app-store' or 'steam') has a link configured. */
    public function live(string $store): bool
    {
        return '' !== $this->links->url($store);
    }

    /** The counted link for a store button, carrying this visit's referring site and UTM tags. */
    public function link(string $store): string
    {
        $request = $this->requests->getMainRequest();
        $origin = $request ? array_filter(SiteCounter::origin($request), fn ($v) => '' !== $v) : [];

        return $this->urls->generate('store_go', ['store' => $store] + $origin);
    }
}
