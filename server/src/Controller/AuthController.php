<?php

namespace App\Controller;

use App\Dto\SignIn;
use App\Entity\Player;
use App\Entity\Session;
use App\Repository\PlayerRepository;
use App\Service\IdentityVerifier;
use App\Service\Names;
use App\Service\Present;
use App\Service\Tags;
use App\Service\Tokens;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnauthorizedHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class AuthController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
        private readonly IdentityVerifier $verifier,
        private readonly Tags $tags,
    ) {
    }

    /**
     * Sign in with Google, Apple or Steam. The first time, this makes the player (with a
     * free NAME#1234); after that, any device signing in with the same account gets the
     * same player back. Each sign-in returns a new token for that device.
     */
    #[Route('/auth', methods: ['POST'])]
    public function signIn(Request $request, RateLimiterFactoryInterface $registerLimiter, #[MapRequestPayload] SignIn $in): JsonResponse
    {
        if (!$registerLimiter->create($request->getClientIp() ?? 'unknown')->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Too many sign-ins from this address. Try again later.');
        }
        $subject = $this->verifier->verify($in->provider, $in->credential)
            ?? throw new UnauthorizedHttpException('Bearer', 'That sign-in could not be checked. Try again.');

        $player = $this->players->findOneByAccount($in->provider, $subject);
        $created = null === $player;
        if ($created) {
            $name = Names::clean($in->name) ?? Names::random();
            $tag = $this->tags->free($name) ?? throw new ConflictHttpException('That name is full. Pick another.');
            do {
                $code = Tokens::friendCode();
            } while (null !== $this->players->findOneByFriendCode($code));
            $player = new Player(Tokens::id(), $name, $tag, $code, $in->provider, $subject);
            if (null !== ($skin = Names::skin($in->skin))) {
                $player->setSkin($skin);
            }
            $this->em->persist($player);
        }
        $token = Tokens::apiToken();
        $this->em->persist(new Session(Tokens::hash($token), $player));
        $this->em->flush();

        return $this->json(['token' => $token, 'created' => $created, 'player' => Present::me($player, $this->players->rankOf($player))], $created ? 201 : 200);
    }
}
