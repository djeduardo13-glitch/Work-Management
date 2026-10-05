// Registro di tutte le azioni richiamabili da data-action / data-change nel markup.
// Se aggiungi un bottone nuovo, esporta la funzione e aggiungila qui.

import { closeM } from '../components/modal.js';
import { goTab, openSyncSettings } from '../components/navigation.js';
import { tpConfirm } from '../components/time-picker.js';
import { addClientBlock, addClientContact, delClient, newClient, openClient, openTripFromClient, rmClientBlock, rmClientContact, saveClient } from '../features/clients/clients.js';
import { changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, openCredUrl, saveCr, togSP } from '../features/credentials/credentials.js';
import { copyDocNum, delDoc, editDoc, newDoc, saveDoc } from '../features/credentials/documents.js';
import { delEv, openED, openEvM, saveEv } from '../features/home/events.js';
import { callContact, delFerieOggi, openActiveTr, openMap } from '../features/home/where.js';
import { addOut, clearDay, dePause, fillStandard, openDayEditor, openTripFromDay, removeFerieDay, rmOut, saveDay } from '../features/hours/day-editor.js';
import { dvConfirm, dvEdit, openDayView } from '../features/hours/day-view.js';
import { oreMonth } from '../features/hours/month.js';
import { delNote, openNoteEditor, saveNote } from '../features/hours/notes.js';
import { evToPermit, openPermitPlanner, ppKind, savePermit } from '../features/hours/permit-planner.js';
import { openTrFromPreview, showTrPreview } from '../features/profile/calendar.js';
import { dayFromList, delDayHours, delFerieFromProfile, editDayHours, showMonthDetail } from '../features/profile/month-detail.js';
import { swPTab } from '../features/profile/profile.js';
import { exportBackup, importBackup } from '../features/settings/backup.js';
import { editPhone, enNotif, savePh, togN } from '../features/settings/settings.js';
import { copyRestoreLink } from '../features/sync/restore-link.js';
import { gistPull, gistSync, saveGistId, saveGistToken } from '../features/sync/sync.js';
import { comeBackAt, comeBackNow, confirmExit, editEntry, editFromRecap, editOut, goOut, pickEntry, registerExit, setEntry, setPause, showExitRecap, toggleToday } from '../features/today/today.js';
import { addCLItem, togCL } from '../features/trips/checklist.js';
import { openTripRoute, recalcRet, setRetFrom, setRetManual } from '../features/trips/departure-ui.js';
import { addSpesaCur, archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA } from '../features/trips/detail.js';
import { delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa, spPhotoPicked, spPhotoRemove, spPhotoView } from '../features/trips/expenses.js';
import { addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput } from '../features/trips/form.js';
import { swTTab } from '../features/trips/list.js';
import { delEntry, delFolder, editWorkEntry, editWorkFolder, newEntry, newFolder, openFolder, saveEntry, saveFolder, weAddFromInput, weAddTag, weRmTag, workBack, workTag } from '../features/work/work.js';
import { callTel, openMapsQuery } from '../lib/links.js';

export const actions = {
  closeM,
  goTab, openSyncSettings,
  tpConfirm,
  addClientBlock, addClientContact, delClient, newClient, openClient, openTripFromClient, rmClientBlock, rmClientContact, saveClient,
  changeVaultPassword, chkPIN, closePasM, copyCred, delCred, editCred, lockCreds, newCred, openCredUrl, saveCr, togSP,
  copyDocNum, delDoc, editDoc, newDoc, saveDoc,
  delEv, openED, openEvM, saveEv,
  callContact, delFerieOggi, openActiveTr, openMap,
  addOut, clearDay, dePause, fillStandard, openDayEditor, openTripFromDay, removeFerieDay, rmOut, saveDay,
  dvConfirm, dvEdit, openDayView,
  oreMonth,
  delNote, openNoteEditor, saveNote,
  evToPermit, openPermitPlanner, ppKind, savePermit,
  openTrFromPreview, showTrPreview,
  dayFromList, delDayHours, delFerieFromProfile, editDayHours, showMonthDetail,
  swPTab,
  exportBackup, importBackup,
  editPhone, enNotif, savePh, togN,
  copyRestoreLink,
  gistPull, gistSync, saveGistId, saveGistToken,
  comeBackAt, comeBackNow, confirmExit, editEntry, editFromRecap, editOut, goOut, pickEntry, registerExit, setEntry, setPause, showExitRecap, toggleToday,
  addCLItem, togCL,
  openTripRoute, recalcRet, setRetFrom, setRetManual,
  addSpesaCur, archiviaT, closeTD, eliminaT, emailTr, openTrDet, ripristinaT, shareWA,
  delSpesa, openAddSpesaFromPopup, openSpesePopup, quickAddSpesa, saveSpesa, spPhotoPicked, spPhotoRemove, spPhotoView,
  addScaleLeg, closeNT, editTr, removeScaleLeg, saveNT, showNT, togAF, togScale, toggleAltroInput,
  swTTab,
  delEntry, delFolder, editWorkEntry, editWorkFolder, newEntry, newFolder, openFolder, saveEntry, saveFolder, weAddFromInput, weAddTag, weRmTag, workBack, workTag,
  callTel, openMapsQuery,
};
