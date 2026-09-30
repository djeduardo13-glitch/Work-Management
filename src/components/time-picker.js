import { closeM, openM } from './modal.js';
import { v } from '../lib/format.js';

// Selettore orario: su Android apre l'orologio di sistema (input type="time").

let onPick = null;

/**
 * @param {{title: string, value?: string, ok?: string, onOk: (value: string) => void}} opts
 */
export function openTimePicker({ title, value = '', ok = 'Conferma', onOk }) {
  onPick = onOk;
  document.getElementById('tpTitle').textContent = title;
  document.getElementById('tpOk').textContent = ok;
  const input = document.getElementById('tpIn');
  input.value = value;
  openM('tpm');
  setTimeout(() => {
    input.focus();
    try { input.showPicker?.(); } catch {}
  }, 250);
}

export function tpConfirm() {
  const v = document.getElementById('tpIn').value;
  if (!/^\d{2}:\d{2}$/.test(v)) return;
  closeM('tpm');
  const cb = onPick;
  onPick = null;
  cb?.(v);
}
