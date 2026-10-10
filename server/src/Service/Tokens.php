<?php

namespace App\Service;

/**
 * Random ids, friend codes and API tokens.
 */
final class Tokens
{
    // No 0/O, 1/I/L: friend codes get read out loud and typed on phones.
    private const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

    public static function id(): string
    {
        return bin2hex(random_bytes(8));
    }

    public static function friendCode(): string
    {
        $code = '';
        for ($i = 0; $i < 6; ++$i) {
            $code .= self::CODE_ALPHABET[random_int(0, \strlen(self::CODE_ALPHABET) - 1)];
        }

        return $code;
    }

    public static function apiToken(): string
    {
        return rtrim(strtr(base64_encode(random_bytes(32)), '+/', '-_'), '=');
    }

    public static function hash(string $token): string
    {
        return hash('sha256', $token);
    }
}
