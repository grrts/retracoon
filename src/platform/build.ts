// The commit this build of the game was made from (vite.config.ts fills it in). The
// server's replay job checks a run out at this commit, so it replays the exact rules
// the player had. 'dev' (tsx tools) and '-dirty' builds can't be replayed.
declare const __BUILD__: string | undefined;

export const BUILD: string = typeof __BUILD__ === 'string' ? __BUILD__ : 'dev';
