import { DAYS, MONTHS, MS } from '../config/constants.js';
import { h } from './html.js';

export function fd(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}

export function fds(s){const d=new Date(s+'T00:00:00'); return d.getDate()+' '+MS[d.getMonth()];}

export function fdl(s){const d=new Date(s+'T00:00:00'); return DAYS[d.getDay()]+' '+d.getDate()+' '+MONTHS[d.getMonth()]+' '+d.getFullYear();}

export function fn(s){const d=new Date(s+'T00:00:00'); return String(d.getDate()).padStart(2,'0')+'.'+String(d.getMonth()+1).padStart(2,'0');}

export function dshort(s){const d=new Date(s+'T00:00:00'); return ['Lun','Mar','Mer','Gio','Ven','Sab','Dom'][d.getDay()===0?6:d.getDay()-1]+' '+d.getDate()+' '+MS[d.getMonth()];}

export function addD(d,n){const r=new Date(d); r.setDate(r.getDate()+n); return r;}

export function f2(n){return String(n).padStart(2,'0');}

export function t2m(t){if(!t)return 0; const[h,m]=t.split(':').map(Number); return Math.round((h*60+m)/30)*30;}

export function fh(m){const neg=m<0; m=Math.round(Math.abs(m)/30)*30; const h=Math.floor(m/60), half=(m%60)===30; return (neg?'-':'')+h+(half?',5':'');}
