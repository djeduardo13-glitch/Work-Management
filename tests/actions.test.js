// Ogni data-action / data-change usato nel markup deve essere registrato in actions.registry.js,
// altrimenti il pulsante non fa nulla (in console: "azione sconosciuta").
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

function files(dir) {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('tutte le azioni del markup sono registrate', () => {
  const sources = ['index.html', ...files('src')];
  const used = new Set();
  for (const f of sources) {
    for (const m of readFileSync(f, 'utf8').matchAll(/data-(?:action|change)="([A-Za-z_]\w*)"/g)) used.add(m[1]);
  }
  const reg = readFileSync('src/app/actions.registry.js', 'utf8');
  const block = reg.slice(reg.indexOf('export const actions'));
  const registered = new Set(block.match(/\b[A-Za-z_]\w*\b/g));
  const missing = [...used].filter((n) => !registered.has(n)).sort();
  // nomi d'azione costruiti a runtime non sono verificabili: vietati
  const dynamic = sources.filter((f) => /data-(?:action|change)="\$\{/.test(readFileSync(f, 'utf8')));
  assert.deepEqual(dynamic, [], 'Azioni con nome dinamico in: ' + dynamic.join(', '));
  assert.deepEqual(missing, [], 'Azioni non registrate: ' + missing.join(', '));
});
