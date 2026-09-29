import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { fd } from '../../lib/dates.js';
import { attr, h } from '../../lib/html.js';

export function renderNotes(){
  const k=fd(S.cd);
  const notes=(S.dd[k]&&S.dd[k].notes)||[];
  const el=document.getElementById('notesList');
  if(!el)return;
  if(!notes.length){
    el.innerHTML='<div style="color:var(--t3);font-size:13px;text-align:center;padding:12px 0">Nessuna nota per questo giorno</div>';
    return;
  }
  el.innerHTML=notes.map((n,i)=>`
    <div style="background:var(--s2);border-radius:10px;padding:12px;margin-bottom:8px;border:1px solid var(--bor)">
      <div style="font-size:13px;color:var(--t);white-space:pre-wrap;margin-bottom:8px">${h(n.txt)}</div>
      <div style="display:flex;justify-content:space-between;align-items:center">
        <span style="font-size:11px;color:var(--t3)">${h(n.ts||'')}</span>
        <button data-action="openNoteEditor" data-args="${attr(i)}" style="background:none;border:none;color:var(--blue);font-size:12px;font-weight:600;cursor:pointer;font-family:var(--font-sans)">Modifica</button>
      </div>
    </div>
  `).join('');
}

export function openNoteEditor(idx=null){
  S.editNoteIdx=idx;
  const k=fd(S.cd);
  const notes=(S.dd[k]&&S.dd[k].notes)||[];
  document.getElementById('noteMTitle').textContent=idx===null?'Nuova nota':'Modifica nota';
  document.getElementById('noteTA').value=idx!==null?(notes[idx]?.txt||''):'';
  document.getElementById('noteDelBtn').style.display=idx!==null?'block':'none';
  openM('notem');
  setTimeout(()=>document.getElementById('noteTA').focus(),200);
}

export function saveNote(){
  const txt=document.getElementById('noteTA').value.trim();
  if(!txt){toast('Scrivi qualcosa prima di salvare');return;}
  const k=fd(S.cd);
  if(!S.dd[k]) S.dd[k]={e:'',u:'',ps:'12:00',pe:'13:00',notes:[]};
  if(!S.dd[k].notes) S.dd[k].notes=[];
  const now=new Date();
  const ts=`${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
  if(S.editNoteIdx!==null){
    S.dd[k].notes[S.editNoteIdx]={txt,ts:S.dd[k].notes[S.editNoteIdx].ts};
  }else{
    S.dd[k].notes.push({txt,ts});
  }
  save(); renderNotes(); closeM('notem');
  toast(S.editNoteIdx!==null?'Nota modificata!':'Nota aggiunta!');
}

export function delNote(){
  if(!confirm('Eliminare questa nota?'))return;
  const k=fd(S.cd);
  if(S.dd[k]&&S.dd[k].notes) S.dd[k].notes.splice(S.editNoteIdx,1);
  save(); renderNotes(); closeM('notem'); toast('Nota eliminata');
}
