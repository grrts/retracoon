<?php

namespace App\Security;

use App\Repository\PlayerRepository;
use App\Service\Tokens;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * "Authorization: Bearer <token>" -> the player that token was issued to.
 */
final class ApiTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(private readonly PlayerRepository $players)
    {
    }

    public function getUserBadgeFrom(#[\SensitiveParameter] string $accessToken): UserBadge
    {
        $player = $this->players->findOneByTokenHash(Tokens::hash($accessToken));
        if (null === $player) {
            throw new BadCredentialsException('Invalid token.');
        }

        return new UserBadge($player->getId(), fn () => $player);
    }
}
