// Replays finished runs for the server: reads a JSON list of jobs on stdin and writes
// a JSON list of results on stdout, one per job, in order. The server's replay job
// (tools/replay-worker.ts) runs this from a checkout of each run's game build, so the
// rules are exactly the ones the player had. Keep this input and output stable: older
// builds run their own copy of this file.
//   echo '[{"id":"1","start":{...},"acts":[...]}]' | npx tsx tools/replay.ts
//
// job:    { id, start: ReplayStart, acts: Act[] }
// result: { id, ok, reason?, at?, end, stage, level, distance, ms, close }
import { readFileSync } from 'node:fs';
import { loadContent } from '../src/content';
import { replay, type ReplayStart } from '../src/game/replay';

loadContent();

const jobs = JSON.parse(readFileSync(0, 'utf8')) as { id: string; start: ReplayStart; acts: unknown }[];
const out = jobs.map((j) => {
  try {
    return { id: j.id, ...replay(j.start, j.acts) };
  } catch (e) {
    return { id: j.id, ok: false, reason: 'crash', error: String(e) };
  }
});
process.stdout.write(JSON.stringify(out));
