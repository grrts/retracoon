<?php

namespace App\Controller;

use App\Service\Wiki;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * The content wiki: every item, set, skill, passive, foe, area, road event and skin in
 * the game, generated from the game's own content files (see App\Service\Wiki).
 */
#[Route('/wiki', format: 'html')]
final class WikiController extends AbstractController
{
    public function __construct(private readonly Wiki $wiki)
    {
    }

    #[Route('', name: 'wiki', methods: ['GET'])]
    public function home(): Response
    {
        $count = fn (string $k) => \count($this->wiki->all($k));

        return $this->page('wiki/home.html.twig', [
            'counts' => [
                'items' => $count('items'), 'sets' => $count('sets'), 'skills' => $count('skills'), 'passives' => $count('passives'),
                'foes' => $count('enemies'), 'areas' => $count('areas'), 'events' => $count('events'), 'skins' => $count('skins'),
            ],
            'bosses' => $this->wiki->where('enemies', fn ($e) => $e['boss']),
        ]);
    }

    #[Route('/search', name: 'wiki_search', methods: ['GET'])]
    public function search(Request $request): Response
    {
        $q = (string) $request->query->get('q', '');

        return $this->page('wiki/search.html.twig', ['q' => $q, 'hits' => $this->wiki->search($q)]);
    }

    #[Route('/items', name: 'wiki_items', methods: ['GET'])]
    public function items(Request $request): Response
    {
        $slot = (string) $request->query->get('slot', '');
        $rarity = $request->query->get('rarity');
        $tag = (string) $request->query->get('tag', '');
        $risky = $request->query->getBoolean('risky');
        $list = $this->wiki->where('items', fn ($i) => ('' === $slot || $i['slot'] === $slot)
            && (null === $rarity || '' === $rarity || $i['rarity'] === (int) $rarity)
            && ('' === $tag || \in_array($tag, $i['tags'], true))
            && (!$risky || $i['risky']));
        usort($list, fn ($a, $b) => [$a['rarity'], $a['name']] <=> [$b['rarity'], $b['name']]);

        return $this->page('wiki/items.html.twig', [
            'items' => $list,
            'filter' => ['slot' => $slot, 'rarity' => $rarity ?? '', 'tag' => $tag, 'risky' => $risky],
        ]);
    }

    #[Route('/items/{id}', name: 'wiki_item', methods: ['GET'])]
    public function item(string $id): Response
    {
        $item = $this->find('items', $id);
        $set = $item['set'] ? $this->wiki->get('sets', $item['set']) : null;

        return $this->page('wiki/item.html.twig', ['item' => $item, 'set' => $set, 'pieces' => $set ? $this->pieces($set) : []]);
    }

    #[Route('/sets', name: 'wiki_sets', methods: ['GET'])]
    public function sets(): Response
    {
        $sets = array_map(fn ($s) => $s + ['items' => $this->pieces($s)], $this->wiki->all('sets'));

        return $this->page('wiki/sets.html.twig', ['sets' => $sets]);
    }

    #[Route('/sets/{id}', name: 'wiki_set', methods: ['GET'])]
    public function set(string $id): Response
    {
        $set = $this->find('sets', $id);

        return $this->page('wiki/set.html.twig', ['set' => $set, 'pieces' => $this->pieces($set)]);
    }

    #[Route('/skills', name: 'wiki_skills', methods: ['GET'])]
    public function skills(Request $request): Response
    {
        $kind = (string) $request->query->get('kind', '');
        $stat = (string) $request->query->get('stat', '');
        $list = $this->wiki->where('skills', fn ($s) => ('' === $kind || $s['kind'] === $kind)
            && ('' === $stat || ($s['req']['stat'] ?? null) === $stat));
        usort($list, fn ($a, $b) => [$a['req']['level'] ?? 0, $a['req']['min'] ?? 0, $a['name']] <=> [$b['req']['level'] ?? 0, $b['req']['min'] ?? 0, $b['name']]);

        return $this->page('wiki/skills.html.twig', ['skills' => $list, 'filter' => ['kind' => $kind, 'stat' => $stat]]);
    }

    #[Route('/skills/{id}', name: 'wiki_skill', methods: ['GET'])]
    public function skill(string $id): Response
    {
        return $this->page('wiki/skill.html.twig', ['skill' => $this->find('skills', $id)]);
    }

    #[Route('/passives', name: 'wiki_passives', methods: ['GET'])]
    public function passives(): Response
    {
        return $this->page('wiki/passives.html.twig', ['passives' => $this->wiki->all('passives')]);
    }

    #[Route('/foes', name: 'wiki_foes', methods: ['GET'])]
    public function foes(): Response
    {
        $byFamily = [];
        foreach ($this->wiki->all('enemies') as $e) {
            $byFamily[$e['boss'] ? 'bosses' : ($e['family'] ?? 'other')][] = $e;
        }

        return $this->page('wiki/foes.html.twig', ['groups' => $byFamily]);
    }

    #[Route('/foes/{id}', name: 'wiki_foe', methods: ['GET'])]
    public function foe(string $id): Response
    {
        $foe = $this->find('enemies', $id);
        $areas = $this->wiki->where('areas', fn ($a) => $a['boss'] === $id || \in_array($foe['family'], $a['families'], true));
        $summons = array_unique(array_filter(array_column(array_merge($foe['moves'], $foe['phase2']['moves'] ?? []), 'summon')));
        $foes = array_filter(array_map(fn ($s) => $this->wiki->get('enemies', $s), [...$summons, ...array_filter([$foe['split'], $foe['pair'] ?? null])]));

        return $this->page('wiki/foe.html.twig', ['foe' => $foe, 'areas' => $areas, 'related' => array_values($foes)]);
    }

    #[Route('/areas', name: 'wiki_areas', methods: ['GET'])]
    public function areas(): Response
    {
        $tiers = [];
        foreach ($this->wiki->all('areas') as $a) {
            $tiers[$a['tier']][] = $a;
        }
        ksort($tiers);

        return $this->page('wiki/areas.html.twig', ['tiers' => $tiers]);
    }

    #[Route('/areas/{id}', name: 'wiki_area', methods: ['GET'])]
    public function area(string $id): Response
    {
        $area = $this->find('areas', $id);
        $foes = $this->wiki->where('enemies', fn ($e) => !$e['boss'] && \in_array($e['family'], $area['families'], true));
        usort($foes, fn ($a, $b) => [$a['minStage'] ?? 0, $a['name']] <=> [$b['minStage'] ?? 0, $b['name']]);
        $events = $this->wiki->where('events', fn ($e) => \in_array($id, $e['themes'], true) || \in_array($e['id'], $area['events'], true));

        return $this->page('wiki/area.html.twig', [
            'area' => $area,
            'boss' => $this->wiki->get('enemies', $area['boss']),
            'foes' => $foes,
            'events' => $events,
        ]);
    }

    #[Route('/events', name: 'wiki_events', methods: ['GET'])]
    public function events(): Response
    {
        $areas = array_column($this->wiki->all('areas'), 'name', 'id');

        return $this->page('wiki/events.html.twig', ['events' => $this->wiki->all('events'), 'areaNames' => $areas]);
    }

    #[Route('/skins', name: 'wiki_skins', methods: ['GET'])]
    public function skins(): Response
    {
        $groups = [];
        foreach ($this->wiki->all('skins') as $s) {
            $groups[$s['group']][] = $s;
        }
        $seasons = array_column($this->wiki->all('seasons'), null, 'id');

        return $this->page('wiki/skins.html.twig', ['groups' => $groups, 'seasons' => $seasons]);
    }

    /** @return array<string, mixed> */
    private function find(string $kind, string $id): array
    {
        return $this->wiki->get($kind, $id) ?? throw new NotFoundHttpException("No such $kind: $id");
    }

    /** @return list<array<string, mixed>> */
    private function pieces(array $set): array
    {
        return array_values(array_filter(array_map(fn ($id) => $this->wiki->get('items', $id), $set['pieces'])));
    }

    /** @param array<string, mixed> $vars */
    private function page(string $template, array $vars): Response
    {
        $response = $this->render($template, $vars);
        $response->setPublic();
        $response->setMaxAge(3600);

        return $response;
    }
}
