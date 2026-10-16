<?php

namespace App\Entity;

use App\Repository\RunLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A finished run that matters for the boards, with its ledger and what RunAudit made
 * of it. Kept for runs that set a best, and for every suspect or rejected run, so a
 * winner can be looked at (or replayed, later) before anyone asks. Plain runs that
 * changed nothing are not kept.
 */
#[ORM\Entity(repositoryClass: RunLogRepository::class)]
#[ORM\Index(name: 'run_log_verdict_idx', columns: ['verdict', 'created_at'])]
#[ORM\Index(name: 'run_log_player_idx', columns: ['player_id', 'created_at'])]
class RunLog
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::BIGINT)]
    private ?string $id = null;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column(length: 8)]
    private string $mode;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $day;

    #[ORM\Column]
    private int $stage;

    #[ORM\Column]
    private int $level;

    #[ORM\Column(type: Types::BIGINT)]
    private string $distance;

    #[ORM\Column]
    private int $timeMs;

    #[ORM\Column(length: 10)]
    private string $verdict;

    /** @var list<string> */
    #[ORM\Column(type: Types::JSON)]
    private array $reasons;

    // whether it raised a best on some board
    #[ORM\Column]
    private bool $improved;

    /** @var array<mixed>|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $log;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * @param list<string>      $reasons
     * @param array<mixed>|null $log
     */
    public function __construct(Player $player, string $mode, ?string $day, int $stage, int $level, int $distance, int $timeMs, string $verdict, array $reasons, bool $improved, ?array $log, \DateTimeImmutable $now)
    {
        $this->player = $player;
        $this->mode = $mode;
        $this->day = $day;
        $this->stage = $stage;
        $this->level = $level;
        $this->distance = (string) $distance;
        $this->timeMs = $timeMs;
        $this->verdict = $verdict;
        $this->reasons = $reasons;
        $this->improved = $improved;
        $this->log = $log;
        $this->createdAt = $now;
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getMode(): string
    {
        return $this->mode;
    }

    public function getDay(): ?string
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

    public function getTimeMs(): int
    {
        return $this->timeMs;
    }

    public function getVerdict(): string
    {
        return $this->verdict;
    }

    /** @return list<string> */
    public function getReasons(): array
    {
        return $this->reasons;
    }

    public function isImproved(): bool
    {
        return $this->improved;
    }

    /** @return array<mixed>|null */
    public function getLog(): ?array
    {
        return $this->log;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
