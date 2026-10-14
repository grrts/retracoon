<?php

namespace App\Repository;

use App\Entity\Prize;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use App\Entity\Player;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Prize>
 */
class PrizeRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Prize::class);
    }

    /** @return Prize[] prizes the game hasn't shown the player yet */
    public function unseen(Player $p): array
    {
        return $this->findBy(['player' => $p, 'seenAt' => null], ['id' => 'ASC']);
    }
}
