<?php

namespace App\Repository;

use App\Entity\Player;
use App\Entity\RunTicket;
use Doctrine\Bundle\DoctrineBundle\Repository\ServiceEntityRepository;
use Doctrine\Persistence\ManagerRegistry;

/**
 * @extends ServiceEntityRepository<RunTicket>
 */
class RunTicketRepository extends ServiceEntityRepository
{
    public function __construct(ManagerRegistry $registry)
    {
        parent::__construct($registry, RunTicket::class);
    }

    /** @return RunTicket[] the player's normal tickets still marked open */
    public function openNormal(Player $p): array
    {
        return $this->findBy(['player' => $p, 'mode' => 'normal', 'status' => RunTicket::OPEN]);
    }
}
