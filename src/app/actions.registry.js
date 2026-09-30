// Registro di tutte le azioni richiamabili da data-action / data-change nel markup.
// Se aggiungi un bottone nuovo, esporta la funzione e aggiungila qui.

import { closeM } from '../components/modal.js';
import { goTab, openSyncSettings } from '../components/navigation.js';
import { tpConfirm } from '../components/time-picker.js';
import { changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, openCredUrl, saveCr, togSP } from '../features/credentials/credentials.js';
import { delEv, openEvM, saveEv, updEF } from '../features/home/events.js';
import { delFerieOggi, openActiveTr } from '../features/home/where.js';
import { addOut, clearDay, dePause, fillStandard, openDayEditor, rmOut, saveDay } from '../features/hours/day-editor.js';
import { oreMonth, oreToggleAll } from '../features/hours/month.js';
import { delNote, openNoteEditor, saveNote } from '../features/hours/notes.js';
import { openPermitPlanner, ppKind, savePermit } from '../features/hours/permit-planner.js';
import { chCM, openTrFromPreview, showDD, showTrPreview } from '../features/profile/calendar.js';
import { delDayHours, delFerieFromProfile, editDayHours, showMonthDetail } from '../features/profile/month-detail.js';
import { swPTab } from '../features/profile/profile.js';
import { exportBackup, importBackup } from '../features/settings/backup.js';
import { editPhone, enNotif, savePh, togN } from '../features/settings/settings.js';
import { copyRestoreLink } from '../features/sync/restore-link.js';
import { gistPull, gistSync, saveGistId, saveGistToken } from '../features/sync/sync.js';
import { comeBackAt, comeBackNow, confirmExit, confirmStandard, editEntry, editFromRecap, editOut, goOut, pickEntry, registerExit, setEntry, setPause, showExitRecap } from '../features/today/today.js';
import { addCLItem, togCL } from '../features/trips/checklist.js';
import { addSpesaCur, archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA } from '../features/trips/detail.js';
import { delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa, spPhotoPicked, spPhotoRemove, spPhotoView } from '../features/trips/expenses.js';
import { addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput } from '../features/trips/form.js';
import { swTTab } from '../features/trips/list.js';
import { callTel, openMapsQuery } from '../lib/links.js';

export const actions = {
  closeM,
  goTab, openSyncSettings,
  tpConfirm,
  changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, openCredUrl, saveCr, togSP,
  delEv, openEvM, saveEv, updEF,
  delFerieOggi, openActiveTr,
  addOut, clearDay, dePause, fillStandard, openDayEditor, rmOut, saveDay,
  oreMonth, oreToggleAll,
  delNote, openNoteEditor, saveNote,
  openPermitPlanner, ppKind, savePermit,
  chCM, openTrFromPreview, showDD, showTrPreview,
  delDayHours, delFerieFromProfile, editDayHours, showMonthDetail,
  swPTab,
  exportBackup, importBackup,
  editPhone, enNotif, savePh, togN,
  copyRestoreLink,
  gistPull, gistSync, saveGistId, saveGistToken,
  comeBackAt, comeBackNow, confirmExit, confirmStandard, editEntry, editFromRecap, editOut, goOut, pickEntry, registerExit, setEntry, setPause, showExitRecap,
  addCLItem, togCL,
  addSpesaCur, archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA,
  delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa, spPhotoPicked, spPhotoRemove, spPhotoView,
  addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput,
  swTTab,
  callTel, openMapsQuery,
};
