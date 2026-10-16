<?php

namespace App\Controller;

use App\Dto\RunShare;
use App\Entity\Player;
use App\Entity\SharedRun;
use App\Repository\SharedRunRepository;
use App\Service\Periods;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

/**
 * Shared runs: the game uploads the card it drew at the end of a run, and the run gets
 * a public page at /r/{id} whose link preview (Open Graph) is that card.
 */
final class RunController extends AbstractController
{
    public const CARD_W = 1200;
    public const CARD_H = 630;
    private const ID = '[A-Za-z0-9]{8}';
    private const RARITY = ['#94b0c2', '#38b764', '#41a6f6', '#b05ccf', '#ffa300'];

    public function __construct(
        private readonly SharedRunRepository $runs,
        #[Autowire('%env(STORE_GOOGLE_PLAY_URL)%')] private readonly string $googlePlay,
        #[Autowire('%env(STORE_APP_STORE_URL)%')] private readonly string $appStore,
        #[Autowire('%env(STORE_STEAM_URL)%')] private readonly string $steam,
    ) {
    }

    #[Route('/api/runs', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function share(#[CurrentUser] Player $me, #[MapRequestPayload] RunShare $in, Request $request, RateLimiterFactoryInterface $shareLimiter, EntityManagerInterface $em, Periods $periods): JsonResponse
    {
        if (!$shareLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $png = base64_decode($in->card, true);
        $size = false !== $png && str_starts_with($png, "\x89PNG\r\n\x1a\n") ? @getimagesizefromstring($png) : false;
        if (!$size || \IMAGETYPE_PNG !== $size[2] || self::CARD_W !== $size[0] || self::CARD_H !== $size[1]) {
            throw new UnprocessableEntityHttpException(\sprintf('The card must be a %dx%d PNG.', self::CARD_W, self::CARD_H));
        }
        $gear = array_map(fn (array $g) => ['slot' => $g['slot'], 'id' => $g['id'], 'name' => $g['name'], 'rarity' => $g['rarity'], 'lvl' => $g['lvl']], $in->gear);
        do {
            $id = self::randomId();
        } while (null !== $this->runs->find($id));
        $run = new SharedRun($id, $me, $in->mode, 'daily' === $in->mode ? $in->day : null, $in->reason, $in->stage, $in->area, $in->level, $in->theme, $in->themeName, 'death' === $in->reason ? $in->killer : null, 'death' === $in->reason ? $in->killerId : null, $gear, $png, $periods->now());
        $em->persist($run);
        $em->flush();

        return $this->json(['id' => $id, 'url' => $request->getSchemeAndHttpHost().'/r/'.$id], 201);
    }

    #[Route('/r/{id}.png', methods: ['GET'], requirements: ['id' => self::ID])]
    public function card(string $id): Response
    {
        $run = $this->runs->find($id) ?? throw $this->createNotFoundException();
        $res = new Response($run->getCard(), 200, ['Content-Type' => 'image/png']);
        $res->setPublic();
        $res->setMaxAge(31536000);
        $res->headers->addCacheControlDirective('immutable');

        return $res;
    }

    #[Route('/r/{id}', methods: ['GET'], requirements: ['id' => self::ID], format: 'html')]
    public function page(string $id, Request $request): Response
    {
        $run = $this->runs->find($id);
        if (!$run) {
            return new Response($this->layout('Run not found', '', '<h1>Run not found</h1><p>This run was deleted, or the link is wrong.</p>'.$this->stores()), 404, ['Content-Type' => 'text/html; charset=utf-8']);
        }
        $h = static fn (string $s) => htmlspecialchars($s, \ENT_QUOTES | \ENT_HTML5);
        $p = $run->getPlayer();
        $who = $p->getName().'#'.$p->getTag();
        $daily = 'daily' === $run->getMode();
        $title = $daily
            ? \sprintf("%s reached stage %d on the %s daily run", $who, $run->getStage(), self::shortDay((string) $run->getDay()))
            : \sprintf("%s's raccoon reached stage %d", $who, $run->getStage());
        $killer = $run->getKiller();
        // Foes "beat" you (like the game's share line); hazards and statuses "take you out".
        $by = null !== $run->getKillerId() ? 'Beaten by the ' : 'Taken out by ';
        $killerName = null !== $killer ? self::nice(preg_replace('/^THE /', '', $killer) ?? $killer) : '';
        $end = 'retreat' === $run->getReason() ? 'Retreated in time.' : (null !== $killer ? $by.$killerName.'.' : 'Wiped out.');
        $desc = \sprintf('Area %d (%s), level %d. %s', $run->getArea(), self::nice($run->getThemeName()), $run->getLevel(), $end);
        $base = $request->getSchemeAndHttpHost();
        $url = $base.'/r/'.$id;
        $img = $url.'.png';

        $endHtml = 'retreat' === $run->getReason()
            ? 'Retreated in time'
            : (null === $killer ? 'Wiped out' : $by.(null !== $run->getKillerId()
                ? '<a href="/wiki/foes/'.$h($run->getKillerId()).'">'.$h($killerName).'</a>'
                : $h($killerName)));
        $gear = '';
        foreach ($run->getGear() as $g) {
            $color = self::RARITY[$g['rarity']] ?? self::RARITY[0];
            $gear .= \sprintf('<li><span class="slot">%s</span> <a href="/wiki/items/%s" style="color:%s">%s</a>%s</li>', $h(strtoupper($g['slot'])), $h($g['id']), $color, $h($g['name']), $g['lvl'] > 1 ? ' <span class="lvl">LV '.$g['lvl'].'</span>' : '');
        }
        $gear = '' !== $gear ? '<h2>Loadout</h2><ul class="gear">'.$gear.'</ul>' : '<h2>Loadout</h2><p>No gear. Brave.</p>';
        $body = '<h1>'.$h($title).'</h1>'
            .'<img class="card" src="/r/'.$h($id).'.png" width="1200" height="630" alt="'.$h($title.'. '.$desc).'">'
            .'<dl class="stats">'
            .'<div><dt>Stage</dt><dd>'.$run->getStage().'</dd></div>'
            .'<div><dt>Area</dt><dd>'.$run->getArea().' <a href="/wiki/areas/'.$h($run->getTheme()).'">'.$h(self::nice($run->getThemeName())).'</a></dd></div>'
            .'<div><dt>Level</dt><dd>'.$run->getLevel().'</dd></div>'
            .'<div><dt>End</dt><dd>'.$endHtml.'</dd></div>'
            .'</dl>'
            .$gear
            .$this->stores();
        $meta = implode("\n", [
            '<meta name="description" content="'.$h($desc).'">',
            '<meta property="og:type" content="website">',
            '<meta property="og:site_name" content="Retracoon">',
            '<meta property="og:title" content="'.$h($title).'">',
            '<meta property="og:description" content="'.$h($desc).'">',
            '<meta property="og:url" content="'.$h($url).'">',
            '<meta property="og:image" content="'.$h($img).'">',
            '<meta property="og:image:type" content="image/png">',
            '<meta property="og:image:width" content="'.self::CARD_W.'">',
            '<meta property="og:image:height" content="'.self::CARD_H.'">',
            '<meta property="og:image:alt" content="'.$h($title).'">',
            '<meta name="twitter:card" content="summary_large_image">',
            '<meta name="twitter:title" content="'.$h($title).'">',
            '<meta name="twitter:description" content="'.$h($desc).'">',
            '<meta name="twitter:image" content="'.$h($img).'">',
            '<link rel="canonical" href="'.$h($url).'">',
        ]);
        $res = new Response($this->layout($title.' · Retracoon', $meta, $body), 200, ['Content-Type' => 'text/html; charset=utf-8']);
        $res->setPublic();
        $res->setMaxAge(300);

        return $res;
    }

    /** "Play today's daily": the store buttons that are set up (there is no web play). */
    private function stores(): string
    {
        $links = '';
        foreach (['Google Play' => $this->googlePlay, 'App Store' => $this->appStore, 'Steam' => $this->steam] as $name => $href) {
            if (str_starts_with($href, 'https://')) {
                $links .= '<a class="btn" href="'.htmlspecialchars($href, \ENT_QUOTES | \ENT_HTML5).'">'.$name.'</a>';
            }
        }
        $lead = '<p>Retracoon is an 8-bit roguelike about a raccoon on a road that never ends. Everyone gets the same road on the daily run. How far can you get?</p>';

        return '<section class="play"><h2>Play today\'s daily</h2>'.$lead.('' !== $links ? '<p class="btns">'.$links.'</p>' : '').'</section>';
    }

    private function layout(string $title, string $meta, string $body): string
    {
        $title = htmlspecialchars($title, \ENT_QUOTES | \ENT_HTML5);

        return <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>$title</title>
$meta
<style>
body{font:16px/1.5 system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;background:#1a1c2c;color:#f4f4f4}
a{color:#73eff7}h1{color:#ffcd75;font-size:1.4em;line-height:1.3}h2{color:#ffcd75;font-size:1.1em;margin-top:1.6em}
.card{display:block;width:100%;height:auto;image-rendering:pixelated;border:4px solid #3b5dc9;box-sizing:border-box}
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin:16px 0}
.stats div{background:#29366f;padding:8px 12px}.stats dt{color:#94b0c2;font-size:.8em;text-transform:uppercase}.stats dd{margin:0;font-weight:700}
.gear{list-style:none;padding:0}.gear li{padding:4px 0;border-bottom:1px solid #333c57}.slot{display:inline-block;width:4.5em;color:#94b0c2;font-size:.8em}.lvl{color:#ffcd75;font-size:.8em}
.btns{display:flex;flex-wrap:wrap;gap:8px}.btn{background:#38b764;color:#1a1c2c;padding:10px 16px;font-weight:700;text-decoration:none;border:2px solid #a7f070}
</style>
</head><body>
$body
</body></html>
HTML;
    }

    /** Content names are upper case in the game's pixel font; "SWAMP KING" reads as "Swamp King". */
    private static function nice(string $s): string
    {
        return ucwords(strtolower($s), " -/(");
    }

    private static function shortDay(string $day): string
    {
        $d = \DateTimeImmutable::createFromFormat('!Y-m-d', $day);

        return $d ? $d->format('j M') : $day;
    }

    private static function randomId(): string
    {
        $abc = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        $id = '';
        for ($i = 0; $i < 8; ++$i) {
            $id .= $abc[random_int(0, \strlen($abc) - 1)];
        }

        return $id;
    }
}
