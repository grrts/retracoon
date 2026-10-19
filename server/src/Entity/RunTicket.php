<?php

namespace App\Entity;

use App\Repository\RunTicketRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A run the server handed out: the seed every roll of the run comes from, and the
 * raccoon it starts from (the server's own record of the banked raccoon). A result
 * only ranks if it names an open ticket, and one ticket takes one result. A normal
 * ticket that is still open when the player starts another one was never finished
 * (the app was closed, or GIVE UP), so it counts as a death.
 */
#[ORM\Entity(repositoryClass: RunTicketRepository::class)]
#[ORM\Index(name: 'run_ticket_open_idx', columns: ['player_id', 'status'])]
class RunTicket
{
    public const OPEN = 'open';
    public const DONE = 'done';
    public const ABANDONED = 'abandoned';
    // A ticket is good for this long; older ones count as abandoned.
    public const TTL = 'P2D';

    #[ORM\Id]
    #[ORM\Column(length: 20)]
    private string $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column(length: 8)]
    private string $mode;

    #[ORM\Column(length: 10, nullable: true)]
    private ?string $day;

    #[ORM\Column(type: Types::BIGINT)]
    private string $seed;

    /** @var array{l: int, st: list<int>, p: int}|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $kept;

    // The run log whose result gave this ticket its raccoon, while that result is
    // still being replayed: if it fails, so does every run started from it.
    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $basedOn;

    #[ORM\Column(length: 10)]
    private string $status = self::OPEN;

    #[ORM\Column]
    private \DateTimeImmutable $issuedAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $closedAt = null;

    /** @param array{l: int, st: list<int>, p: int}|null $kept */
    public function __construct(string $id, Player $player, string $mode, ?string $day, int $seed, ?array $kept, ?string $basedOn, \DateTimeImmutable $now)
    {
        $this->id = $id;
        $this->player = $player;
        $this->mode = $mode;
        $this->day = $day;
        $this->seed = (string) $seed;
        $this->kept = $kept;
        $this->basedOn = $basedOn;
        $this->issuedAt = $now;
    }

    public function getId(): string
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

    public function getSeed(): int
    {
        return (int) $this->seed;
    }

    /** @return array{l: int, st: list<int>, p: int}|null */
    public function getKept(): ?array
    {
        return $this->kept;
    }

    public function getBasedOn(): ?string
    {
        return $this->basedOn;
    }

    public function getIssuedAt(): \DateTimeImmutable
    {
        return $this->issuedAt;
    }

    public function isOpen(\DateTimeImmutable $now): bool
    {
        return self::OPEN === $this->status && $this->issuedAt > $now->sub(new \DateInterval(self::TTL));
    }

    public function close(string $status, \DateTimeImmutable $now): void
    {
        $this->status = $status;
        $this->closedAt = $now;
    }

    /** What the run starts from, as the replay takes it (src/game/replay.ts ReplayStart). */
    public function start(bool $legendary): array
    {
        return ['mode' => $this->mode, 'day' => $this->day, 'seed' => $this->getSeed(), 'kept' => 'daily' === $this->mode ? null : $this->kept, 'leg' => $legendary];
    }
}
