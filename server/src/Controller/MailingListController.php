<?php

namespace App\Controller;

use App\Entity\Subscriber;
use App\Repository\SubscriberRepository;
use App\Service\Periods;
use Doctrine\ORM\EntityManagerInterface;
use Psr\Log\LoggerInterface;
use Symfony\Bridge\Twig\Mime\TemplatedEmail;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Mailer\Exception\TransportExceptionInterface;
use Symfony\Component\Mailer\MailerInterface;
use Symfony\Component\Mime\Address;
use Symfony\Component\RateLimiter\RateLimiterFactoryInterface;
use Symfony\Component\Routing\Attribute\Route;
use Symfony\Component\Routing\Generator\UrlGeneratorInterface;
use Symfony\Component\Validator\Constraints as Assert;
use Symfony\Component\Validator\Validator\ValidatorInterface;

/**
 * The launch mailing list: email only, double opt-in. Signing up sends a confirm link;
 * the address is on the list once that link is used. Every mail carries an unsubscribe
 * link, which deletes the address. Confirm and unsubscribe links open a page with a
 * button (a POST) so mail scanners that open links cannot act on them; the unsubscribe
 * POST also serves one-click List-Unsubscribe-Post. Export the list with
 * `app:mailing-list:export`. Put the form on any page with
 * {% include 'list/_signup.html.twig' %}.
 */
#[Route('/list', format: 'html')]
final class MailingListController extends AbstractController
{
    public function __construct(
        private readonly SubscriberRepository $subscribers,
        private readonly EntityManagerInterface $em,
        private readonly Periods $periods,
    ) {
    }

    #[Route('', name: 'list', methods: ['GET'])]
    public function form(): Response
    {
        return $this->page('form');
    }

    #[Route('', name: 'list_subscribe', methods: ['POST'])]
    public function subscribe(
        Request $request,
        ValidatorInterface $validator,
        MailerInterface $mailer,
        LoggerInterface $logger,
        RateLimiterFactoryInterface $signupLimiter,
        #[Autowire('%env(MAILER_FROM)%')] string $from,
    ): Response {
        $email = strtolower(trim((string) $request->request->get('email', '')));
        // Bots fill the hidden field; tell them it worked.
        if ('' !== (string) $request->request->get('website', '')) {
            return $this->page('check');
        }
        if (\count($validator->validate($email, [new Assert\NotBlank(), new Assert\Length(max: 180), new Assert\Email(mode: Assert\Email::VALIDATION_MODE_STRICT)]))) {
            return $this->page('form', ['error' => 'That does not look like an email address.', 'email' => $email], 422);
        }
        if (!$signupLimiter->create($request->getClientIp() ?? 'none')->consume()->isAccepted()) {
            return $this->page('form', ['error' => 'Too many sign-ups from here. Try again in an hour.', 'email' => $email], 429);
        }

        $now = $this->periods->now();
        $this->subscribers->purgeUnconfirmed($now);
        $sub = $this->subscribers->findOneBy(['email' => $email]);
        // Already on the list: say the same as for a new address, send nothing.
        if ($sub?->isConfirmed()) {
            return $this->page('check');
        }
        if ($sub) {
            $sub->renew($now);
        } else {
            $this->em->persist($sub = new Subscriber($email, $now));
        }
        $this->em->flush();

        try {
            $mailer->send((new TemplatedEmail())
                ->from(Address::create($from))
                ->to($email)
                ->subject('Confirm: Retracoon news')
                ->textTemplate('email/confirm.txt.twig')
                ->htmlTemplate('email/confirm.html.twig')
                ->context(['link' => $this->generateUrl('list_confirm', ['token' => $sub->getToken()], UrlGeneratorInterface::ABSOLUTE_URL)]));
        } catch (TransportExceptionInterface $e) {
            $logger->error('Mailing list confirm mail failed: {error}', ['error' => $e->getMessage()]);

            return $this->page('form', ['error' => 'We could not send the email just now. Try again later.', 'email' => $email], 503);
        }

        return $this->page('check');
    }

    #[Route('/confirm/{token}', name: 'list_confirm', methods: ['GET', 'POST'], requirements: ['token' => '[0-9a-f]{32}'])]
    public function confirm(string $token, Request $request): Response
    {
        $sub = $this->subscribers->findOneBy(['token' => $token]);
        if (!$sub) {
            return $this->page('invalid', [], 404);
        }
        if (!$request->isMethod('POST') && !$sub->isConfirmed()) {
            return $this->page('confirm', ['token' => $token]);
        }
        $sub->confirm($this->periods->now());
        $this->em->flush();

        return $this->page('confirmed', ['token' => $token]);
    }

    #[Route('/unsubscribe/{token}', name: 'list_unsubscribe', methods: ['GET', 'POST'], requirements: ['token' => '[0-9a-f]{32}'])]
    public function unsubscribe(string $token, Request $request): Response
    {
        $sub = $this->subscribers->findOneBy(['token' => $token]);
        if (!$request->isMethod('POST')) {
            return $sub ? $this->page('unsubscribe', ['token' => $token]) : $this->page('unsubscribed');
        }
        if ($sub) {
            $this->em->remove($sub);
            $this->em->flush();
        }

        return $this->page('unsubscribed');
    }

    /** @param array<string, mixed> $vars */
    private function page(string $state, array $vars = [], int $status = 200): Response
    {
        $res = $this->render('list/page.html.twig', $vars + ['state' => $state, 'error' => null, 'email' => '', 'token' => null]);
        $res->setStatusCode($status);
        $res->headers->set('X-Robots-Tag', 'noindex');

        return $res;
    }
}
