// The server's replay job. Fetches runs waiting for a replay, plays each one back on a
// checkout of the exact game build it was played on, and posts the results. Runs from
// .github/workflows/replay.yml; it can also be run by hand from a full clone:
//   API_URL=https://retracoon.example REPLAY_KEY=... npx tsx tools/replay-worker.ts
//
// A run whose build isn't a commit in this repository (a dev build, one with local
// changes, or one from before replays existed) can't be checked and is posted as
// unverifiable, which the server treats like a failed replay.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const API = (process.env.API_URL ?? '').replace(/\/$/, '');
const KEY = process.env.REPLAY_KEY ?? '';
const BATCH = 200;
const ROUNDS = 10; // later rounds pick up runs that waited on a run in this round
const ROOT = resolve(import.meta.dirname, '..');

interface Job {
  id: number;
  build: string;
  start: unknown;
  acts: unknown;
}
type Result = Record<string, unknown> & { id: number };

async function api(method: 'GET' | 'POST', path: string, body?: unknown) {
  const res = await fetch(`${API}/api/admin/replays${path}`, {
    method,
    headers: { 'X-Replay-Key': KEY, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${method} /api/admin/replays${path}: HTTP ${res.status}`);
  return res.json();
}

const git = (args: string[], cwd = ROOT) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

function isCommit(build: string) {
  if (!/^[0-9a-f]{40}$/.test(build)) return false;
  try {
    git(['cat-file', '-e', `${build}^{commit}`]);
    return true;
  } catch {
    return false;
  }
}

// Plays a batch of runs on one build. Returns null when the build can't replay at all.
function replayOn(build: string, jobs: Job[]): Result[] | null {
  if (!isCommit(build)) return null;
  const dir = mkdtempSync(join(tmpdir(), 'replay-'));
  try {
    git(['worktree', 'add', '--detach', dir, build]);
    if (!existsSync(join(dir, 'tools/replay.ts'))) return null;
    // Reuse this checkout's packages when the build pinned the same ones.
    const sameLock = readFileSync(join(dir, 'package-lock.json'), 'utf8') === readFileSync(join(ROOT, 'package-lock.json'), 'utf8');
    if (sameLock) symlinkSync(join(ROOT, 'node_modules'), join(dir, 'node_modules'), 'dir');
    else execFileSync('npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], { cwd: dir, stdio: 'inherit' });
    const input = JSON.stringify(jobs.map((j) => ({ id: j.id, start: j.start, acts: j.acts })));
    const out = execFileSync('npx', ['tsx', 'tools/replay.ts'], { cwd: dir, input, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });
    return JSON.parse(out) as Result[];
  } finally {
    try {
      git(['worktree', 'remove', '--force', dir]);
    } catch {
      rmSync(dir, { recursive: true, force: true });
    }
  }
}

async function main() {
  if (!API || !KEY) throw new Error('Set API_URL and REPLAY_KEY.');
  const seen = new Set<number>();
  for (let round = 0; round < ROUNDS; round++) {
    const { jobs } = (await api('GET', `?limit=${BATCH}`)) as { jobs: Job[] };
    const fresh = jobs.filter((j) => !seen.has(j.id));
    if (!fresh.length) break;
    const byBuild = new Map<string, Job[]>();
    for (const j of fresh) {
      seen.add(j.id);
      byBuild.set(j.build, [...(byBuild.get(j.build) ?? []), j]);
    }
    const results: Result[] = [];
    for (const [build, list] of byBuild) {
      let res: Result[] | null;
      try {
        res = replayOn(build, list);
      } catch (e) {
        // A broken checkout or install is our problem, not the player's: leave the runs waiting.
        console.error(`build ${build || '(none)'}: ${e}`);
        continue;
      }
      results.push(...(res ?? list.map((j) => ({ id: j.id, unverifiable: true }))));
      console.log(`build ${build || '(none)'}: ${list.length} run(s)${res ? '' : ', unverifiable'}`);
    }
    if (!results.length) break;
    const n = await api('POST', '', { results });
    console.log(`round ${round + 1}: ${JSON.stringify(n)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
