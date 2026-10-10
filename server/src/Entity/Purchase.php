<?php

namespace App\Entity;

use App\Repository\PurchaseRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A store purchase credited to a player, keyed by the store's transaction id so a
 * repeated webhook never grants twice.
 */
#[ORM\Entity(repositoryClass: PurchaseRepository::class)]
class Purchase
{
    #[ORM\Id]
    #[ORM\Column(length: 120)]
    private string $transactionId;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column(length: 60)]
    private string $productId;

    #[ORM\Column]
    private int $gems;

    #[ORM\Column]
    private bool $refunded = false;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $transactionId, Player $player, string $productId, int $gems)
    {
        $this->transactionId = $transactionId;
        $this->player = $player;
        $this->productId = $productId;
        $this->gems = $gems;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getProductId(): string
    {
        return $this->productId;
    }

    public function getGems(): int
    {
        return $this->gems;
    }

    public function isRefunded(): bool
    {
        return $this->refunded;
    }

    public function markRefunded(): void
    {
        $this->refunded = true;
    }
}
