/** Iniziali maiuscole per ogni parola: "la spezia" → "La Spezia", "saint-étienne" → "Saint-Étienne". */
export function cap(s){return s?String(s).replace(/(^|[\s\-'’])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()):'';}


export function v(id){const el=document.getElementById(id); return el?el.value:'';}

export function hexAdjust(hex,amt,toLight=false){
  let r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);
  if(toLight){r=Math.min(255,r+amt);g=Math.min(255,g+amt);b=Math.min(255,b+amt);}
  else{r=Math.max(0,r+amt);g=Math.max(0,g+amt);b=Math.max(0,b+amt);}
  return '#'+[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('');
}
