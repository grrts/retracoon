<?php

namespace App\Controller;

use App\Repository\DailyScoreRepository;
use App\Service\Periods;
use App\Service\Present;
use App\Service\StoreLinks;
use App\Service\Wiki;
use Psr\Log\LoggerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The website around the wiki: the landing page, the privacy policy and the press kit.
 * Server-rendered Twig, no JavaScript. Store buttons come from env vars and are hidden
 * while empty.
 */
#[Route(format: 'html')]
final class SiteController extends AbstractController
{
    /** The press kit's download folders in public/downloads/, in page order. */
    private const PRESS = [
        'raccoons' => 'Raccoon renders (transparent, 12x)',
        'capsules' => 'Steam capsules and logo',
        'screenshots' => 'Gameplay screenshots (1920x1080, no text)',
        'video' => 'Clips (silent)',
    ];

    public function __construct(
        private readonly Wiki $wiki,
        private readonly StoreLinks $stores,
        #[Autowire('%kernel.project_dir%/public')] private readonly string $public,
        /** @var list<array{quote: string, source: string, url?: string}> */
        #[Autowire('%site.press_quotes%')] private readonly array $quotes = [],
    ) {
    }

    #[Route('/', name: 'home', methods: ['GET'])]
    public function home(DailyScoreRepository $daily, Periods $periods, LoggerInterface $logger): Response
    {
        // The page is marketing first: if the database is down it still renders, without the board.
        $board = null;
        try {
            $today = $periods->today();
            $yesterday = (new \DateTimeImmutable($today))->modify('-1 day')->format('Y-m-d');
            $last = $daily->winner($yesterday);
            $board = [
                'day' => $today,
                'total' => $daily->countDay($today),
                'players' => Present::scores($daily->top($today, 5)),
                'lastWinner' => $last ? Present::daily($last, 1) : null,
            ];
        } catch (\Throwable $e) {
            $logger->warning('Landing page board unavailable: {error}', ['error' => $e->getMessage()]);
        }

        $rare = $this->wiki->where('items', fn ($i) => $i['rarity'] >= 3);

        $res = $this->page('site/home.html.twig', [
            'board' => $board,
            'item' => $rare ? $rare[array_rand($rare)] : null,
            'counts' => $this->counts(),
            // The trailer shows once tools/site-media.sh has put it in public/site/.
            'trailer' => is_file("$this->public/site/trailer.mp4"),
            'quotes' => $this->quotes,
        ]);

        return $res->setPublic()->setMaxAge(60);
    }

    #[Route('/privacy', name: 'privacy', methods: ['GET'])]
    public function privacy(): Response
    {
        return $this->page('site/privacy.html.twig')->setPublic()->setMaxAge(3600);
    }

    #[Route('/press', name: 'press', methods: ['GET'])]
    public function press(): Response
    {
        $groups = [];
        foreach (self::PRESS as $dir => $label) {
            $files = [];
            foreach (glob("$this->public/downloads/$dir/*") ?: [] as $path) {
                $files[] = ['name' => basename($path), 'url' => "/downloads/$dir/".basename($path), 'size' => filesize($path), 'image' => str_ends_with($path, '.png') || str_ends_with($path, '.gif')];
            }
            if ($files) {
                $groups[] = ['label' => $label, 'dir' => $dir, 'files' => $files];
            }
        }

        return $this->page('site/press.html.twig', ['groups' => $groups, 'counts' => $this->counts()])->setPublic()->setMaxAge(3600);
    }

    /** @return array<string, int> */
    private function counts(): array
    {
        return [
            'items' => \count($this->wiki->all('items')),
            'sets' => \count($this->wiki->all('sets')),
            'skills' => \count($this->wiki->all('skills')),
            'areas' => \count($this->wiki->all('areas')),
            'skins' => \count($this->wiki->all('skins')),
        ];
    }

    /** @param array<string, mixed> $vars */
    private function page(string $template, array $vars = []): Response
    {
        return $this->render($template, $vars + ['stores' => $this->stores->live()]);
    }
}
