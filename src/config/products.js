// Catalogo prodotti STEM (modulo "Prodotti" R02 2025/09/08) e voci degli interventi.
// I prodotti aggiunti a mano stanno nei dati (S.prods), non qui.

export const CATALOG_REV = 'R02 2025/09/08';

/** Categorie nell'ordine del modulo. `short` per i pulsanti, `col` per i grafici. */
export const PRODUCT_CATS = [
  { k: 'ge', name: 'Gradino elettrico', short: 'Gr. elettrico', col: '#1e3a5f' },
  { k: 'gm', name: 'Gradino meccanico', short: 'Gr. meccanico', col: '#6f8fb5' },
  { k: 'med', name: 'Medical', short: 'Medical', col: '#1d6b47' },
  { k: 'car', name: 'Caricamento assistito', short: 'Caricamento', col: '#c98a1e' },
  { k: 'sup', name: 'Supporti', short: 'Supporti', col: '#5b3a12' },
  { k: 'mar', name: 'Marine', short: 'Marine', col: '#8fb8d0' },
];

export const PRODUCTS = {
  ge: ['GE-3', 'GE-3-K', 'GE-2015', 'GE-2017', 'GE-480'],
  gm: ['GP-3', 'GX-3', 'GX-2015', 'GR-1400'],
  med: ['Billy-CAB', 'Sally-CAB', 'O3Z-Tech', 'E-Bike'],
  car: ['SHERPA', 'SHERPA Slim', 'POWER-PACK', 'B-CHARGER', 'R-CONTROL', 'Spark', 'Spyke'],
  sup: ['EDEN', 'EDEN BS8', 'R-3L', 'R-3L XP', 'MEC-EL', 'Compact-EL', 'OPTIMUS-PESP', 'OPTIMUS-XP', 'OPTIMUS', 'Sideslide', 'Easyslide', 'TR', 'MEC', 'MODU'],
  mar: ['STEM Wave', 'MAST 25'],
};

/** Ruolo nella trasferta: solo i "motivi" si dividono il costo. */
export const ROLES = [['m', 'Motivo della trasferta'], ['a', 'Aggiunto sul posto']];

/** Tempo dedicato → peso nella divisione del costo. Senza tempo: peso 2 (parti uguali). */
export const TIMES = [[3, 'Quasi tutto'], [2, 'Metà'], [1, 'Poco']];
export const DEFAULT_WEIGHT = 2;

export const TIPI = ['Installazione / collaudo', 'Guasto', 'Manutenzione programmata', 'Formazione cliente', 'Aggiornamento / retrofit'];

export const CAUSE_TBD = 'Da determinare';
export const CAUSE = [
  'Montaggio interno', 'Progettazione', 'Componente fornitore', 'Software / parametri', 'Danno trasporto',
  'Installazione errata', 'Uso improprio', 'Manutenzione mancante', 'Usura normale', 'Condizioni ambientali',
  'Documentazione / formazione', 'Nessun guasto', CAUSE_TBD,
];

/** Etichette corte per le colonne della matrice prodotto × causa. */
export const CAUSE_SHORT = {
  'Montaggio interno': 'Montaggio', 'Progettazione': 'Progetto', 'Componente fornitore': 'Fornitore', 'Software / parametri': 'Software',
  'Danno trasporto': 'Trasporto', 'Installazione errata': 'Installaz.', 'Uso improprio': 'Uso', 'Manutenzione mancante': 'Manutenz.',
  'Usura normale': 'Usura', 'Condizioni ambientali': 'Ambiente', 'Documentazione / formazione': 'Formazione', 'Nessun guasto': 'Nessun guasto',
};

export const SOTTO = ['Meccanica', 'Elettrica', 'Elettronica', 'Software', 'Batteria', 'Sensori', 'Carpenteria'];

export const GRAVITA = ['Macchina ferma', 'Ridotto', 'Minore'];

export const ESITI = ['Risolto', 'Provvisorio', 'Serve ritorno', 'Ricambi da spedire'];

export const REMOTO = [['si', 'Sì'], ['no', 'No'], ['forse', 'Forse']];
