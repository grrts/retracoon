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

    /** @return RunLog[] oldest first */
    public function pendingReplays(int $limit): array
    {
        return $this->findBy(['replayStatus' => RunLog::PENDING], ['createdAt' => 'ASC', 'id' => 'ASC'], $limit);
    }

    /** Whether a run of this daily day (YYYY-MM-DD) or season (YYYY-MM) still waits on its replay. */
    public function pendingFor(string $mode, string $period, \DateTimeImmutable $since): bool
    {
        $q = $this->createQueryBuilder('r')
            ->select('COUNT(r.id)')
            ->where('r.replayStatus = :p')
            ->andWhere('r.createdAt > :since')
            ->setParameter('p', RunLog::PENDING)
            ->setParameter('since', $since);
        if ('daily' === $mode) {
            $q->andWhere("r.mode = 'daily'")->andWhere('r.day = :d')->setParameter('d', $period);
        } else {
            $from = new \DateTimeImmutable($period.'-01 00:00:00', new \DateTimeZone('UTC'));
            $q->andWhere("r.mode = 'normal'")->andWhere('r.createdAt >= :from')->andWhere('r.createdAt < :to')
                ->setParameter('from', $from)->setParameter('to', $from->modify('+1 month'));
        }

        return (int) $q->getQuery()->getSingleScalarResult() > 0;
    }

    /** @return RunLog[] newest first */
    public function forPlayer(Player $p, int $limit): array
    {
        return $this->findBy(['player' => $p], ['createdAt' => 'DESC'], $limit);
    }
}
