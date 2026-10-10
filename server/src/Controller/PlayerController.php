<?php

namespace App\Controller;

use App\Dto\ProfileInput;
use App\Dto\RunResult;
use App\Entity\Player;
use App\Repository\PlayerRepository;
use App\Service\Names;
use App\Service\Present;
use App\Service\Tokens;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpKernel\Attribute\MapRequestPayload;
use Symfony\Component\HttpKernel\Exception\TooManyRequestsHttpException;
use Symfony\Component\HttpKernel\Exception\UnprocessableEntityHttpException;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Security\Http\Attribute\CurrentUser;
use Symfony\Component\Security\Http\Attribute\IsGranted;

#[Route('/api')]
final class PlayerController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
    ) {
    }

    /**
     * First launch: make a player and hand back its token. The game stores the token
     * and uses it from then on; it is never shown again.
     */
    #[Route('/players', methods: ['POST'])]
    public function register(Request $request, RateLimiterFactoryInterface $registerLimiter, #[MapRequestPayload] ?ProfileInput $input = null): JsonResponse
    {
        if (!$registerLimiter->create($request->getClientIp() ?? 'unknown')->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Too many new players from this address. Try again later.');
        }
        $name = Names::clean($input?->name) ?? Names::random();
        $token = Tokens::apiToken();
        // 31^6 codes, so a clash is rare; the unique index still guards against a race.
        do {
            $code = Tokens::friendCode();
        } while (null !== $this->players->findOneByFriendCode($code));
        $player = new Player(Tokens::id(), $name, $code, Tokens::hash($token));
        if (null !== ($skin = Names::skin($input?->skin))) {
            $player->setSkin($skin);
        }
        $this->em->persist($player);
        $this->em->flush();

        return $this->json(['token' => $token, 'player' => Present::me($player, null)], 201);
    }

    #[Route('/me', methods: ['GET'])]
    #[IsGranted('ROLE_PLAYER')]
    public function me(#[CurrentUser] Player $me): JsonResponse
    {
        return $this->json(['player' => Present::me($me, $this->players->rankOf($me))]);
    }

    #[Route('/me', methods: ['PATCH'])]
    #[IsGranted('ROLE_PLAYER')]
    public function update(#[CurrentUser] Player $me, #[MapRequestPayload] ProfileInput $input): JsonResponse
    {
        if (null !== $input->name) {
            $name = Names::clean($input->name) ?? throw new UnprocessableEntityHttpException('Names need 3-16 letters or numbers.');
            $me->setName($name);
        }
        if (null !== $input->skin) {
            $me->setSkin($input->skin);
        }
        $this->em->flush();

        return $this->json(['player' => Present::me($me, $this->players->rankOf($me))]);
    }

    /**
     * End of a run. Bests only go up, so sending an old or worse result is harmless.
     */
    #[Route('/me/runs', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function run(#[CurrentUser] Player $me, #[MapRequestPayload] RunResult $run, RateLimiterFactoryInterface $runLimiter): JsonResponse
    {
        if (!$runLimiter->create($me->getId())->consume()->isAccepted()) {
            throw new TooManyRequestsHttpException(null, 'Slow down.');
        }
        $improved = $me->recordRun($run->stage, $run->level, $run->distance);
        if (null !== $run->skin) {
            $me->setSkin($run->skin);
        }
        $this->em->flush();

        return $this->json(['improved' => $improved, 'player' => Present::me($me, $this->players->rankOf($me))]);
    }

    /** Deletes the player, their scores and their friendships. */
    #[Route('/me', methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function delete(#[CurrentUser] Player $me): Response
    {
        $this->em->remove($me);
        $this->em->flush();

        return new Response(null, 204);
    }
}
