<?php

namespace App\Entity;

use App\Repository\PrizeRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * Gems paid out for winning a closed board: the daily run of one day, or a season.
 * One row per board and place, so a board is never paid twice.
 */
#[ORM\Entity(repositoryClass: PrizeRepository::class)]
#[ORM\UniqueConstraint(name: 'prize_board_place', columns: ['kind', 'period', 'place'])]
class Prize
{
    public const DAILY = 'daily';
    public const SEASON = 'season';

    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $kind;

    // the day (YYYY-MM-DD) or season (YYYY-MM)
    #[ORM\Column(length: 10)]
    private string $period;

    #[ORM\Column]
    private int $place;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column]
    private int $gems;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    // when the game showed the player this prize
    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $seenAt = null;

    public function __construct(string $kind, string $period, int $place, Player $player, int $gems, \DateTimeImmutable $now)
    {
        $this->kind = $kind;
        $this->period = $period;
        $this->place = $place;
        $this->player = $player;
        $this->gems = $gems;
        $this->createdAt = $now;
    }

    public function getId(): ?int
    {
        return $this->id;
    }

    public function getKind(): string
    {
        return $this->kind;
    }

    public function getPeriod(): string
    {
        return $this->period;
    }

    public function getPlace(): int
    {
        return $this->place;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getGems(): int
    {
        return $this->gems;
    }

    public function markSeen(\DateTimeImmutable $now): void
    {
        $this->seenAt ??= $now;
    }
}
