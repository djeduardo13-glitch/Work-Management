export function openM(id){
  document.getElementById(id).classList.add('on');
  history.pushState({type:'modal',id},'');
}

export function closeM(id){
  document.getElementById(id).classList.remove('on');
}
