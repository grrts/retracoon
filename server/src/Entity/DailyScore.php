<?php

namespace App\Entity;

use App\Repository\DailyScoreRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A player's best daily run for one UTC day. Everyone plays the same seed that day.
 * Ranked by stage reached, then by the fastest time, then by who got there first.
 */
#[ORM\Entity(repositoryClass: DailyScoreRepository::class)]
#[ORM\UniqueConstraint(name: 'daily_player_day', columns: ['player_id', 'day'])]
#[ORM\Index(name: 'daily_rank_idx', columns: ['day', 'stage', 'time_ms'])]
class DailyScore
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    // YYYY-MM-DD, UTC
    #[ORM\Column(length: 10)]
    private string $day;

    #[ORM\Column]
    private int $stage = 0;

    #[ORM\Column]
    private int $level = 1;

    #[ORM\Column(type: Types::BIGINT)]
    private string $distance = '0';

    #[ORM\Column]
    private int $timeMs = 0;

    #[ORM\Column]
    private \DateTimeImmutable $scoredAt;

    public function __construct(Player $player, string $day)
    {
        $this->player = $player;
        $this->day = $day;
        $this->scoredAt = new \DateTimeImmutable();
    }

    /** Keeps the better run: further, or as far but faster. True if it improved. */
    public function record(int $stage, int $level, int $distance, int $timeMs, \DateTimeImmutable $now): bool
    {
        $isNew = 0 === $this->stage;
        if (!$isNew && ($stage < $this->stage || ($stage === $this->stage && $timeMs >= $this->timeMs))) {
            return false;
        }
        $this->stage = $stage;
        $this->level = $level;
        $this->distance = (string) $distance;
        $this->timeMs = $timeMs;
        $this->scoredAt = $now;

        return true;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getDay(): string
    {
        return $this->day;
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

    public function getTimeMs(): int
    {
        return $this->timeMs;
    }

    public function getScoredAt(): \DateTimeImmutable
    {
        return $this->scoredAt;
    }
}
