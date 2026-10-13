<?php

namespace App\Controller;

use App\Repository\DailyScoreRepository;
use App\Repository\PlayerRepository;
use App\Repository\SeasonScoreRepository;
use App\Service\Periods;
use App\Service\Present;
use App\Service\Prizes;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpKernel\Attribute\MapQueryParameter;
use Symfony\Component\HttpKernel\Exception\BadRequestHttpException;
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

    /**
     * A day's daily run board (today by default), plus yesterday's winner.
     */
    #[Route('/daily', methods: ['GET'])]
    public function daily(DailyScoreRepository $daily, Periods $periods, Prizes $prizes, #[MapQueryParameter] ?string $day = null, #[MapQueryParameter] int $limit = 50, #[MapQueryParameter] int $offset = 0): JsonResponse
    {
        $prizes->settle();
        $day ??= $periods->today();
        if (!Periods::isDay($day)) {
            throw new BadRequestHttpException('day is YYYY-MM-DD.');
        }
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);
        $yesterday = (new \DateTimeImmutable($periods->today()))->modify('-1 day')->format('Y-m-d');
        $last = $daily->winner($yesterday);
        $res = $this->json([
            'day' => $day,
            'endsAt' => $periods->dayEndsAt($day)->format(\DATE_ATOM),
            'prize' => Prizes::DAILY_GEMS,
            'total' => $daily->countDay($day),
            'offset' => $offset,
            'players' => Present::scores($daily->top($day, $limit, $offset), $offset),
            'lastWinner' => $last ? Present::daily($last, 1) : null,
        ]);

        return $res->setPublic()->setMaxAge(30);
    }

    /**
     * The current season's board (one UTC month), plus last season's winner.
     */
    #[Route('/season', methods: ['GET'])]
    public function season(SeasonScoreRepository $seasons, Periods $periods, Prizes $prizes, #[MapQueryParameter] ?string $season = null, #[MapQueryParameter] int $limit = 50, #[MapQueryParameter] int $offset = 0): JsonResponse
    {
        $prizes->settle();
        $season ??= $periods->season();
        if (!Periods::isSeason($season)) {
            throw new BadRequestHttpException('season is YYYY-MM.');
        }
        $limit = max(1, min(100, $limit));
        $offset = max(0, $offset);
        $prev = (new \DateTimeImmutable($season.'-01'))->modify('-1 month')->format('Y-m');
        $last = $seasons->winner($prev);
        $res = $this->json([
            'season' => $season,
            'endsAt' => $periods->seasonEndsAt($season)->format(\DATE_ATOM),
            'prize' => Prizes::SEASON_GEMS,
            'total' => $seasons->countSeason($season),
            'offset' => $offset,
            'players' => Present::scores($seasons->top($season, $limit, $offset), $offset),
            'lastWinner' => $last ? Present::season($last, 1) : null,
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
