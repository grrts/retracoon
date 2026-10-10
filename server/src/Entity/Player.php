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

    public function getCreatedAt(): \DateTimeImmutable
    {
        return $this->createdAt;
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
