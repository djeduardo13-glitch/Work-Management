import { closeM } from '../components/modal.js';
import { goTab } from '../components/navigation.js';
import { changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, saveCr, togSP } from '../features/credentials/credentials.js';
import { delEv, openED, openEvM, saveEv, updEF } from '../features/home/events.js';
import { callContact, delFerieOggi, openActiveTr, openMap } from '../features/home/where.js';
import { showStraDetail } from '../features/hours/calc.js';
import { chDay, copyPrevDay, enableEditMode, goToday, saveAllOre, savePausa, saveTE2 } from '../features/hours/day.js';
import { delNote, openNoteEditor, saveNote } from '../features/hours/notes.js';
import { emailReport } from '../features/hours/report.js';
import { chCM, openTrFromPreview, showDD, showTrPreview } from '../features/profile/calendar.js';
import { delCurrentDayHours, delDayHours, delFerieFromProfile, editDayHours, showMonthDetail } from '../features/profile/month-detail.js';
import { swPTab } from '../features/profile/profile.js';
import { exportBackup, importBackup } from '../features/settings/backup.js';
import { exportPDF } from '../features/settings/pdf-export.js';
import { editPhone, enNotif, savePh, togN } from '../features/settings/settings.js';
import { copyRestoreLink } from '../features/sync/restore-link.js';
import { gistPull, gistSync, saveGistId, saveGistToken } from '../features/sync/sync.js';
import { addCLItem, togCL, togCLSec } from '../features/trips/checklist.js';
import { archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA } from '../features/trips/detail.js';
import { delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa } from '../features/trips/expenses.js';
import { addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput } from '../features/trips/form.js';
import { swTTab } from '../features/trips/list.js';
import { callTel, openMapsQuery } from '../lib/links.js';

// Registro di tutte le azioni richiamabili da data-action / data-change nel markup.
// Se aggiungi un bottone nuovo, esporta la funzione e aggiungila qui.


export const actions = {
  closeM,
  goTab,
  changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, saveCr, togSP,
  delEv, openED, openEvM, saveEv, updEF,
  callContact, delFerieOggi, openActiveTr, openMap,
  showStraDetail,
  chDay, copyPrevDay, enableEditMode, goToday, saveAllOre, savePausa, saveTE2,
  delNote, openNoteEditor, saveNote,
  emailReport,
  chCM, openTrFromPreview, showDD, showTrPreview,
  delCurrentDayHours, delDayHours, delFerieFromProfile, editDayHours, showMonthDetail,
  swPTab,
  exportBackup, importBackup,
  exportPDF,
  editPhone, enNotif, savePh, togN,
  copyRestoreLink,
  gistPull, gistSync, saveGistId, saveGistToken,
  addCLItem, togCL, togCLSec,
  archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA,
  delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa,
  addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput,
  swTTab,
  callTel, openMapsQuery,
};
