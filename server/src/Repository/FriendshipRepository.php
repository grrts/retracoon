<?php

namespace App\Repository;

use App\Entity\Friendship;
use App\Entity\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Friendship>
 */
class FriendshipRepository extends ServiceEntityRepository
{
    public const MAX_FRIENDS = 200;

    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Friendship::class);
    }

    public function exists(Player $a, Player $b): bool
    {
        return null !== $this->find(['player' => $a, 'friend' => $b]);
    }

    public function countFor(Player $p): int
    {
        return $this->count(['player' => $p]);
    }

    /** Removes the friendship in both directions. */
    public function unlink(Player $a, Player $b): void
    {
        $this->createQueryBuilder('f')
            ->delete()
            ->where('(f.player = :a AND f.friend = :b) OR (f.player = :b AND f.friend = :a)')
            ->setParameter('a', $a)
            ->setParameter('b', $b)
            ->getQuery()
            ->execute();
    }
}
