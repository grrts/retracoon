<?php

namespace App\Entity;

use App\Repository\PlayerRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * One player, tied to exactly one Google, Apple or Steam account. Signing in with that
 * account on any device gets the same player back (see AuthController). Names are not
 * unique on their own: NAME#1234 is, through the 4-digit tag.
 */
#[ORM\Entity(repositoryClass: PlayerRepository::class)]
#[ORM\Index(name: 'player_rank_idx', columns: ['best_stage', 'best_distance'])]
#[ORM\UniqueConstraint(name: 'player_name_tag', columns: ['name', 'tag'])]
#[ORM\UniqueConstraint(name: 'player_account', columns: ['provider', 'provider_id'])]
#[ORM\HasLifecycleCallbacks]
class Player implements UserInterface
{
    #[ORM\Id]
    #[ORM\Column(length: 16)]
    private string $id;

    #[ORM\Column(length: 16)]
    private string $name;

    #[ORM\Column(type: Types::SMALLINT)]
    private int $tag;

    #[ORM\Column(length: 6, unique: true)]
    private string $friendCode;

    // 'google', 'apple' or 'steam', and that account's stable user id.
    #[ORM\Column(length: 10)]
    private string $provider;

    #[ORM\Column(length: 100)]
    private string $providerId;

    // Premium currency and unlocks live here so they follow the account.
    #[ORM\Column]
    private int $gems = 0;

    #[ORM\Column]
    private bool $noAds = false;

    // Sign in with Apple refresh token, revoked when the account is deleted.
    #[ORM\Column(type: Types::TEXT, nullable: true)]
    private ?string $appleRefreshToken = null;

    /** @var list<string> skins bought with gems */
    #[ORM\Column(type: Types::JSON)]
    private array $unlocks = [];

    #[ORM\Column(length: 40)]
    private string $skin = 'classic';

    #[ORM\Column]
    private int $bestStage = 0;

    #[ORM\Column]
    private int $bestLevel = 0;

    #[ORM\Column(type: Types::BIGINT)]
    private string $bestDistance = '0';

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $scoredAt = null;

    // Kept off every public board and out of prizes, without telling the player
    // (`app:runs --hide`). They still see their own scores.
    #[ORM\Column(options: ['default' => false])]
    private bool $hidden = false;

    // The banked raccoon (level, stats, points) the next normal run starts from: set by
    // a retreat, wiped by a death or a run that never ended. Null with keptSet = a fresh
    // raccoon. Before the first run ticket the server has none of its own (keptSet
    // false) and takes the phone's once, see adoptKept.
    /** @var array{l: int, st: list<int>, p: int}|null */
    #[ORM\Column(type: Types::JSON, nullable: true)]
    private ?array $kept = null;

    #[ORM\Column(options: ['default' => false])]
    private bool $keptSet = false;

    // The run log whose result banked it, while that result may still be replayed.
    #[ORM\Column(type: Types::BIGINT, nullable: true)]
    private ?string $keptFrom = null;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column]
    private \DateTimeImmutable $updatedAt;

    public function __construct(string $id, string $name, int $tag, string $friendCode, string $provider, string $providerId)
    {
        $this->id = $id;
        $this->name = $name;
        $this->tag = $tag;
        $this->friendCode = $friendCode;
        $this->provider = $provider;
        $this->providerId = $providerId;
        $this->createdAt = new \DateTimeImmutable();
        $this->updatedAt = $this->createdAt;
    }

    #[ORM\PreUpdate]
    public function touch(): void
    {
        $this->updatedAt = new \DateTimeImmutable();
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getName(): string
    {
        return $this->name;
    }

    public function setName(string $name, int $tag): void
    {
        $this->name = $name;
        $this->tag = $tag;
    }

    public function getTag(): int
    {
        return $this->tag;
    }

    public function getProvider(): string
    {
        return $this->provider;
    }

    public function getAppleRefreshToken(): ?string
    {
        return $this->appleRefreshToken;
    }

    public function setAppleRefreshToken(?string $token): void
    {
        $this->appleRefreshToken = $token;
    }

    public function getGems(): int
    {
        return $this->gems;
    }

    public function addGems(int $n): void
    {
        $this->gems = max(0, $this->gems + $n);
    }

    public function hasNoAds(): bool
    {
        return $this->noAds;
    }

    public function setNoAds(bool $on): void
    {
        $this->noAds = $on;
    }

    /** @return list<string> */
    public function getUnlocks(): array
    {
        return $this->unlocks;
    }

    /**
     * Spends gems on an unlock. Buying the same thing twice is a no-op, so a retried
     * request never charges twice. False if there aren't enough gems.
     */
    public function spend(int $gems, string $item): bool
    {
        if (\in_array($item, $this->unlocks, true)) {
            return true;
        }
        if ($gems < 0 || $gems > $this->gems) {
            return false;
        }
        $this->gems -= $gems;
        $this->unlocks[] = $item;

        return true;
    }

    public function getFriendCode(): string
    {
        return $this->friendCode;
    }

    public function getSkin(): string
    {
        return $this->skin;
    }

    public function setSkin(string $skin): void
    {
        $this->skin = $skin;
    }

    public function getBestStage(): int
    {
        return $this->bestStage;
    }

    public function getBestLevel(): int
    {
        return $this->bestLevel;
    }

    public function getBestDistance(): int
    {
        return (int) $this->bestDistance;
    }

    public function getScoredAt(): ?\DateTimeImmutable
    {
        return $this->scoredAt;
    }

    public function isHidden(): bool
    {
        return $this->hidden;
    }

    public function setHidden(bool $hidden): void
    {
        $this->hidden = $hidden;
    }

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
    }

    /** @return array{l: int, st: list<int>, p: int}|null */
    public function getKept(): ?array
    {
        return $this->kept;
    }

    public function getKeptFrom(): ?string
    {
        return $this->keptFrom;
    }

    public function isKeptSet(): bool
    {
        return $this->keptSet;
    }

    /** @param array{l: int, st: list<int>, p: int}|null $kept */
    public function setKept(?array $kept, ?string $from = null): void
    {
        $this->kept = $kept;
        $this->keptFrom = null === $kept ? null : $from;
        $this->keptSet = true;
    }

    /**
     * The first run ticket of an account that played before tickets existed: take the
     * phone's banked raccoon once, if it is one this player could have (no higher than
     * their best level, and no more stat points than those levels give, with a little
     * room for camps and events).
     */
    public function adoptKept(mixed $kept): void
    {
        $ok = \is_array($kept) && \is_int($kept['l'] ?? null) && \is_int($kept['p'] ?? null) && \is_array($kept['st'] ?? null) && array_is_list($kept['st']) && 5 === \count($kept['st'])
            && $kept['l'] >= 1 && $kept['l'] <= max(1, $this->bestLevel) && $kept['p'] >= 0;
        if ($ok) {
            foreach ($kept['st'] as $v) {
                $ok = $ok && \is_int($v) && $v >= 0;
            }
            $ok = $ok && array_sum($kept['st']) + $kept['p'] <= 12 + 3 * ($kept['l'] - 1) + $kept['l'];
        }
        $this->setKept($ok && $kept['l'] > 1 ? ['l' => $kept['l'], 'st' => $kept['st'], 'p' => $kept['p']] : null);
    }

    /**
     * Records a finished run. Bests only ever go up; returns true if anything improved.
     */
    public function recordRun(int $stage, int $level, int $distance): bool
    {
        $better = false;
        if ($stage > $this->bestStage || ($stage === $this->bestStage && $distance > $this->getBestDistance())) {
            $this->bestStage = $stage;
            $this->bestDistance = (string) $distance;
            $this->scoredAt = new \DateTimeImmutable();
            $better = true;
        }
        if ($level > $this->bestLevel) {
            $this->bestLevel = $level;
            $better = true;
        }

        return $better;
    }

    public function getUserIdentifier(): string
    {
        return $this->id;
    }

    public function getRoles(): array
    {
        return ['ROLE_PLAYER'];
    }

    public function eraseCredentials(): void
    {
    }
}
