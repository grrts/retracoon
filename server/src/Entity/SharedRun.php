<?php

namespace App\Entity;

use App\Repository\SharedRunRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * A finished run a player chose to share. It gets a public page at /r/{id} whose link
 * preview is the card the game drew (the raccoon in its final gear). Only what that
 * page shows is kept; it goes when the player deletes their account.
 */
#[ORM\Entity(repositoryClass: SharedRunRepository::class)]
class SharedRun
{
    #[ORM\Id]
    #[ORM\Column(length: 10)]
    private string $id;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    // 'normal' or 'daily'
    #[ORM\Column(length: 8)]
    private string $mode;

    // daily runs: the UTC day of the seed
    #[ORM\Column(length: 10, nullable: true)]
    private ?string $day;

    // 'death' or 'retreat'
    #[ORM\Column(length: 8)]
    private string $reason;

    #[ORM\Column]
    private int $stage;

    #[ORM\Column]
    private int $area;

    #[ORM\Column]
    private int $level;

    #[ORM\Column(length: 40)]
    private string $theme;

    #[ORM\Column(length: 40)]
    private string $themeName;

    // what killed the raccoon: a foe (with its id, for the wiki) or a hazard
    #[ORM\Column(length: 48, nullable: true)]
    private ?string $killer;

    #[ORM\Column(length: 40, nullable: true)]
    private ?string $killerId;

    /** @var list<array{slot: string, id: string, name: string, rarity: int, lvl: int}> */
    #[ORM\Column(type: Types::JSON)]
    private array $gear;

    // the card the game drew, PNG
    #[ORM\Column(type: Types::BLOB)]
    private mixed $card;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    /**
     * @param list<array{slot: string, id: string, name: string, rarity: int, lvl: int}> $gear
     */
    public function __construct(string $id, Player $player, string $mode, ?string $day, string $reason, int $stage, int $area, int $level, string $theme, string $themeName, ?string $killer, ?string $killerId, array $gear, string $card, \DateTimeImmutable $now)
    {
        $this->id = $id;
        $this->player = $player;
        $this->mode = $mode;
        $this->day = $day;
        $this->reason = $reason;
        $this->stage = $stage;
        $this->area = $area;
        $this->level = $level;
        $this->theme = $theme;
        $this->themeName = $themeName;
        $this->killer = $killer;
        $this->killerId = $killerId;
        $this->gear = $gear;
        $this->card = $card;
        $this->createdAt = $now;
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

    public function getReason(): string
    {
        return $this->reason;
    }

    public function getStage(): int
    {
        return $this->stage;
    }

    public function getArea(): int
    {
        return $this->area;
    }

    public function getLevel(): int
    {
        return $this->level;
    }

    public function getTheme(): string
    {
        return $this->theme;
    }

    public function getThemeName(): string
    {
        return $this->themeName;
    }

    public function getKiller(): ?string
    {
        return $this->killer;
    }

    public function getKillerId(): ?string
    {
        return $this->killerId;
    }

    /** @return list<array{slot: string, id: string, name: string, rarity: int, lvl: int}> */
    public function getGear(): array
    {
        return $this->gear;
    }

    /** The PNG bytes (PostgreSQL hands a blob back as a stream). */
    public function getCard(): string
    {
        if (\is_resource($this->card)) {
            rewind($this->card);
            $this->card = (string) stream_get_contents($this->card);
        }

        return (string) $this->card;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }
}
