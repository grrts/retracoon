import { execSync } from 'node:child_process';
import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// The commit the game is built from, so the server can replay its runs with the same
// rules (src/platform/build.ts). Local changes to the game make it '-dirty'.
function build() {
  if (process.env.GITHUB_SHA) return process.env.GITHUB_SHA;
  try {
    const sha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
    const dirty = execSync('git status --porcelain -- src', { encoding: 'utf8' }).trim();
    return dirty ? `${sha}-dirty` : sha;
  } catch {
    return 'dev';
  }
}

// `--mode single` inlines everything into one HTML file (handy for sharing a build).
// The default build uses relative paths so it works from a GitHub Pages subfolder.
export default defineConfig(({ mode }) => ({
  base: './',
  define: { __BUILD__: JSON.stringify(build()) },
  plugins: mode === 'single' ? [viteSingleFile()] : [],
  build: {
    outDir: mode === 'single' ? 'dist-single' : 'dist',
    chunkSizeWarningLimit: 2000,
  },
}));
