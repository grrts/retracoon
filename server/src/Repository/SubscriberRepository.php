<?php

namespace App\Repository;

use App\Entity\Subscriber;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Subscriber>
 */
class SubscriberRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Subscriber::class);
    }

    /** Drops sign-ups never confirmed within a week of asking. */
    public function purgeUnconfirmed(\DateTimeImmutable $now): int
    {
        return $this->createQueryBuilder('s')->delete()
            ->where('s.confirmedAt IS NULL AND s.createdAt < :cut')
            ->setParameter('cut', $now->modify('-7 days'))
            ->getQuery()->execute();
    }

    /** @return list<Subscriber> */
    public function confirmed(): array
    {
        return $this->createQueryBuilder('s')->where('s.confirmedAt IS NOT NULL')->orderBy('s.confirmedAt')->addOrderBy('s.id')->getQuery()->getResult();
    }
}
