// Hands a run card to whatever this device shares with: the native share sheet on
// phones (Capacitor Share), the Web Share API in browsers that have it, and on Steam
// and desktop browsers the image is saved and the line copied to the clipboard.
import { isNative, isSteam } from './native';

export type ShareResult = 'shared' | 'saved' | 'cancelled' | 'failed';

const FILE = 'retracoon-run.png';

export function blobToBase64(b: Blob): Promise<string> {
  return new Promise((ok, fail) => {
    const fr = new FileReader();
    fr.onload = () => ok(String(fr.result).replace(/^data:[^,]*,/, ''));
    fr.onerror = () => fail(fr.error);
    fr.readAsDataURL(b);
  });
}

const cancelled = (e: unknown) => /cancel|abort/i.test(String((e as Error)?.name) + String((e as Error)?.message ?? e));

async function copy(s: string) {
  try {
    await navigator.clipboard.writeText(s);
    return true;
  } catch {
    return false;
  }
}

function download(png: Blob) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(png);
  a.download = FILE;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

// line: the text to share; url: the run's page, or the website.
export async function shareCard(png: Blob, line: string, url: string): Promise<ShareResult> {
  const message = `${line}\n${url}`;
  if (isNative()) {
    try {
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      const { Share } = await import('@capacitor/share');
      const { uri } = await Filesystem.writeFile({ path: FILE, data: await blobToBase64(png), directory: Directory.Cache });
      await Share.share({ title: 'Retracoon', text: message, files: [uri], dialogTitle: 'Share your run' });
      return 'shared';
    } catch (e) {
      return cancelled(e) ? 'cancelled' : 'failed';
    }
  }
  if (!isSteam() && typeof navigator.share === 'function') {
    const file = new File([png], FILE, { type: 'image/png' });
    try {
      if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], text: message });
      else await navigator.share({ title: 'Retracoon', text: line, url });
      return 'shared';
    } catch (e) {
      if (cancelled(e)) return 'cancelled';
      // fall through to saving it
    }
  }
  try {
    download(png);
    await copy(message);
    return 'saved';
  } catch {
    return 'failed';
  }
}
