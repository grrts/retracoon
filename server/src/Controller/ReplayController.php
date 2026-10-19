<?php

namespace App\Controller;

use App\Service\Replays;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * For the replay job (tools/replay-worker.ts): runs waiting to be replayed, and their
 * results. Needs the header X-Replay-Key: <REPLAY_KEY>; 404 without it, or when no key
 * is set.
 */
#[Route('/api/admin/replays')]
final class ReplayController extends AbstractController
{
    public function __construct(private readonly Replays $replays)
    {
    }

    #[Route('', methods: ['GET'])]
    public function jobs(Request $request, #[MapQueryParameter] int $limit = 100): JsonResponse
    {
        $this->guard($request);

        return $this->json(['jobs' => $this->replays->jobs(max(1, min(500, $limit)))]);
    }

    #[Route('', methods: ['POST'])]
    public function results(Request $request): JsonResponse
    {
        $this->guard($request);
        $body = json_decode($request->getContent(), true);
        if (!\is_array($body) || !\is_array($body['results'] ?? null) || !array_is_list($body['results'])) {
            throw new BadRequestHttpException('Expected {"results": [...]}.');
        }

        return $this->json($this->replays->settle($body['results']));
    }

    private function guard(Request $request): void
    {
        if (!$this->replays->keyMatches($request->headers->get('X-Replay-Key'))) {
            throw new NotFoundHttpException();
        }
    }
}
