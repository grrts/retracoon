<?php

namespace App\Controller;

use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\DependencyInjection\Attribute\Autowire;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Routing\Attribute\Route;

/**
 * Plain web pages the stores ask for. Google Play needs a web link where players can
 * ask for their account to be deleted without the app installed.
 */
final class PageController extends AbstractController
{
    public function __construct(#[Autowire('%env(SUPPORT_EMAIL)%')] private readonly string $email)
    {
    }

    #[Route('/account/delete', methods: ['GET'])]
    public function deleteAccount(): Response
    {
        $mail = htmlspecialchars($this->email);
        $subject = rawurlencode('Delete my Retracoon account');
        $contact = '' !== $mail
            ? "<p>No longer have the game? Email <a href=\"mailto:$mail?subject=$subject\">$mail</a> from any address and tell us your player name with its tag (for example <b>SNEAKY BANDIT#1234</b>) and whether you signed in with Google, Apple or Steam. We confirm with you, then delete the account within 30 days.</p>"
            : '';
        $html = <<<HTML
<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Delete your Retracoon account</title>
<style>body{font:16px/1.5 system-ui,sans-serif;max-width:640px;margin:40px auto;padding:0 16px;background:#1a1c2c;color:#f4f4f4}a{color:#73eff7}h1{color:#ffcd75}</style>
</head><body>
<h1>Delete your Retracoon account</h1>
<p><b>In the game:</b> open <b>Scores</b>, tap <b>Account</b>, then <b>Delete account</b> and type DELETE. It happens right away.</p>
$contact
<p><b>What is deleted:</b> your player name and tag, scores, friends list, gem balance, skins bought with gems, the record of your purchases, and the link to your Google, Apple or Steam account. Store receipts kept by Google, Apple or Steam themselves are covered by their own policies.</p>
<p>Progress saved on your device (levels, Bottle Caps) stays there until you uninstall the game.</p>
</body></html>
HTML;

        return new Response($html, 200, ['Content-Type' => 'text/html; charset=utf-8']);
    }
}
