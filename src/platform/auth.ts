// Getting a sign-in credential from Google, Apple or Steam. The server checks it
// (server/src/Service/AccountVerifier.php) and ties the player to that account.
import { SIGN_IN } from './config';
import { platform, steam } from './native';

export type Provider = 'google' | 'apple' | 'steam';

// Which buttons the sign-in screen shows. iPhone must offer Apple when it offers Google.
export function providers(): Provider[] {
  switch (platform()) {
    case 'steam':
      return ['steam'];
    case 'ios':
      return ['apple', 'google'];
    case 'android':
      return ['google'];
    default:
      return SIGN_IN.appleServiceId ? ['google', 'apple'] : ['google'];
  }
}

let ready: Promise<typeof import('@capgo/capacitor-social-login').SocialLogin> | null = null;

function social() {
  if (!ready)
    ready = (async () => {
      const { SocialLogin } = await import('@capgo/capacitor-social-login');
      await SocialLogin.initialize({
        google: {
          webClientId: SIGN_IN.googleWebClientId || undefined,
          iOSClientId: SIGN_IN.googleIosClientId || undefined,
          iOSServerClientId: SIGN_IN.googleWebClientId || undefined,
          mode: 'online',
        },
        apple: platform() === 'ios' ? { redirectUrl: '' } : SIGN_IN.appleServiceId ? { clientId: SIGN_IN.appleServiceId, redirectUrl: SIGN_IN.appleRedirectUrl } : undefined,
      });
      return SocialLogin;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  return ready;
}

export type Credential = { ok: true; credential: string; name?: string } | { ok: false; why: 'cancel' | 'error' };

export async function credential(p: Provider): Promise<Credential> {
  try {
    if (p === 'steam') {
      const s = steam();
      const ticket = s ? await s.ticket() : null;
      return ticket ? { ok: true, credential: ticket, name: s ? await s.name() : undefined } : { ok: false, why: 'error' };
    }
    const SocialLogin = await social();
    const res = await SocialLogin.login({ provider: p, options: p === 'google' ? { scopes: ['profile'] } : { scopes: [] } });
    const token = (res.result as { idToken?: string | null }).idToken;
    return token ? { ok: true, credential: token } : { ok: false, why: 'error' };
  } catch (e) {
    const msg = String((e as Error)?.message ?? e).toLowerCase();
    if (msg.includes('cancel')) return { ok: false, why: 'cancel' };
    console.warn('sign-in failed', e);
    return { ok: false, why: 'error' };
  }
}
