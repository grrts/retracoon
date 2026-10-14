<?php

namespace App\Dto;

use Symfony\Component\Validator\Constraints as Assert;

/**
 * Tracking events from one install. The device id is random, made on the device.
 */
final class EventBatch
{
    /**
     * @param list<array{name?: mixed, at?: mixed, props?: mixed}> $events
     */
    public function __construct(
        #[Assert\Regex('/^[a-z0-9-]{8,36}$/')]
        public readonly string $device,
        #[Assert\Choice(choices: ['web', 'android', 'ios', 'steam'])]
        public readonly string $platform,
        #[Assert\Regex('/^[0-9A-Za-z.+-]{1,16}$/')]
        public readonly string $version,
        #[Assert\Count(min: 1, max: 50)]
        public readonly array $events,
    ) {
    }
}
