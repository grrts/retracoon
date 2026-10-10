<?php

namespace App\Entity;

use App\Repository\FriendshipRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * "player has friend". Adding a friend stores both directions, so either side sees the other.
 */
#[ORM\Entity(repositoryClass: FriendshipRepository::class)]
class Friendship
{
    #[ORM\Id]
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $player;

    #[ORM\Id]
    #[ORM\ManyToOne]
    #[ORM\JoinColumn(nullable: false, onDelete: 'CASCADE')]
    private Player $friend;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    public function __construct(Player $player, Player $friend)
    {
        $this->player = $player;
        $this->friend = $friend;
        $this->createdAt = new \DateTimeImmutable();
    }

    public function getPlayer(): Player
    {
        return $this->player;
    }

    public function getFriend(): Player
    {
        return $this->friend;
    }
}
