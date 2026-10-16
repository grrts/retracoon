<?php

namespace App\Service;

use Symfony\Component\DependencyInjection\Attribute\Autowire;

/**
 * The game's content for the wiki, read from wiki/content.json. That file and the sprite
 * sheets in public/wiki-sprites/ are written by the game's exporter (`npm run wiki` in the repo
 * root), so the wiki always matches the content the game ships.
 */
final class Wiki
{
    /** @var array<string, mixed>|null */
    private ?array $data = null;
    /** @var array<string, array<string, array<string, mixed>>> */
    private array $byId = [];

    public function __construct(#[Autowire('%kernel.project_dir%/wiki/content.json')] private readonly string $file)
    {
    }

    /** @return array<string, mixed> */
    public function data(): array
    {
        return $this->data ??= json_decode((string) file_get_contents($this->file), true, 512, \JSON_THROW_ON_ERROR);
    }

    /** @return list<array<string, mixed>> */
    public function all(string $kind): array
    {
        return $this->data()[$kind];
    }

    /** @return array<string, mixed>|null */
    public function get(string $kind, string $id): ?array
    {
        if (!isset($this->byId[$kind])) {
            $this->byId[$kind] = array_column($this->all($kind), null, 'id');
        }

        return $this->byId[$kind][$id] ?? null;
    }

    /** @return list<array<string, mixed>> */
    public function where(string $kind, callable $keep): array
    {
        return array_values(array_filter($this->all($kind), $keep));
    }

    /** Sprite position on a sheet: [x, y, w, h], or null when it has none. */
    public function rect(string $sheet, string $key): ?array
    {
        return $this->data()['sheets'][$sheet]['rects'][$key] ?? null;
    }

    /** @return array{file: string, w: int, h: int} */
    public function sheet(string $sheet): array
    {
        return $this->data()['sheets'][$sheet];
    }

    /**
     * Everything whose name matches the query, grouped by kind.
     *
     * @return array<string, list<array<string, mixed>>>
     */
    public function search(string $q): array
    {
        $q = mb_strtoupper(trim($q));
        if (mb_strlen($q) < 2) {
            return [];
        }
        $out = [];
        foreach (['items' => 'name', 'sets' => 'name', 'skills' => 'name', 'passives' => 'name', 'enemies' => 'name', 'areas' => 'name', 'events' => 'title', 'skins' => 'name'] as $kind => $field) {
            $hits = $this->where($kind, fn (array $x) => str_contains(mb_strtoupper($x[$field]), $q));
            if ($hits) {
                $out[$kind] = $hits;
            }
        }

        return $out;
    }
}
