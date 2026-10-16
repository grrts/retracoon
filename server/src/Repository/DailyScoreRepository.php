<?php

namespace App\Repository;

use App\Entity\DailyScore;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use App\Entity\Player;
use App\Entity\Prize;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<DailyScore>
 */
class DailyScoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, DailyScore::class);
    }

    public function forPlayer(Player $p, string $day): ?DailyScore
    {
        return $this->findOneBy(['player' => $p, 'day' => $day]);
    }

    /**
     * One day's board: furthest first, then fastest, then whoever got there first.
     *
     * @return DailyScore[]
     */
    public function top(string $day, int $limit, int $offset = 0): array
    {
        return $this->ranked($day)->setMaxResults($limit)->setFirstResult($offset)->getQuery()->getResult();
    }

    public function countDay(string $day): int
    {
        return (int) $this->createQueryBuilder('d')->select('COUNT(d.id)')->join('d.player', 'p')->where('d.day = :day')->andWhere('p.hidden = false')->setParameter('day', $day)->getQuery()->getSingleScalarResult();
    }

    public function rankOf(DailyScore $s): int
    {
        $ahead = (int) $this->createQueryBuilder('d')
            ->select('COUNT(d.id)')
            ->join('d.player', 'p')
            ->where('d.day = :day')
            ->andWhere('p.hidden = false')
            ->andWhere('d.stage > :s OR (d.stage = :s AND d.timeMs < :t) OR (d.stage = :s AND d.timeMs = :t AND d.scoredAt < :at)')
            ->setParameter('day', $s->getDay())
            ->setParameter('s', $s->getStage())
            ->setParameter('t', $s->getTimeMs())
            ->setParameter('at', $s->getScoredAt())
            ->getQuery()
            ->getSingleScalarResult();

        return $ahead + 1;
    }

    public function winner(string $day): ?DailyScore
    {
        return $this->top($day, 1)[0] ?? null;
    }

    /**
     * Days before $before that have scores but no prize paid yet.
     *
     * @return list<string>
     */
    public function unpaidDays(string $before): array
    {
        $rows = $this->createQueryBuilder('d')
            ->select('DISTINCT d.day')
            ->where('d.day < :before')
            ->andWhere('d.day NOT IN (SELECT p.period FROM '.Prize::class." p WHERE p.kind = 'daily')")
            ->setParameter('before', $before)
            ->orderBy('d.day', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();

        return array_values(array_map('strval', $rows));
    }

    private function ranked(string $day): QueryBuilder
    {
        return $this->createQueryBuilder('d')
            ->addSelect('p')
            ->join('d.player', 'p')
            ->where('d.day = :day')
            ->andWhere('p.hidden = false')
            ->setParameter('day', $day)
            ->orderBy('d.stage', 'DESC')
            ->addOrderBy('d.timeMs', 'ASC')
            ->addOrderBy('d.scoredAt', 'ASC')
            ->addOrderBy('d.id', 'ASC');
    }
}
