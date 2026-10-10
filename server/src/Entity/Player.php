<?php

namespace App\Entity;

use App\Repository\PlayerRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;
use Symfony\Component\Security\Core\User\UserInterface;

/**
 * One installed copy of the game. Players never make an account: the game registers
 * once, keeps the token it gets back, and sends it with every request.
 */
#[ORM\Entity(repositoryClass: PlayerRepository::class)]
#[ORM\Index(name: 'player_rank_idx', columns: ['best_stage', 'best_distance'])]
#[ORM\HasLifecycleCallbacks]
class Player implements UserInterface
{
    #[ORM\Id]
    #[ORM\Column(length: 16)]
    private string $id;

    #[ORM\Column(length: 16)]
    private string $name;

    #[ORM\Column(length: 6, unique: true)]
    private string $friendCode;

    // sha256 of the API token; the token itself is only ever shown once, at registration.
    #[ORM\Column(length: 64, unique: true)]
    private string $tokenHash;

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

    public function __construct(string $id, string $name, string $friendCode, string $tokenHash)
    {
        $this->id = $id;
        $this->name = $name;
        $this->friendCode = $friendCode;
        $this->tokenHash = $tokenHash;
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

    public function setName(string $name): void
    {
        $this->name = $name;
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
