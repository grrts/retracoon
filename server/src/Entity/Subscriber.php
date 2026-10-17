<?php

namespace App\Entity;

use App\Repository\SubscriberRepository;
use Doctrine\ORM\Mapping as ORM;

/**
 * One address on the mailing list. It only counts once confirmed from the email we send
 * (double opt-in). Unsubscribing deletes the row; unconfirmed rows are dropped after a week.
 */
#[ORM\Entity(repositoryClass: SubscriberRepository::class)]
#[ORM\UniqueConstraint(name: 'subscriber_email', columns: ['email'])]
#[ORM\UniqueConstraint(name: 'subscriber_token', columns: ['token'])]
class Subscriber
{
    #[ORM\Id]
    #[ORM\GeneratedValue]
    #[ORM\Column]
    private ?int $id = null;

    #[ORM\Column(length: 180)]
    private string $email;

    // in the confirm and unsubscribe links
    #[ORM\Column(length: 32)]
    private string $token;

    #[ORM\Column]
    private \DateTimeImmutable $createdAt;

    #[ORM\Column(nullable: true)]
    private ?\DateTimeImmutable $confirmedAt = null;

    public function __construct(string $email, \DateTimeImmutable $now)
    {
        $this->email = $email;
        $this->token = bin2hex(random_bytes(16));
        $this->createdAt = $now;
    }

    public function getEmail(): string
    {
        return $this->email;
    }

    public function getToken(): string
    {
        return $this->token;
    }

    public function getConfirmedAt(): ?\DateTimeImmutable
    {
        return $this->confirmedAt;
    }

    public function isConfirmed(): bool
    {
        return null !== $this->confirmedAt;
    }

    public function confirm(\DateTimeImmutable $now): void
    {
        $this->confirmedAt ??= $now;
    }

    /** Asked again before confirming: a fresh week and a fresh link. */
    public function renew(\DateTimeImmutable $now): void
    {
        $this->token = bin2hex(random_bytes(16));
        $this->createdAt = $now;
    }
}
