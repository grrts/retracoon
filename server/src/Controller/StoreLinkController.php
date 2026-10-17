<?php

namespace App\Controller;

use App\Service\SiteCounter;
use App\Service\StoreLinks;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\RedirectResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Store buttons on the site link here (build the link with store_link() in Twig), so a
 * click is counted with the visit's referring site and UTM tags before going to the store.
 */
final class StoreLinkController extends AbstractController
{
    #[Route('/go/{store}', name: 'store_go', methods: ['GET'], format: 'html')]
    public function go(string $store, Request $request, StoreLinks $links, SiteCounter $counter): RedirectResponse
    {
        $url = $links->url($store);
        if ('' === $url) {
            throw new NotFoundHttpException();
        }
        $counter->count($request, $store);

        return new RedirectResponse($url, 302, ['Cache-Control' => 'no-store', 'X-Robots-Tag' => 'noindex']);
    }
}
