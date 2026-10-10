<?php

namespace App\Controller;

use App\Dto\FriendCode;
use App\Entity\Friendship;
use App\Entity\Player;
use App\Repository\FriendshipRepository;
use App\Repository\PlayerRepository;
use App\Service\Present;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\ConflictHttpException;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api/me/friends')]
#[IsGranted('ROLE_PLAYER')]
final class FriendController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
        private readonly FriendshipRepository $friendships,
    ) {
    }

    /** You and your friends, best first. */
    #[Route('', methods: ['GET'])]
    public function list(#[CurrentUser] Player $me): JsonResponse
    {
        return $this->json(['players' => Present::board($this->players->withFriends($me))]);
    }

    /** Add a friend by their code. Both of you see each other from then on. */
    #[Route('', methods: ['POST'])]
    public function add(#[CurrentUser] Player $me, #[MapRequestPayload] FriendCode $input, RateLimiterFactoryInterface $friendLimiter): JsonResponse
    {
        // Guessing codes would let someone find random players; keep that slow.
        if (!$friendLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Too many tries. Wait a bit.');
        }
        $code = strtoupper(trim($input->code));
        $friend = $this->players->findOneByFriendCode($code) ?? throw $this->createNotFoundException('No player with that code.');
        if ($friend === $me) {
            throw new UnprocessableEntityHttpException("That's your own code.");
        }
        if ($this->friendships->exists($me, $friend)) {
            throw new ConflictHttpException('Already friends.');
        }
        if ($this->friendships->countFor($me) >= FriendshipRepository::MAX_FRIENDS || $this->friendships->countFor($friend) >= FriendshipRepository::MAX_FRIENDS) {
            throw new UnprocessableEntityHttpException('Friends list is full.');
        }
        $this->em->persist(new Friendship($me, $friend));
        if (!$this->friendships->exists($friend, $me)) {
            $this->em->persist(new Friendship($friend, $me));
        }
        $this->em->flush();

        return $this->json(['friend' => Present::row($friend, $this->players->rankOf($friend))], 201);
    }

    #[Route('/{id}', methods: ['DELETE'], requirements: ['id' => '[0-9a-f]{16}'])]
    public function remove(#[CurrentUser] Player $me, string $id): Response
    {
        $friend = $this->players->find($id) ?? throw $this->createNotFoundException('No such player.');
        $this->friendships->unlink($me, $friend);

        return new Response(null, 204);
    }
}
