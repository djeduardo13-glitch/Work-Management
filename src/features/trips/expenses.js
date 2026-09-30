import { closeM, openM } from '../../components/modal.js';
import { toast } from '../../components/toast.js';
import { S } from '../../core/state.js';
import { save } from '../../core/storage.js';
import { fd } from '../../lib/dates.js';
import { h } from '../../lib/html.js';
import { compressImage, deletePhoto, getPhoto, newPhotoId, savePhoto } from '../../lib/photos.js';

let _curSpesaTid=null,_curSpesaIdx=null;

export function speseTotal(t){
  var sp=t.spese||[];
  if(!sp.length) return 'Nessuna spesa';
  var tot=sp.filter(function(s){return s.val==='EURO';}).reduce(function(a,s){return a+parseFloat(s.imp||0);},0);
  return sp.length+(sp.length===1?' spesa':' spese')+(tot>0?' · €'+tot.toFixed(2):'');
}

export function buildSpeseRows(t){
  var sp=t.spese||[];
  if(!sp.length) return '<div style="font-size:13px;color:var(--t3);padding:12px 0;text-align:center">Nessuna spesa registrata</div>';
  var html='';
  for(var i=0;i<sp.length;i++){
    var s=sp[i];
    var det=s.det+(s.x2?' x2':'');
    var badge=s.pag==='Contanti pers.'?'<span style="font-size:10px;background:var(--rl);color:var(--re);padding:2px 6px;border-radius:4px;margin-left:4px">contanti</span>':'';
    var sym=s.val==='EURO'?'EUR':s.val==='Sterline'?'GBP':'USD';
    var imp='('+sym+') '+parseFloat(s.imp||0).toFixed(2);
    var dp=s.dat.split('-'); var d=dp[2]+'/'+dp[1];
    html+='<div class="drow spesa-row" data-tid="'+h(t.id)+'" data-idx="'+i+'" style="cursor:pointer">'
      +'<span class="dk"><span style="font-weight:500">'+h(s.cat)+'</span>'+badge+(s.foto?' <span aria-label="con foto">📷</span>':'')+'</span>'
      +'<span class="dv" style="text-align:right"><span style="font-weight:500">'+h(imp)+'</span><br>'
      +'<span style="font-size:11px;color:var(--t3)">'+h(det)+' · '+h(d)+(s.ora?' '+h(s.ora):'')+'</span></span></div>';
  }
  return html;
}

export function renderSpese(t){
  var totEl=document.getElementById('speseTot-'+t.id);
  if(totEl) totEl.textContent=speseTotal(t);
  var pop=document.getElementById('spesepop');
  if(pop&&pop.classList.contains('on')){
    var pl=document.getElementById('spesepopList');
    var pt=document.getElementById('spesepopTot');
    if(pl) pl.innerHTML=buildSpeseRows(t);
    if(pt) pt.textContent=speseTotal(t);
  }
}

export function openSpesePopup(tid){
  _curSpesaTid=tid;
  var t=S.trs.find(function(x){return x.id===tid;});
  if(!t)return;
  var popList=document.getElementById('spesepopList');
  var popTot=document.getElementById('spesepopTot');
  if(popList){
    popList.innerHTML=buildSpeseRows(t);
    popList.onclick=function(e){
      var row=e.target.closest('.spesa-row');
      if(row) openEditSpesa(row.dataset.tid, parseInt(row.dataset.idx));
    };
  }
  if(popTot) popTot.textContent=speseTotal(t);
  openM('spesepop');
}

export function openAddSpesaFromPopup(){
  closeM('spesepop');
  openAddSpesa(_curSpesaTid);
}

export function quickAddSpesa(){
  var now=new Date();
  var a=S.trs.find(function(t){return !t.arc&&new Date(t.d1+'T00:00:00')<=now&&new Date(t.d2+'T23:59:59')>=now;});
  if(!a){toast('Nessuna trasferta in corso',true);return;}
  openAddSpesa(a.id);
}

export function openAddSpesa(tid){
  _curSpesaTid=tid; _curSpesaIdx=null;
  const t=S.trs.find(x=>x.id===tid); if(!t)return;
  document.getElementById('spesaMTitle').textContent='Nuova spesa';
  document.getElementById('sp-dat').value=fd(new Date());
  document.getElementById('sp-cat').value='Pasti';
  document.getElementById('sp-det').value='';
  document.getElementById('sp-x2').checked=false;
  document.getElementById('sp-x2row').style.display=t.vcon?'flex':'none';
  document.getElementById('sp-val').value='EURO';
  document.getElementById('sp-imp').value='';
  document.getElementById('sp-doc').value='Scontrino';
  document.getElementById('sp-pag').value='c/c aziendale';
  document.getElementById('speseDelBtn').style.display='none';
  resetPhoto(null);
  openM('spesam');
}

export function openEditSpesa(tid,idx){
  _curSpesaTid=tid; _curSpesaIdx=idx;
  const t=S.trs.find(x=>x.id===tid); if(!t)return;
  const s=t.spese[idx]; if(!s)return;
  document.getElementById('spesaMTitle').textContent='Modifica spesa';
  document.getElementById('sp-dat').value=s.dat;
  document.getElementById('sp-cat').value=s.cat;
  document.getElementById('sp-det').value=s.det;
  document.getElementById('sp-x2').checked=s.x2||false;
  document.getElementById('sp-x2row').style.display=t.vcon?'flex':'none';
  document.getElementById('sp-val').value=s.val;
  document.getElementById('sp-imp').value=s.imp;
  document.getElementById('sp-doc').value=s.doc||'';
  document.getElementById('sp-pag').value=s.pag||'c/c aziendale';
  document.getElementById('speseDelBtn').style.display='inline-flex';
  resetPhoto(s.foto);
  openM('spesam');
}

export async function saveSpesa(){
  const t=S.trs.find(x=>x.id===_curSpesaTid); if(!t)return;
  if(!t.spese) t.spese=[];
  var _now=new Date(); var _hm=String(_now.getHours()).padStart(2,'0')+':'+String(_now.getMinutes()).padStart(2,'0');
  const spesa={dat:document.getElementById('sp-dat').value||fd(new Date()),ora:_hm,cat:document.getElementById('sp-cat').value,det:document.getElementById('sp-det').value,x2:document.getElementById('sp-x2').checked,val:document.getElementById('sp-val').value,imp:parseFloat(document.getElementById('sp-imp').value)||0,doc:document.getElementById('sp-doc').value,pag:document.getElementById('sp-pag').value};
  await commitPhoto(spesa);
  if(_curSpesaIdx!==null) t.spese[_curSpesaIdx]=spesa;
  else t.spese.push(spesa);
  t.spese.sort((a,b)=>a.dat.localeCompare(b.dat));
  save(); closeM('spesam'); renderSpese(t); toast('Spesa salvata!');
}

export function delSpesa(){
  if(!confirm('Eliminare questa spesa?'))return;
  const t=S.trs.find(x=>x.id===_curSpesaTid); if(!t)return;
  const old=t.spese[_curSpesaIdx];
  if(old&&old.foto) deletePhoto(old.foto).catch(()=>{});
  t.spese.splice(_curSpesaIdx,1);
  save(); closeM('spesam'); renderSpese(t); toast('Spesa eliminata'); openSpesePopup(_curSpesaTid);
}

// ── Foto scontrino ───────────────────────────────
let _photo={id:null,blob:null,removed:false};
let _photoUrl=null;

function showPhoto(blob){
  const box=document.getElementById('sp-photo');
  if(_photoUrl){URL.revokeObjectURL(_photoUrl);_photoUrl=null;}
  if(!blob){box.innerHTML='';document.querySelector('.sp-photo-btn').textContent='📷 Scatta o scegli una foto';return;}
  _photoUrl=URL.createObjectURL(blob);
  box.innerHTML=`<button type="button" class="sp-thumb" data-action="spPhotoView" aria-label="Apri foto"><img src="${_photoUrl}" alt="Scontrino"></button><button type="button" class="xbtn2" data-action="spPhotoRemove" aria-label="Rimuovi foto">✕</button>`;
  document.querySelector('.sp-photo-btn').textContent='📷 Cambia foto';
}

function resetPhoto(id){
  _photo={id:id||null,blob:null,removed:false};
  showPhoto(null);
  if(id) getPhoto(id).then(b=>{ if(b&&_photo.id===id&&!_photo.blob) showPhoto(b); }).catch(()=>{});
}

export async function spPhotoPicked(el){
  const file=el.files&&el.files[0];
  el.value='';
  if(!file) return;
  try{
    _photo.blob=await compressImage(file);
    _photo.removed=false;
    showPhoto(_photo.blob);
  }catch{ toast('Foto non leggibile',true); }
}

export function spPhotoRemove(){
  _photo.blob=null; _photo.removed=true;
  showPhoto(null);
}

export async function spPhotoView(){
  const blob=_photo.blob||(_photo.id&&!_photo.removed?await getPhoto(_photo.id).catch(()=>null):null);
  if(!blob) return;
  const img=document.getElementById('phvImg');
  if(img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
  img.src=URL.createObjectURL(blob);
  openM('phv');
}

async function commitPhoto(spesa){
  try{
    if(_photo.blob){
      const id=_photo.id||newPhotoId();
      await savePhoto(id,_photo.blob);
      spesa.foto=id;
    }else if(_photo.removed&&_photo.id){
      await deletePhoto(_photo.id);
      delete spesa.foto;
    }else if(_photo.id){
      spesa.foto=_photo.id;
    }
  }catch{ toast('Foto non salvata su questo dispositivo',true); }
}
