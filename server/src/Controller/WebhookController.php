<?php

namespace App\Controller;

use App\Entity\Purchase;
use App\Repository\PlayerRepository;
use App\Repository\PurchaseRepository;
use App\Service\Products;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\Routing\Attribute\Route;

/**
 * RevenueCat tells us about store purchases here. The game logs in to RevenueCat with
 * the player id, so app_user_id is our player. Gems and No Ads are granted on the
 * server, so they follow the Google/Apple account to any device.
 */
#[Route('/api/webhooks')]
final class WebhookController extends AbstractController
{
    public function __construct(
        private readonly EntityManagerInterface $em,
        private readonly PlayerRepository $players,
        private readonly PurchaseRepository $purchases,
        #[Autowire('%env(REVENUECAT_WEBHOOK_AUTH)%')] private readonly string $secret,
    ) {
    }

    #[Route('/revenuecat', methods: ['POST'])]
    public function revenuecat(Request $request): JsonResponse
    {
        // RevenueCat sends the Authorization header value set in its dashboard.
        $auth = (string) $request->headers->get('Authorization');
        if ('' === $this->secret || !hash_equals('Bearer '.$this->secret, $auth)) {
            throw new AccessDeniedHttpException('Bad webhook secret.');
        }
        $e = json_decode($request->getContent(), true)['event'] ?? null;
        if (!\is_array($e)) {
            return $this->json(['ok' => true, 'ignored' => 'no event']);
        }
        $type = (string) ($e['type'] ?? '');
        $tx = (string) ($e['transaction_id'] ?? '');
        $productId = (string) ($e['product_id'] ?? '');
        if ('' === $tx) {
            return $this->json(['ok' => true, 'ignored' => 'no transaction']);
        }

        if (\in_array($type, ['INITIAL_PURCHASE', 'NON_RENEWING_PURCHASE'], true)) {
            $product = Products::get($productId);
            $player = $this->players->find((string) ($e['app_user_id'] ?? ''));
            if (null === $product || null === $player) {
                // Unknown product or a purchase made before sign-in: nothing to credit.
                return $this->json(['ok' => true, 'ignored' => 'unknown player or product']);
            }
            if (null !== $this->purchases->find($tx)) {
                return $this->json(['ok' => true, 'duplicate' => true]);
            }
            $this->em->persist(new Purchase($tx, $player, $productId, $product['gems']));
            $player->addGems($product['gems']);
            if ($product['noAds']) {
                $player->setNoAds(true);
            }
            $this->em->flush();

            return $this->json(['ok' => true]);
        }

        // Refunds of one-time purchases arrive as CANCELLATION: take back what it gave.
        if ('CANCELLATION' === $type) {
            $p = $this->purchases->find($tx);
            if (null !== $p && !$p->isRefunded()) {
                $p->markRefunded();
                $p->getPlayer()->addGems(-$p->getGems());
                if (Products::get($p->getProductId())['noAds'] ?? false) {
                    $p->getPlayer()->setNoAds(false);
                }
                $this->em->flush();
            }
        }

        return $this->json(['ok' => true]);
    }
}
