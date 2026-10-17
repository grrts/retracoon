<?php

namespace App\Repository;

use App\Entity\SeasonScore;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use App\Entity\Player;
use App\Entity\Prize;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<SeasonScore>
 */
class SeasonScoreRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, SeasonScore::class);
    }

    public function forPlayer(Player $p, string $season): ?SeasonScore
    {
        return $this->findOneBy(['player' => $p, 'season' => $season]);
    }

    /** @return SeasonScore[] */
    public function top(string $season, int $limit, int $offset = 0): array
    {
        return $this->ranked($season)->setMaxResults($limit)->setFirstResult($offset)->getQuery()->getResult();
    }

    public function countSeason(string $season): int
    {
        return (int) $this->createQueryBuilder('s')->select('COUNT(s.id)')->join('s.player', 'p')->where('s.season = :season')->andWhere('p.hidden = false')->setParameter('season', $season)->getQuery()->getSingleScalarResult();
    }

    public function rankOf(SeasonScore $x): int
    {
        $ahead = (int) $this->createQueryBuilder('s')
            ->select('COUNT(s.id)')
            ->join('s.player', 'p')
            ->where('s.season = :season')
            ->andWhere('p.hidden = false')
            ->andWhere('s.stage > :st OR (s.stage = :st AND s.distance > :d)')
            ->setParameter('season', $x->getSeason())
            ->setParameter('st', $x->getStage())
            ->setParameter('d', $x->getDistance())
            ->getQuery()
            ->getSingleScalarResult();

        return $ahead + 1;
    }

    public function winner(string $season): ?SeasonScore
    {
        return $this->top($season, 1)[0] ?? null;
    }

    /** @return list<string> seasons before $before with scores and no prize paid yet */
    public function unpaidSeasons(string $before): array
    {
        $rows = $this->createQueryBuilder('s')
            ->select('DISTINCT s.season')
            ->where('s.season < :before')
            ->andWhere('s.season NOT IN (SELECT p.period FROM '.Prize::class." p WHERE p.kind = 'season')")
            ->setParameter('before', $before)
            ->orderBy('s.season', 'ASC')
            ->getQuery()
            ->getSingleColumnResult();

        return array_values(array_map('strval', $rows));
    }

    private function ranked(string $season): QueryBuilder
    {
        return $this->createQueryBuilder('s')
            ->addSelect('p')
            ->join('s.player', 'p')
            ->where('s.season = :season')
            ->andWhere('p.hidden = false')
            ->setParameter('season', $season)
            ->orderBy('s.stage', 'DESC')
            ->addOrderBy('s.distance', 'DESC')
            ->addOrderBy('s.scoredAt', 'ASC')
            ->addOrderBy('s.id', 'ASC');
    }
}
