<?php

namespace App\Twig;

use App\Service\Wiki;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\RequestStack;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction;

/**
 * Draws game sprites in wiki pages: one sprite sheet per kind, cut out with CSS and
 * scaled up pixel-sharp.
 */
final class WikiExtension extends AbstractExtension
{
    /** @var array<string, string> */
    private array $urls = [];

    public function __construct(
        private readonly Wiki $wiki,
        private readonly RequestStack $requests,
        #[Autowire('%kernel.project_dir%/public')] private readonly string $public,
    ) {
    }

    public function getFunctions(): array
    {
        return [
            new TwigFunction('sprite', $this->sprite(...), ['is_safe' => ['html']]),
            new TwigFunction('wiki', fn () => $this->wiki->data()),
        ];
    }

    /** A sprite from a sheet (items, icons, foes, events, skins), `scale` times its size. */
    public function sprite(string $sheet, string $key, int $scale = 2, string $label = ''): string
    {
        $r = $this->wiki->rect($sheet, $key);
        if (null === $r) {
            return '';
        }
        [$x, $y, $w, $h] = $r;
        $s = $this->wiki->sheet($sheet);
        $style = \sprintf(
            'width:%dpx;height:%dpx;background:url(%s) -%dpx -%dpx/%dpx %dpx no-repeat',
            $w * $scale, $h * $scale, $this->url($s['file']), $x * $scale, $y * $scale, $s['w'] * $scale, $s['h'] * $scale,
        );
        $aria = '' !== $label ? \sprintf(' role="img" aria-label="%s"', htmlspecialchars($label)) : ' aria-hidden="true"';

        return \sprintf('<span class="spr" style="%s"%s></span>', $style, $aria);
    }

    // The sheet's URL, with its modification time so browsers pick up a re-export.
    private function url(string $file): string
    {
        if (!isset($this->urls[$file])) {
            $base = $this->requests->getCurrentRequest()?->getBasePath() ?? '';
            $this->urls[$file] = \sprintf('%s/wiki-sprites/%s?v=%d', $base, $file, @filemtime("$this->public/wiki-sprites/$file") ?: 0);
        }

        return $this->urls[$file];
    }
}
