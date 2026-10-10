<?php

namespace App\Repository;

use App\Entity\Player;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\ORM\QueryBuilder;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<Player>
 */
class PlayerRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, Player::class);
    }

    public function findOneByTokenHash(string $hash): ?Player
    {
        return $this->findOneBy(['tokenHash' => $hash]);
    }

    public function findOneByFriendCode(string $code): ?Player
    {
        return $this->findOneBy(['friendCode' => $code]);
    }

    /**
     * The world board: best stage first, then furthest distance, then whoever got there first.
     *
     * @return Player[]
     */
    public function top(int $limit, int $offset = 0): array
    {
        return $this->ranked($this->createQueryBuilder('p')->where('p.bestStage > 0'))
            ->setMaxResults($limit)
            ->setFirstResult($offset)
            ->getQuery()
            ->getResult();
    }

    public function countRanked(): int
    {
        return (int) $this->createQueryBuilder('p')->select('COUNT(p.id)')->where('p.bestStage > 0')->getQuery()->getSingleScalarResult();
    }

    /**
     * 1-based position on the world board, or null if the player has no score yet.
     */
    public function rankOf(Player $p): ?int
    {
        if ($p->getBestStage() <= 0) {
            return null;
        }
        $ahead = (int) $this->createQueryBuilder('p')
            ->select('COUNT(p.id)')
            ->where('p.bestStage > :s OR (p.bestStage = :s AND p.bestDistance > :d)')
            ->setParameter('s', $p->getBestStage())
            ->setParameter('d', $p->getBestDistance())
            ->getQuery()
            ->getSingleScalarResult();

        return $ahead + 1;
    }

    /**
     * The player and everyone on their friends list, ranked.
     *
     * @return Player[]
     */
    public function withFriends(Player $p): array
    {
        $qb = $this->createQueryBuilder('p');
        $qb->where('p = :me')
            ->orWhere($qb->expr()->in('p.id', 'SELECT IDENTITY(f.friend) FROM App\Entity\Friendship f WHERE f.player = :me'))
            ->setParameter('me', $p);

        return $this->ranked($qb)->getQuery()->getResult();
    }

    private function ranked(QueryBuilder $qb): QueryBuilder
    {
        return $qb->orderBy('p.bestStage', 'DESC')
            ->addOrderBy('p.bestDistance', 'DESC')
            ->addOrderBy('p.scoredAt', 'ASC')
            ->addOrderBy('p.createdAt', 'ASC');
    }
}
