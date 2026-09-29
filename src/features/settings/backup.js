import { toast } from '../../components/toast.js';
import { sanitizeData } from '../../core/schema.js';
import { S } from '../../core/state.js';
import { applyData, exportableData, save } from '../../core/storage.js';
import { lock } from '../credentials/vault.js';
import { renderEvs } from '../home/events.js';
import { chkWhere } from '../home/where.js';
import { renderPOre } from '../profile/calendar.js';
import { fd } from '../../lib/dates.js';
import { v } from '../../lib/format.js';

const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** Il backup NON contiene il token GitHub; le credenziali sono solo in forma cifrata. */
export function exportBackup() {
  const data = JSON.stringify({ ...exportableData(), exportedAt: new Date().toISOString(), app: 'work-manager', v: 2 }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'workmanager-backup-' + fd(new Date()) + '.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('Backup scaricato!');
}

export function importBackup() {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > MAX_BACKUP_BYTES) {
      toast('File troppo grande', true);
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const d = sanitizeData(JSON.parse(ev.target.result));
        if (!d.evs && !d.dd && !d.trs) {
          toast('File non valido', true);
          return;
        }
        if (!confirm('Sovrascrivere tutti i dati attuali con il backup?')) return;
        lock();
        S.vault = null;
        S.legacyCreds = [];
        applyData(d);
        save();
        renderEvs();
        chkWhere();
        renderPOre();
        if (S.phone) document.getElementById('phTxt').textContent = S.phone;
        toast('Ripristino completato!');
      } catch {
        toast('Errore nel file', true);
      }
    };
    reader.readAsText(file);
  };
  inp.click();
}
