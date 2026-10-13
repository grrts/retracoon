<?php

namespace App\Service;

use Psr\Clock\ClockInterface;

/**
 * Board periods, all in UTC. A daily run lasts one calendar day, a season one calendar
 * month. Results that were queued on an offline phone still count for GRACE after the
 * period ends; prizes are paid once that grace is over.
 */
final class Periods
{
    public const GRACE = 'PT30M';

    public function __construct(private readonly ClockInterface $clock)
    {
    }

    public function now(): \DateTimeImmutable
    {
        return $this->clock->now()->setTimezone(new \DateTimeZone('UTC'));
    }

    public function today(): string
    {
        return $this->now()->format('Y-m-d');
    }

    public function season(): string
    {
        return $this->now()->format('Y-m');
    }

    /** The day whose results are still accepted, besides today (inside the grace), or null. */
    public function lateDay(): ?string
    {
        $then = $this->now()->sub(new \DateInterval(self::GRACE))->format('Y-m-d');

        return $then !== $this->today() ? $then : null;
    }

    /** Days before this one are closed and get paid. */
    public function firstOpenDay(): string
    {
        return $this->lateDay() ?? $this->today();
    }

    public function firstOpenSeason(): string
    {
        return $this->now()->sub(new \DateInterval(self::GRACE))->format('Y-m');
    }

    public function dayEndsAt(string $day): \DateTimeImmutable
    {
        return (new \DateTimeImmutable($day.' 00:00:00', new \DateTimeZone('UTC')))->modify('+1 day');
    }

    public function seasonEndsAt(string $season): \DateTimeImmutable
    {
        return (new \DateTimeImmutable($season.'-01 00:00:00', new \DateTimeZone('UTC')))->modify('+1 month');
    }

    public static function isDay(string $s): bool
    {
        return 1 === preg_match('/^\d{4}-\d{2}-\d{2}$/', $s) && false !== \DateTimeImmutable::createFromFormat('!Y-m-d', $s);
    }

    public static function isSeason(string $s): bool
    {
        return 1 === preg_match('/^\d{4}-\d{2}$/', $s);
    }
}
