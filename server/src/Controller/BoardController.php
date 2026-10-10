<?php

namespace App\Controller;

use App\Repository\PlayerRepository;
use App\Service\Present;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Public, read-only: the game and (later) the website both read these.
 */
#[Route('/api')]
final class BoardController extends AbstractController
{
    public function __construct(private readonly PlayerRepository $players)
    {
    }

    #[Route('/leaderboard', methods: ['GET'])]
    public function leaderboard(#[MapQueryParameter] int $limit = 50, #[MapQueryParameter] int $offset = 0): JsonResponse
    {
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);
        $res = $this->json([
            'total' => $this->players->countRanked(),
            'offset' => $offset,
            'players' => Present::board($this->players->top($limit, $offset), $offset),
        ]);

        return $res->setPublic()->setMaxAge(30);
    }

    #[Route('/players/{id}', methods: ['GET'], requirements: ['id' => '[0-9a-f]{16}'])]
    public function player(string $id): JsonResponse
    {
        $p = $this->players->find($id) ?? throw $this->createNotFoundException('No such player.');

        return $this->json(['player' => Present::row($p, $this->players->rankOf($p))]);
    }

    #[Route('/health', methods: ['GET'])]
    public function health(): JsonResponse
    {
        return $this->json(['ok' => true]);
    }
}
