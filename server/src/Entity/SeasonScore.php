<?php

namespace App\Entity;

use App\Repository\SeasonScoreRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A player's best normal run within one season (a UTC calendar month).
 * Ranked like the world board: stage, then distance, then who got there first.
 */
#[ORM\Entity(repositoryClass: SeasonScoreRepository::class)]
#[ORM\UniqueConstraint(name: 'season_player_season', columns: ['player_id', 'season'])]
#[ORM\Index(name: 'season_rank_idx', columns: ['season', 'stage', 'distance'])]
class SeasonScore
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    // YYYY-MM, UTC
    #[ORM\Column(length: 7)]
    private string $season;

    #[ORM\Column]
    private int $stage = 0;

    #[ORM\Column]
    private int $level = 1;

    #[ORM\Column(type: Types::BIGINT)]
    private string $distance = '0';

    #[ORM\Column]
    private \DateTimeImmutable $scoredAt;

    public function __construct(Player $player, string $season)
    {
        $this->player = $player;
        $this->season = $season;
        $this->scoredAt = new \DateTimeImmutable();
    }

    public function record(int $stage, int $level, int $distance, \DateTimeImmutable $now): bool
    {
        if ($stage < $this->stage || ($stage === $this->stage && $distance <= $this->getDistance())) {
            return false;
        }
        $this->stage = $stage;
        $this->level = $level;
        $this->distance = (string) $distance;
        $this->scoredAt = $now;

        return true;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getSeason(): string
    {
        return $this->season;
    }

    public function getStage(): int
    {
        return $this->stage;
    }

    public function getLevel(): int
    {
        return $this->level;
    }

    public function getDistance(): int
    {
        return (int) $this->distance;
    }
}
