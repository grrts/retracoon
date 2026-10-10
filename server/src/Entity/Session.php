<?php

namespace App\Entity;

use App\Repository\SessionRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * A signed-in device. Each sign-in gets its own token, so playing on a phone and on
 * Steam at the same time works; deleting the player signs every device out.
 */
#[ORM\Entity(repositoryClass: SessionRepository::class)]
class Session
{
    // sha256 of the API token; the token itself is only ever shown once, at sign-in.
    #[ORM\Id]
    #[ORM\Column(length: 64)]
    private string $tokenHash;

    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(string $tokenHash, Player $player)
    {
        $this->tokenHash = $tokenHash;
        $this->player = $player;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }
}
