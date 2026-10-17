<?php

namespace App\Entity;

use Doctrine\ORM\Mapping as ORM;

/**
 * How many times a day the landing page was visited, or a store button clicked, from one
 * referring site and UTM tag combination. Only counters: no IP address, cookie, user
 * agent or anything else about the visitor is kept. Written by App\Service\SiteCounter.
 */
#[ORM\Entity]
#[ORM\UniqueConstraint(name: 'site_count_key', columns: ['day', 'target', 'source', 'utm_source', 'utm_medium', 'utm_campaign'])]
class SiteCount
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 10)]
    private string $day;

    // 'landing' for a visit, or the store whose button was clicked
    #[ORM\Column(length: 16)]
    private string $target;

    // referring site's host name, '' when direct or unknown
    #[ORM\Column(length: 64)]
    private string $source;

    #[ORM\Column(length: 40)]
    private string $utmSource;

    #[ORM\Column(length: 40)]
    private string $utmMedium;

    #[ORM\Column(length: 40)]
    private string $utmCampaign;

    #[ORM\Column]
    private int $hits;

    public function __construct(string $day, string $target, string $source, string $utmSource, string $utmMedium, string $utmCampaign, int $hits = 1)
    {
        $this->day = $day;
        $this->target = $target;
        $this->source = $source;
        $this->utmSource = $utmSource;
        $this->utmMedium = $utmMedium;
        $this->utmCampaign = $utmCampaign;
        $this->hits = $hits;
    }
}
