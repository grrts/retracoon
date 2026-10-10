// A small HTML text box over the game, for names and friend codes (Phaser has no text
// input of its own). Resolves with the text, or null if cancelled.
export function askText(title: string, initial = '', maxLength = 16): Promise<string | null> {
  return new Promise((resolve) => {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;background:rgba(26,28,44,.85);display:flex;align-items:center;justify-content:center;z-index:10;font:bold 16px monospace;';
    const box = document.createElement('form');
    box.style.cssText = 'background:#29366f;border:3px solid #1a1c2c;box-shadow:0 0 0 2px #3b5dc9;padding:14px;display:flex;flex-direction:column;gap:10px;min-width:240px;max-width:90vw;color:#ffcd75;text-transform:uppercase;';
    const label = document.createElement('div');
    label.textContent = title;
    const input = document.createElement('input');
    input.value = initial;
    input.maxLength = maxLength;
    input.autocapitalize = 'characters';
    input.autocomplete = 'off';
    input.spellcheck = false;
    input.style.cssText = 'font:bold 18px monospace;text-transform:uppercase;padding:6px 8px;border:2px solid #1a1c2c;background:#f4f4f4;color:#1a1c2c;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;';
    const btn = (txt: string, bg: string) => {
      const b = document.createElement('button');
      b.textContent = txt;
      b.style.cssText = `font:bold 14px monospace;padding:6px 12px;border:2px solid #1a1c2c;background:${bg};color:#f4f4f4;`;
      return b;
    };
    const cancel = btn('CANCEL', '#b13e53');
    cancel.type = 'button';
    const ok = btn('OK', '#257179');
    ok.type = 'submit';
    row.append(cancel, ok);
    box.append(label, input, row);
    wrap.append(box);
    document.body.append(wrap);
    // Keys typed here must not reach the game.
    const stop = (e: Event) => e.stopPropagation();
    wrap.addEventListener('keydown', stop);
    wrap.addEventListener('keyup', stop);
    wrap.addEventListener('pointerdown', stop);
    const done = (v: string | null) => {
      wrap.remove();
      resolve(v);
    };
    cancel.onclick = () => done(null);
    box.onsubmit = (e) => {
      e.preventDefault();
      done(input.value);
    };
    setTimeout(() => input.focus(), 30);
  });
}
