<?php

namespace App\Controller;

use App\Dto\EventBatch;
use App\Entity\PlayEvent;
use App\Service\Periods;
use App\Service\Stats;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Gameplay tracking. The game batches events (app opened, run started and ended,
 * tutorial done, ...) under a random install id and posts them here, guests included.
 * Nothing here is tied to a player account. Read the numbers with `app:stats` or
 * GET /api/stats with the X-Stats-Key header.
 */
#[Route('/api')]
final class EventController extends AbstractController
{
    private const NAMES = ['app_open', 'tutorial_done', 'run_start', 'run_end', 'area_reached', 'boss_beaten', 'level_up', 'sign_in', 'purchase', 'shop_open', 'scores_open'];

    public function __construct(private readonly EntityManagerInterface $em, private readonly Periods $periods)
    {
    }

    #[Route('/events', methods: ['POST'])]
    public function ingest(#[MapRequestPayload] EventBatch $batch, Request $request, RateLimiterFactoryInterface $eventsLimiter): Response
    {
        if (!$eventsLimiter->create($request->getClientIp() ?? 'none')->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $now = $this->periods->now();
        $oldest = $now->modify('-30 days');
        foreach ($batch->events as $e) {
            $name = \is_array($e) ? ($e['name'] ?? null) : null;
            if (!\is_string($name) || !\in_array($name, self::NAMES, true)) {
                continue;
            }
            // Device clocks can be off: keep the order, never the future or the far past.
            $ms = \is_int($e['at'] ?? null) ? $e['at'] : null;
            $at = null !== $ms ? (new \DateTimeImmutable('@'.intdiv($ms, 1000)))->setTimezone(new \DateTimeZone('UTC')) : $now;
            $at = min($now, max($oldest, $at));
            $this->em->persist(new PlayEvent($batch->device, $name, self::props($e['props'] ?? []), $batch->platform, $batch->version, $at, $now));
        }
        $this->em->flush();

        return new Response(null, 204);
    }

    /** Retention and play numbers for the last days, for the developer. */
    #[Route('/stats', methods: ['GET'])]
    public function stats(Request $request, Stats $stats, #[Autowire('%env(default::STATS_KEY)%')] ?string $key = null, #[MapQueryParameter] int $days = 14): JsonResponse
    {
        if (!$key || !hash_equals($key, (string) $request->headers->get('X-Stats-Key'))) {
            throw new NotFoundHttpException();
        }

        return $this->json($stats->report(max(1, min(90, $days))));
    }

    /**
     * Only flat, small values: at most 12 keys, strings cut to 40 characters.
     *
     * @return array<string, scalar|null>
     */
    private static function props(mixed $props): array
    {
        if (!\is_array($props)) {
            return [];
        }
        $out = [];
        foreach ($props as $k => $v) {
            if (\count($out) >= 12 || !\is_string($k) || !preg_match('/^[a-z_]{1,24}$/', $k)) {
                continue;
            }
            if (\is_string($v)) {
                $out[$k] = mb_substr($v, 0, 40);
            } elseif (\is_int($v) || \is_float($v) || \is_bool($v) || null === $v) {
                $out[$k] = $v;
            }
        }

        return $out;
    }
}
