<?php

namespace App\Security;

use App\Repository\SessionRepository;
use App\Service\Tokens;
use Symfony\Component\Security\Core\Exception\BadCredentialsException;
use Symfony\Component\Security\Http\AccessToken\AccessTokenHandlerInterface;
use Symfony\Component\Security\Http\Authenticator\Passport\Badge\UserBadge;

/**
 * "Authorization: Bearer <token>" -> the player that token was issued to.
 */
final class ApiTokenHandler implements AccessTokenHandlerInterface
{
    public function __construct(private readonly SessionRepository $sessions)
    {
    }

    public function getUserBadgeFrom(#[\SensitiveParameter] string $accessToken): UserBadge
    {
        $player = $this->sessions->find(Tokens::hash($accessToken))?->getPlayer();
        if (null === $player) {
            throw new BadCredentialsException('Invalid token.');
        }

        return new UserBadge($player->getId(), fn () => $player);
    }
}
