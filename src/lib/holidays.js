import { h } from './html.js';

export function easterDate(y){
  // Algoritmo di Meeus/Jones/Butcher
  const a=y%19,b=Math.floor(y/100),c=y%100;
  const d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25);
  const g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30;
  const i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7;
  const m=Math.floor((a+11*h+22*l)/451);
  const month=Math.floor((h+l-7*m+114)/31),day=((h+l-7*m+114)%31)+1;
  return new Date(y,month-1,day);
}

export function getItalianHolidays(y){
  const easter=easterDate(y);
  const easterMonday=new Date(easter); easterMonday.setDate(easter.getDate()+1);
  const fmt=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  const h={};
  // Festività fisse
  h[`${y}-01-01`]="Capodanno";
  h[`${y}-01-06`]="Epifania";
  h[fmt(easter)]="Pasqua";
  h[fmt(easterMonday)]="Lunedì dell'Angelo";
  h[`${y}-04-25`]="Liberazione";
  h[`${y}-05-01`]="Festa del Lavoro";
  h[`${y}-06-02`]="Festa della Repubblica";
  h[`${y}-08-15`]="Ferragosto";
  h[`${y}-11-01`]="Ognissanti";
  h[`${y}-12-08`]="Immacolata";
  h[`${y}-12-25`]="Natale";
  h[`${y}-12-26`]="Santo Stefano";
  return h;
}

export const HOLIDAYS_CACHE={};

export function getHoliday(dateStr){
  const y=parseInt(dateStr.substring(0,4));
  if(!HOLIDAYS_CACHE[y]) HOLIDAYS_CACHE[y]=getItalianHolidays(y);
  return HOLIDAYS_CACHE[y][dateStr]||null;
}
