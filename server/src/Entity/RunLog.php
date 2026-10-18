<?php

namespace App\Entity;

use App\Repository\RunLogRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A finished run that matters for the boards, with its ledger and what RunAudit made
 * of it. Kept for runs that set a best, for every suspect or rejected run, and for
 * every run that came with a replay until the replay job has checked it (see
 * Replays). Plain runs that changed nothing are not kept.
 */
#[ORM\Entity(repositoryClass: RunLogRepository::class)]
#[ORM\Index(name: 'run_log_verdict_idx', columns: ['verdict', 'created_at'])]
#[ORM\Index(name: 'run_log_player_idx', columns: ['player_id', 'created_at'])]
#[ORM\Index(name: 'run_log_replay_idx', columns: ['replay_status', 'created_at'])]
class RunLog
{
    // Replay status: none (no replay sent), pending (waiting for the replay job), ok,
    // failed (it doesn't replay to its score), unverifiable (its build can't be found).
    public const NONE = 'none';
    public const PENDING = 'pending';
    public const REPLAYED = 'ok';
    public const FAILED = 'failed';
    public const UNVERIFIABLE = 'unverifiable';

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

    #[ORM\Column(length: 12, options: ['default' => 'none'])]
    private string $replayStatus = self::NONE;

    /** @var array<mixed>|null the choices (src/game/replay.ts Replay) */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $replay = null;

    /** @var array<mixed>|null what the run started from (RunTicket::start) */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $start = null;

    // how the run ended, by its ledger: death or retreat
    #[ORM\Column(name: 'run_end', length: 8, nullable: true)]
    private ?string $end = null;

    // see RunTicket::$basedOn
    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $basedOn = null;

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

    public function getId(): ?string
    {
        return $this->id;
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

    public function getDistance(): int
    {
        return (int) $this->distance;
    }

    /**
     * Waits for the replay job.
     *
     * @param array<mixed> $replay
     * @param array<mixed> $start
     */
    public function awaitReplay(array $replay, array $start, ?string $end, ?string $basedOn): void
    {
        $this->replayStatus = self::PENDING;
        $this->replay = $replay;
        $this->start = $start;
        $this->end = $end;
        $this->basedOn = $basedOn;
    }

    public function getReplayStatus(): string
    {
        return $this->replayStatus;
    }

    /** @return array<mixed>|null */
    public function getReplay(): ?array
    {
        return $this->replay;
    }

    /** @return array<mixed>|null */
    public function getStart(): ?array
    {
        return $this->start;
    }

    public function getEnd(): ?string
    {
        return $this->end;
    }

    public function getBasedOn(): ?string
    {
        return $this->basedOn;
    }

    /** The replay job's answer. A failed replay counts nowhere, like a rejected ledger. */
    public function replayed(string $status, ?string $reason = null): void
    {
        $this->replayStatus = $status;
        if (self::REPLAYED !== $status) {
            $this->verdict = 'rejected';
            $this->reasons = array_values(array_unique([...$this->reasons, $reason ?? $status]));
        }
    }

    public function markImproved(): void
    {
        $this->improved = true;
    }
}
