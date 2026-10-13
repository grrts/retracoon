<?php

namespace App\Entity;

use App\Repository\PlayEventRepository;
use Doctrine\DBAL\Types\Types;
use Doctrine\ORM\Mapping as ORM;

/**
 * One gameplay tracking event (app opened, run ended, ...). Tied to a random install
 * id made on the device, never to a player account, so it is not linked to identity.
 */
#[ORM\Entity(repositoryClass: PlayEventRepository::class)]
#[ORM\Index(name: 'play_event_device_idx', columns: ['device', 'at'])]
#[ORM\Index(name: 'play_event_name_idx', columns: ['name', 'at'])]
class PlayEvent
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column(type: Types::BIGINT)]
    private ?string $id = null;

    #[ORM\Column(length: 36)]
    private string $device;

    #[ORM\Column(length: 32)]
    private string $name;

    /** @var array<string, scalar|null> */
    #[ORM\Column(type: Types::JSON)]
    private array $props;

    #[ORM\Column(length: 10)]
    private string $platform;

    #[ORM\Column(length: 16)]
    private string $version;

    // when it happened on the device (clamped to receipt time)
    #[ORM\Column]
    private \DateTimeImmutable $at;

    #[ORM\Column]
    private \DateTimeImmutable $receivedAt;

    /** @param array<string, scalar|null> $props */
    public function __construct(string $device, string $name, array $props, string $platform, string $version, \DateTimeImmutable $at, \DateTimeImmutable $receivedAt)
    {
        $this->device = $device;
        $this->name = $name;
        $this->props = $props;
        $this->platform = $platform;
        $this->version = $version;
        $this->at = $at;
        $this->receivedAt = $receivedAt;
    }
}
