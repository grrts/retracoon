<?php

namespace App\Repository;

use App\Entity\Player;
use App\Entity\RunLog;
use App\Service\RunAudit;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RunLog>
 */
class RunLogRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RunLog::class);
    }

    /**
     * Newest suspect and rejected runs, for a look.
     *
     * @return RunLog[]
     */
    public function flagged(int $limit): array
    {
        return $this->createQueryBuilder('r')
            ->addSelect('p')
            ->join('r.player', 'p')
            ->where('r.verdict IN (:v)')
            ->setParameter('v', [RunAudit::SUSPECT, RunAudit::REJECTED])
            ->orderBy('r.createdAt', 'DESC')
            ->setMaxResults($limit)
            ->getQuery()
            ->getResult();
    }

    /** @return RunLog[] newest first */
    public function forPlayer(Player $p, int $limit): array
    {
        return $this->findBy(['player' => $p], ['createdAt' => 'DESC'], $limit);
    }
}
