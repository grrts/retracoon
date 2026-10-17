<?php

namespace App\EventListener;

use App\Service\SiteCounter;
use Symfony\Component\EventDispatcher\Attribute\AsEventListener;
use Symfony\Component\HttpKernel\Event\ResponseEvent;
use Symfony\Component\HttpKernel\KernelEvents;

/**
 * Counts every successful page view of the landing page (/) in the site counters, so the
 * landing page itself needs no tracking code.
 */
#[AsEventListener(event: KernelEvents::RESPONSE)]
final class LandingVisitListener
{
    public function __construct(private readonly SiteCounter $counter)
    {
    }

    public function __invoke(ResponseEvent $event): void
    {
        $request = $event->getRequest();
        if ($event->isMainRequest() && $request->isMethod('GET') && '/' === $request->getPathInfo() && $event->getResponse()->isSuccessful()) {
            $this->counter->count($request, 'landing');
        }
    }
}
