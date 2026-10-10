<?php

namespace App\Controller;

use App\Dto\ProfileInput;
use App\Dto\RunResult;
use App\Dto\Spend;
use App\Entity\Player;
use App\Entity\Purchase;
use App\Entity\Session;
use App\Repository\PlayerRepository;
use App\Service\Names;
use App\Service\Present;
use App\Service\Tags;
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

#[Route('/api')]
final class PlayerController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
        private readonly Tags $tags,
    ) {
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
            if ($name !== $me->getName()) {
                $tag = $this->tags->free($name) ?? throw new ConflictHttpException('That name is full. Pick another.');
                $me->setName($name, $tag);
            }
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

    /**
     * Spend gems on an unlock (a skin). Gems live on the server so they follow the
     * account; asking for the same unlock twice only charges once.
     */
    #[Route('/me/spend', methods: ['POST'])]
    #[IsGranted('ROLE_PLAYER')]
    public function spend(#[CurrentUser] Player $me, #[MapRequestPayload] Spend $in): JsonResponse
    {
        if (!$me->spend($in->gems, $in->item)) {
            throw new ConflictHttpException('Not enough gems.');
        }
        $this->em->flush();

        return $this->json(['player' => Present::me($me, $this->players->rankOf($me))]);
    }

    /** Deletes the player, their scores, friendships, purchases and sign-ins. */
    #[Route('/me', methods: ['DELETE'])]
    #[IsGranted('ROLE_PLAYER')]
    public function delete(#[CurrentUser] Player $me): Response
    {
        // Explicit as well as ON DELETE CASCADE, for databases that don't enforce it.
        foreach ([Session::class, Purchase::class] as $class) {
            $this->em->createQuery("DELETE FROM $class x WHERE x.player = :p")->setParameter('p', $me)->execute();
        }
        $this->em->remove($me);
        $this->em->flush();

        return new Response(null, 204);
    }
}
