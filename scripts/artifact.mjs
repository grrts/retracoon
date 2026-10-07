// Turns the single-file build into a page fragment (no <html>/<head>/<body>) for hosts
// that wrap the content in their own document skeleton.
import { readFileSync, writeFileSync } from 'node:fs';

const [src = 'dist-single/index.html', out = 'dist-single/retracoon.html'] = process.argv.slice(2);
const html = readFileSync(src, 'utf8');
const pick = (re) => [...html.matchAll(re)].map((m) => m[0]).join('\n');
const title = pick(/<title>[\s\S]*?<\/title>/g);
const styles = pick(/<style[\s\S]*?<\/style>/g);
const scripts = pick(/<script[\s\S]*?<\/script>/g);
const body = (html.match(/<body>([\s\S]*?)<\/body>/) ?? [, ''])[1].replace(/<script[\s\S]*?<\/script>/g, '');
writeFileSync(out, `${title}\n${styles}\n${body.trim()}\n${scripts}\n`);
console.log(`wrote ${out}`);
