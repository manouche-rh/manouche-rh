/* ═══════════════════════════════════════════════════════════════
   Man'ouché RH — Application logic
   Vanilla JS · Firebase Realtime DB · PWA-ready
═══════════════════════════════════════════════════════════════ */

// ─────────── CONFIG ───────────
const FB_CONFIG = {
  apiKey: "AIzaSyDPQz5sLRsSp9kaqG8JLyOW_FeqszkcCUg",
  authDomain: "manouche75003.firebaseapp.com",
  databaseURL: "https://manouche75003-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "manouche75003",
  storageBucket: "manouche75003.firebasestorage.app",
  messagingSenderId: "620239670518",
  appId: "1:620239670518:web:ec6249a4b8522506b5f0d7"
};

const ADMIN_USER = 'admin';
const ADMIN_CODE = '0000';

// Default seed data (matches existing RH_ULTIME.html structure)
const DEFAULT_EMPLOYEES = [
  {id:1,prenom:"Johnny",nom:"Salemneh",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"johnny",code:"1234"},
  {id:3,prenom:"Ahmad",nom:"Yaggi",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"ahmad.y",code:"1234"},
  {id:4,prenom:"Jeremie",nom:"Dacosta",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"jeremie",code:"1234"},
  {id:5,prenom:"Oussama",nom:"Bouaziz",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"oussama",code:"1234"},
  {id:6,prenom:"Dababo",nom:"Yahya",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"dababo",code:"1234"},
  {id:7,prenom:"Omar",nom:"Kozbari",poste:"Cuisinier",contrat:"CDI",heures:35,taux:12,statut:"Actif",cpAcquis:25,cpPris:0,username:"omar",code:"1234"}
];

const DAYS = ['Lundi','Mardi','Mercredi','Jeudi','Vendredi','Samedi','Dimanche'];
const DAYS_SHORT = ['Lun','Mar','Mer','Jeu','Ven','Sam','Dim'];
const MONTHS_FR = ['janvier','février','mars','avril','mai','juin','juillet','août','septembre','octobre','novembre','décembre'];

// Leave types (mutually exclusive with regular shift)
const LEAVE_TYPES = {
  cp:                 { label: 'Congé payé',         short: 'CP',         color: 'leave-cp' },
  absent_justifie:    { label: 'Absent justifié',    short: 'Abs. just.', color: 'leave-justifie' },
  absent_injustifie:  { label: 'Absent injustifié',  short: 'Abs. inj.',  color: 'leave-injustifie' },
  arret_maladie:      { label: 'Arrêt maladie',      short: 'AM',         color: 'leave-am' },
  rtt:                { label: 'RTT',                short: 'RTT',        color: 'leave-rtt' },
  recup:              { label: 'Récupération',       short: 'Récup',      color: 'leave-recup' },
};

// Normalize a shift — converts legacy {absent:true} / {conge:true} to new leaveType
function normShift(s) {
  if (!s) return s;
  if (s.leaveType) return s;
  if (s.absent) return { ...s, leaveType: 'absent_justifie' };
  if (s.conge) return { ...s, leaveType: 'cp' };
  return s;
}
function isLeave(s) { return !!(s && (s.leaveType || s.absent || s.conge)); }

// ─────────── JOURS FÉRIÉS (France) ───────────
// Calcul de Pâques — algorithme de Butcher/Meeus
function easterDate(year) {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month - 1, day);
}

function holidaysForYear(year) {
  const e = easterDate(year);
  const easterMon = new Date(e); easterMon.setDate(e.getDate() + 1);
  const ascension = new Date(e); ascension.setDate(e.getDate() + 39);
  const pentecost = new Date(e); pentecost.setDate(e.getDate() + 50);
  return {
    [`${year}-01-01`]: { short: "Jour de l'An",      long: "Jour de l'An" },
    [dateISO(easterMon)]: { short: 'Lundi de Pâques',long: 'Lundi de Pâques' },
    [`${year}-05-01`]: { short: 'Fête du Travail',   long: 'Fête du Travail' },
    [`${year}-05-08`]: { short: 'Victoire 1945',     long: 'Victoire 1945' },
    [dateISO(ascension)]: { short: 'Ascension',      long: "Jeudi de l'Ascension" },
    [dateISO(pentecost)]: { short: 'L. Pentecôte',   long: 'Lundi de Pentecôte' },
    [`${year}-07-14`]: { short: '14 Juillet',        long: 'Fête nationale' },
    [`${year}-08-15`]: { short: 'Assomption',        long: 'Assomption' },
    [`${year}-11-01`]: { short: 'Toussaint',         long: 'Toussaint' },
    [`${year}-11-11`]: { short: '11 Novembre',       long: 'Armistice 1918' },
    [`${year}-12-25`]: { short: 'Noël',              long: 'Noël' },
  };
}
const _holidayCache = {};
function holidayFor(date) {
  const y = date.getFullYear();
  if (!_holidayCache[y]) _holidayCache[y] = holidaysForYear(y);
  return _holidayCache[y][dateISO(date)] || null;
}

// ─────────── BROUILLONS / PUBLICATIONS ───────────
function weekIsPublished(wk) {
  if (state.publications[wk]) return true;
  // Les semaines déjà passées (de plus de 2 jours) sont visibles
  // automatiquement — pratique pour les données historiques importées
  const wkDate = new Date(wk);
  const today = new Date();
  today.setHours(0,0,0,0);
  const wkEnd = new Date(wkDate); wkEnd.setDate(wkDate.getDate() + 6);
  return wkEnd < today; // semaine complètement passée
}

// ─────────── EXPORTS ───────────
function csvEsc(s) {
  s = String(s ?? '');
  if (s.includes(';') || s.includes('"') || s.includes('\n') || s.includes(',')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function exportPlanningCSV() {
  const wk = weekKey(state.weekStart);
  const lines = ['Salarié;Poste;Date;Jour;Statut;Type;Début;Fin;Pause (mn);Heures;Libellé;Férié'];
  const actives = state.employees.filter(e => e.statut === 'Actif');

  actives.forEach(emp => {
    for (let d = 0; d < 7; d++) {
      const date = addDays(state.weekStart, d);
      const fer = holidayFor(date);
      const ferStr = fer ? fer.long : '';
      const shifts = (state.shifts[`${emp.id}_${d}_${wk}`] || []).map(normShift);
      if (shifts.length === 0) {
        lines.push([
          csvEsc(emp.prenom + ' ' + emp.nom),
          csvEsc(emp.poste || ''),
          dateISO(date),
          DAYS[d],
          'Repos',
          '', '', '', '0', '0', '',
          csvEsc(ferStr)
        ].join(';'));
      } else {
        shifts.forEach(s => {
          if (s.leaveType) {
            const lt = LEAVE_TYPES[s.leaveType];
            lines.push([
              csvEsc(emp.prenom + ' ' + emp.nom),
              csvEsc(emp.poste || ''),
              dateISO(date),
              DAYS[d],
              csvEsc(lt?.label || s.leaveType),
              '', '', '', '0', '0',
              csvEsc(s.label || ''),
              csvEsc(ferStr)
            ].join(';'));
          } else {
            lines.push([
              csvEsc(emp.prenom + ' ' + emp.nom),
              csvEsc(emp.poste || ''),
              dateISO(date),
              DAYS[d],
              'Travaille',
              s.type || '',
              s.start || '',
              s.end || '',
              String(s.pauseDuration || 0),
              shiftHours(s).toFixed(2).replace('.', ','),
              csvEsc(s.label || ''),
              csvEsc(ferStr)
            ].join(';'));
          }
        });
      }
    }
  });

  // Section totaux
  lines.push('');
  lines.push('TOTAUX SEMAINE');
  lines.push('Salarié;Contrat;Heures planifiées;Écart contrat');
  actives.forEach(emp => {
    let h = 0;
    for (let d = 0; d < 7; d++) {
      (state.shifts[`${emp.id}_${d}_${wk}`] || []).forEach(s => h += shiftHours(s));
    }
    const gap = h - (emp.heures || 35);
    lines.push([
      csvEsc(emp.prenom + ' ' + emp.nom),
      (emp.heures || 35) + 'h',
      h.toFixed(2).replace('.', ','),
      (gap >= 0 ? '+' : '') + gap.toFixed(2).replace('.', ',')
    ].join(';'));
  });

  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planning_${wk}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV téléchargé', 'good');
}

function exportPlanningPDF() {
  document.body.classList.add('printing');
  // Brief delay to let the class apply
  setTimeout(() => {
    window.print();
    setTimeout(() => document.body.classList.remove('printing'), 500);
  }, 100);
}

// Seed planning (template based on the RH_ULTIME schedule) — used by "Charger un planning de démarrage"
const SEED_SHIFTS = {
  // Ahmad Yaggi (3)
  '3_0':[{type:'ar',start:'11:00',end:'23:00',label:'Patron',pauseDuration:120}],
  '3_1':[{type:'ar',start:'11:00',end:'23:00',label:'Patron',pauseDuration:120}],
  '3_2':[{type:'ar',start:'11:00',end:'23:00',label:'Patron',pauseDuration:120}],
  '3_5':[{type:'soir',start:'18:00',end:'23:00'}],
  // Jeremie (4)
  '4_0':[{type:'soir',start:'17:00',end:'23:00'}],
  '4_4':[{type:'ar',start:'11:00',end:'23:59',pauseDuration:120}],
  '4_5':[{type:'ar',start:'12:00',end:'23:59',pauseDuration:120}],
  '4_6':[{type:'soir',start:'15:00',end:'23:00'}],
  // Oussama (5)
  '5_3':[{type:'ar',start:'11:00',end:'23:00',pauseDuration:120}],
  '5_4':[{type:'ar',start:'12:00',end:'23:59',pauseDuration:120}],
  '5_5':[{type:'midi',start:'12:00',end:'18:00'}],
  '5_6':[{type:'ar',start:'12:00',end:'23:00',pauseDuration:120}],
  // Yahya / Dababo (6)
  '6_3':[{type:'ar',start:'12:00',end:'23:00',pauseDuration:120}],
  '6_4':[{type:'soir',start:'17:00',end:'23:00'}],
  '6_5':[{type:'ar',start:'11:00',end:'23:59',pauseDuration:120}],
  '6_6':[{type:'ar',start:'12:00',end:'23:00',pauseDuration:120}],
  // Omar (7)
  '7_0':[{type:'midi',start:'12:00',end:'17:00'}],
  '7_1':[{type:'ar',start:'12:00',end:'23:00',pauseDuration:120}],
  '7_2':[{type:'ar',start:'12:00',end:'23:00',pauseDuration:120}]
};

// ─────────── STATE ───────────
const state = {
  user: null,        // null | {role:'admin'} | {role:'emp', empId, ...}
  employees: [],
  shifts: {},        // key `${empId}_${dayIdx}_${weekKey}` → [{type,start,end,...}]
  punches: {},       // key `${empId}_${dateISO}` → [{in:'08:32',out:'14:15',meta?}]
  publications: {},  // key weekKey → {publishedAt, by, note}
  absenceRequests: {}, // keyed by request id
  weekStart: getMonday(new Date()),
  fbReady: false,
  page: null,        // current page id
  loading: true,
  monthView: false,
  monthAnchor: new Date(),
  empDetail: null,   // current employee id being viewed in detail (null = list)
  empTab: 'info',    // active tab in employee detail
  rhTab: 'entries',  // active tab in Suivi RH page
  reqTab: 'pending', // active tab in absence requests
};

// ─────────── EMPLOYEE NORMALIZATION ───────────
function normEmp(e) {
  if (!e) return null;
  const defaults = {
    nomNaissance: '', genre: '', dateNaissance: '', paysNaissance: '',
    departementNaissance: '', communeNaissance: '', nationalite: '',
    email: '', telMobile: '', telFixe: '', notifSMS: false,
    adresse: '', complementAdresse: '', codePostal: '', ville: '', pays: 'France',
    contratDebut: '', contratFin: '', periodeEssaiJours: 60,
    remuneration: 0, joursTravailles: 5, navigoMensuel: 0,
    dateSortie: '', motifSortie: '',
    cpAcquisN: e.cpAcquis ?? 25,
    cpPrisN: e.cpPris ?? 0,
    cpAcquisNm1: 0, cpPrisNm1: 0,
    reposCompensateur: 0, recupJoursFeries: 0,
    travailleurEtranger: false, titreSejourType: '',
    titreSejourNumero: '', titreSejourDebut: '', titreSejourFin: '',
    peutSeConnecter: true,
    dispos: { 0: true, 1: true, 2: true, 3: true, 4: true, 5: true, 6: true },
    avenants: [], documents: [],
  };
  return { ...defaults, ...e };
}

function isProfileComplete(e) {
  const n = normEmp(e);
  return !!(n.email && n.telMobile && n.dateNaissance && n.adresse && n.codePostal && n.ville && n.contratDebut);
}

// Compute CP pris from shifts for current year (auto-calculate from leave shifts)
function computeCpPris(empId) {
  let count = 0;
  const yr = new Date().getFullYear();
  Object.entries(state.shifts).forEach(([key, shifts]) => {
    if (!key.startsWith(`${empId}_`)) return;
    const wk = key.split('_')[2];
    if (!wk || !wk.startsWith(String(yr))) return;
    (shifts || []).forEach(s => {
      const n = normShift(s);
      if (n.leaveType === 'cp') count++;
    });
  });
  return count;
}

// ─────────── UTILS ───────────
function $(sel, root=document) { return root.querySelector(sel); }
function $$(sel, root=document) { return [...root.querySelectorAll(sel)]; }
function esc(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]); }
function pad(n) { return String(n).padStart(2, '0'); }
function initials(e) { return `${(e.prenom||'').charAt(0)}${(e.nom||'').charAt(0)}`.toUpperCase(); }

function getMonday(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  return x;
}
function dateISO(d) { return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; }
function weekKey(d) { return dateISO(getMonday(d)); }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function fmtDateLong(d) {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}
function fmtDateShort(d) {
  if (!d) return '—';
  if (typeof d === 'string') {
    const parts = d.split('-');
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return d;
  }
  return d.toLocaleDateString('fr-FR');
}
function fmtRange(d1, d2) {
  const sameMonth = d1.getMonth() === d2.getMonth();
  if (sameMonth) {
    return `${d1.getDate()} – ${d2.getDate()} ${d2.toLocaleDateString('fr-FR',{month:'long', year:'numeric'})}`;
  }
  return `${d1.toLocaleDateString('fr-FR',{day:'numeric',month:'short'})} – ${d2.toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'})}`;
}
function timeToMin(t) { if (!t) return 0; const [h,m] = t.split(':').map(Number); return h*60+m; }
function minToTime(m) { return `${pad(Math.floor(m/60))}:${pad(m%60)}`; }
function shiftHours(sh) {
  if (!sh) return 0;
  if (isLeave(sh)) return 0;
  let dur = timeToMin(sh.end) - timeToMin(sh.start);
  if (dur < 0) dur += 24*60;
  if (sh.pauseDuration) dur -= sh.pauseDuration;
  return Math.max(0, dur) / 60;
}
function shiftsForCell(empId, dayIdx, wkKey=weekKey(state.weekStart)) {
  return state.shifts[`${empId}_${dayIdx}_${wkKey}`] || [];
}

// ─────────── TOAST ───────────
function toast(msg, type='', dur=3000) {
  const el = document.createElement('div');
  el.className = `toast${type ? ' '+type : ''}`;
  el.textContent = msg;
  $('#toast-host').appendChild(el);
  setTimeout(() => {
    el.style.animation = 'toastOut .25s forwards';
    setTimeout(() => el.remove(), 250);
  }, dur);
}

// ─────────── MODAL ───────────
function openModal({ title, body, footer, onClose }) {
  const bg = document.createElement('div');
  bg.className = 'modal-bg';
  bg.innerHTML = `
    <div class="modal">
      <div class="modal-h">
        <h3>${esc(title)}</h3>
        <button class="btn-icon" data-close>✕</button>
      </div>
      <div class="modal-b">${body}</div>
      ${footer ? `<div class="modal-f">${footer}</div>` : ''}
    </div>`;
  document.body.appendChild(bg);
  const close = () => { bg.remove(); onClose && onClose(); document.body.style.overflow = ''; };
  document.body.style.overflow = 'hidden';
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  $$('[data-close]', bg).forEach(b => b.addEventListener('click', close));
  // Escape key to close
  const escHandler = (e) => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
  document.addEventListener('keydown', escHandler);
  return { bg, close };
}

// ─────────── FIREBASE ───────────
let db = null;
async function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.warn('Firebase not available — local mode');
    return false;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FB_CONFIG);
    await firebase.auth().signInAnonymously();
    db = firebase.database();
    state.fbReady = true;
    return true;
  } catch (e) {
    console.error('Firebase init failed:', e);
    toast('Connexion Firebase impossible — mode local', 'error');
    return false;
  }
}

// ─────────── DOCUMENTS — stockage base64 dans RTDB (sans Firebase Storage) ───────────
const MAX_DOC_SIZE = 2 * 1024 * 1024; // 2 Mo limite côté upload (un peu plus en base64)
const MAX_RTDB_SIZE = 8 * 1024 * 1024; // 8 Mo dur (limite RTDB par node = 10 Mo)

async function compressImageIfNeeded(file, maxDim = 1800, quality = 0.85) {
  if (!file.type || !file.type.startsWith('image/')) return file;
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim && file.size < 600*1024) {
        URL.revokeObjectURL(img.src); resolve(file); return;
      }
      const canvas = document.createElement('canvas');
      if (width > height) {
        if (width > maxDim) { height = (maxDim / width) * height; width = maxDim; }
      } else {
        if (height > maxDim) { width = (maxDim / height) * width; height = maxDim; }
      }
      canvas.width = width; canvas.height = height;
      canvas.getContext('2d').drawImage(img, 0, 0, width, height);
      canvas.toBlob(blob => {
        URL.revokeObjectURL(img.src);
        if (!blob) { resolve(file); return; }
        const out = new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
        resolve(out);
      }, 'image/jpeg', quality);
    };
    img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file); };
    img.src = URL.createObjectURL(file);
  });
}

async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

async function uploadEmployeeDoc(empId, file, category) {
  if (!db) { toast('Firebase non disponible', 'error'); return null; }

  // Auto-compress images
  let workFile = file;
  if (file.type && file.type.startsWith('image/')) {
    try { workFile = await compressImageIfNeeded(file); } catch(e) { /* ignore */ }
  }

  if (workFile.size > MAX_DOC_SIZE) {
    toast(`Fichier trop gros (${formatBytes(workFile.size)}). Limite 2 Mo — compresse le PDF ou réduis le scan.`, 'error', 6000);
    return null;
  }

  try {
    const dataUrl = await fileToDataUrl(workFile);
    if (dataUrl.length > MAX_RTDB_SIZE) {
      toast(`Fichier trop volumineux après encodage. Réduis encore.`, 'error', 6000);
      return null;
    }
    const docId = 'd' + Date.now() + Math.random().toString(36).slice(2,7);
    // Save the blob in a SEPARATE node (not loaded on startup)
    await db.ref(`docBlobs/${docId}`).set(dataUrl);
    return {
      id: docId,
      name: workFile.name,
      size: workFile.size,
      type: workFile.type,
      category,
      uploadedAt: new Date().toISOString(),
      // Note: no url field, fetched on demand from docBlobs/{id}
    };
  } catch (e) {
    console.error('Upload failed', e);
    toast('Échec upload : ' + (e.message || e.code), 'error', 6000);
    return null;
  }
}

async function fetchDocBlob(docId) {
  if (!db) return null;
  try {
    const snap = await db.ref(`docBlobs/${docId}`).once('value');
    return snap.val();
  } catch (e) {
    console.error('Fetch blob failed', e);
    return null;
  }
}

async function openDocInNewTab(docId, fileName) {
  toast('Ouverture du document...', '');
  const dataUrl = await fetchDocBlob(docId);
  if (!dataUrl) { toast('Document introuvable', 'error'); return; }
  const win = window.open('', '_blank');
  if (!win) { toast('Pop-up bloquée — autorise les pop-ups pour ouvrir le document', 'error', 6000); return; }
  // Detect if image, PDF, or other
  const isImage = dataUrl.startsWith('data:image/');
  const isPdf = dataUrl.startsWith('data:application/pdf');
  win.document.title = fileName;
  if (isImage) {
    win.document.body.style.margin = '0';
    win.document.body.style.background = '#000';
    win.document.body.innerHTML = `<img src="${dataUrl}" style="display:block;max-width:100%;max-height:100vh;margin:0 auto;">`;
  } else if (isPdf) {
    win.document.body.style.margin = '0';
    win.document.body.innerHTML = `<iframe src="${dataUrl}" style="width:100vw;height:100vh;border:0;"></iframe>`;
  } else {
    // Trigger download for other types
    const a = win.document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    win.document.body.appendChild(a);
    a.click();
    setTimeout(() => win.close(), 500);
  }
}

async function downloadDocFile(docId, fileName) {
  toast('Téléchargement...', '');
  const dataUrl = await fetchDocBlob(docId);
  if (!dataUrl) { toast('Document introuvable', 'error'); return; }
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = fileName;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

async function deleteDocBlob(docId) {
  if (!db) return;
  try { await db.ref(`docBlobs/${docId}`).remove(); }
  catch (e) { console.warn(e); }
}

function formatBytes(b) {
  if (b < 1024) return b + ' o';
  if (b < 1024*1024) return (b/1024).toFixed(1) + ' Ko';
  return (b/(1024*1024)).toFixed(1) + ' Mo';
}

const DOC_CATEGORIES = {
  contrat:        { label: 'Contrat de travail',   icon: '📄' },
  avenant:        { label: 'Avenant',              icon: '📝' },
  fiche_paie:     { label: 'Fiche de paie',        icon: '💶' },
  arret_maladie:  { label: 'Arrêt maladie',        icon: '🏥' },
  navigo:         { label: 'Pass Navigo',          icon: '🚇' },
  titre_sejour:   { label: 'Titre de séjour',      icon: '🛂' },
  carte_identite: { label: "Pièce d'identité",     icon: '🪪' },
  rib:            { label: 'RIB',                  icon: '🏦' },
  certificat:     { label: 'Certificat médical',   icon: '⚕️' },
  diplome:        { label: 'Diplôme',              icon: '🎓' },
  formation:      { label: 'Attestation formation',icon: '📚' },
  autre:          { label: 'Autre document',       icon: '📎' },
};

function fbListen() {
  if (!db) return;
  ['employees','shifts','punches','publications','absenceRequests'].forEach(k => {
    db.ref(k).on('value', snap => {
      const v = snap.val();
      if (k === 'employees' && v) {
        if (Array.isArray(v)) {
          state.employees = v.filter(Boolean);
        } else {
          state.employees = Object.values(v).filter(Boolean);
        }
        state.employees.forEach(e => {
          if (!e.username) e.username = (e.prenom || '').toLowerCase();
          if (!e.code) e.code = '1234';
        });
        console.log('[fb] employees loaded:', state.employees.length);
      }
      if (k === 'shifts' && v) {
        state.shifts = v;
        migrateLegacyShifts();
        console.log('[fb] shifts loaded:', Object.keys(state.shifts).length);
      }
      if (k === 'punches' && v) state.punches = v;
      if (k === 'publications' && v) state.publications = v;
      if (k === 'absenceRequests' && v) state.absenceRequests = v;
      render();
    }, err => {
      console.error('[fb] read error on', k, err);
      toast(`Lecture Firebase refusée (${k}) — vérifie les règles`, 'error', 6000);
    });
  });
}

// Migrate legacy RH_ULTIME shift keys (empId_dayIdx) to new format (empId_dayIdx_weekKey)
// for the current week, so existing planning shows up immediately.
function migrateLegacyShifts() {
  if (!state.shifts) return;
  const currentWk = weekKey(state.weekStart);
  const updates = {};
  let count = 0;
  Object.keys(state.shifts).forEach(key => {
    const parts = key.split('_');
    if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      const newKey = `${key}_${currentWk}`;
      if (!state.shifts[newKey]) {
        state.shifts[newKey] = state.shifts[key];
        updates[newKey] = state.shifts[key];
        count++;
      }
    }
  });
  if (count && db) {
    console.log(`[migration] copying ${count} legacy shifts to current week`);
    db.ref('shifts').update(updates).catch(e => console.warn('migration write failed', e));
    toast(`${count} shifts récupérés de l'ancien planning`, 'good', 4000);
  }
}

function fbSave(path, value) {
  if (!db) return;
  return db.ref(path).set(value).catch(e => {
    console.error(e); toast('Erreur de synchronisation', 'error');
  });
}

async function seedIfEmpty() {
  if (!db) return;
  const snap = await db.ref('employees').once('value');
  if (!snap.exists()) {
    await db.ref('employees').set(DEFAULT_EMPLOYEES);
    state.employees = DEFAULT_EMPLOYEES;
  }
}

// ─────────── AUTH ───────────
function authAdmin(u, c) {
  if (u === ADMIN_USER && c === ADMIN_CODE) {
    state.user = { role: 'admin' };
    sessionStorage.setItem('mu_user', JSON.stringify(state.user));
    return true;
  }
  return false;
}
function authEmp(u, c) {
  const e = state.employees.find(x => x.username === u && String(x.code) === String(c));
  if (e) {
    state.user = { role: 'emp', empId: e.id, prenom: e.prenom, nom: e.nom };
    sessionStorage.setItem('mu_user', JSON.stringify(state.user));
    return e;
  }
  return null;
}
function logout() {
  state.user = null;
  sessionStorage.removeItem('mu_user');
  state.page = null;
  render();
}

// ─────────── ANOMALY DETECTION ───────────
function detectAnomalies(empId=null, fromDate=null, toDate=null) {
  const anomalies = [];
  const from = fromDate || addDays(state.weekStart, -28);
  const to = toDate || addDays(state.weekStart, 7);

  const emps = empId ? state.employees.filter(e => e.id === empId) : state.employees.filter(e => e.statut === 'Actif');

  emps.forEach(emp => {
    // Walk every day between from..to
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) {
      const iso = dateISO(d);
      const dayIdx = (d.getDay() + 6) % 7;
      const wk = weekKey(d);
      const planned = state.shifts[`${emp.id}_${dayIdx}_${wk}`] || [];
      const punches = state.punches[`${emp.id}_${iso}`] || [];

      // Rule 1: planned but not pointed
      if (planned.length > 0 && punches.length === 0 && d < new Date()) {
        const isToday = iso === dateISO(new Date());
        if (!isToday) {
          anomalies.push({
            type: 'oubli',
            severity: 'alert',
            empId: emp.id,
            date: iso,
            title: `Oubli de pointage`,
            detail: `${emp.prenom} ${emp.nom} — ${fmtDateLong(d)} (${planned[0].start}-${planned[0].end} prévu)`
          });
        }
      }

      // Rule 2: pointed but no plan
      if (punches.length > 0 && planned.length === 0) {
        anomalies.push({
          type: 'horsplan',
          severity: 'warn',
          empId: emp.id,
          date: iso,
          title: `Pointage hors planning`,
          detail: `${emp.prenom} ${emp.nom} — ${fmtDateLong(d)} (aucun shift prévu)`
        });
      }

      // Rule 3: incomplete punch (entrée sans sortie pour un jour passé)
      const lastP = punches[punches.length-1];
      if (lastP && lastP.in && !lastP.out && d < new Date(new Date().setHours(0,0,0,0))) {
        anomalies.push({
          type: 'incomplet',
          severity: 'alert',
          empId: emp.id,
          date: iso,
          title: `Pointage incomplet`,
          detail: `${emp.prenom} ${emp.nom} — entrée à ${lastP.in} le ${fmtDateLong(d)}, pas de sortie`
        });
      }

      // Rule 4: écart contrat/réel sur la journée > 1h
      if (planned.length > 0 && punches.length > 0 && lastP.out) {
        const plannedH = planned.reduce((s, sh) => s + shiftHours(sh), 0);
        const realH = punches.reduce((s, p) => {
          if (!p.in || !p.out) return s;
          let d = timeToMin(p.out) - timeToMin(p.in);
          if (d < 0) d += 24*60;
          return s + d/60;
        }, 0);
        const gap = realH - plannedH;
        if (Math.abs(gap) >= 1) {
          anomalies.push({
            type: 'ecart',
            severity: gap > 0 ? 'warn' : 'alert',
            empId: emp.id,
            date: iso,
            title: `Écart contrat/réel : ${gap > 0 ? '+' : ''}${gap.toFixed(1)}h`,
            detail: `${emp.prenom} ${emp.nom} — ${fmtDateLong(d)} : prévu ${plannedH.toFixed(1)}h, réel ${realH.toFixed(1)}h`
          });
        }
      }
    }

    // Rule 5: dépassement horaire hebdo contrat
    const weeks = new Set();
    for (let d = new Date(from); d <= to; d = addDays(d, 1)) weeks.add(weekKey(d));
    weeks.forEach(wk => {
      let totalReal = 0;
      for (let i = 0; i < 7; i++) {
        const d = addDays(new Date(wk), i);
        const punches = state.punches[`${emp.id}_${dateISO(d)}`] || [];
        punches.forEach(p => {
          if (p.in && p.out) {
            let dur = timeToMin(p.out) - timeToMin(p.in);
            if (dur < 0) dur += 24*60;
            totalReal += dur / 60;
          }
        });
      }
      const limit = (emp.heures || 35);
      if (totalReal > limit + 3) {
        anomalies.push({
          type: 'depassement',
          severity: 'warn',
          empId: emp.id,
          date: wk,
          title: `Heures sup. non déclarées`,
          detail: `${emp.prenom} ${emp.nom} — semaine du ${new Date(wk).toLocaleDateString('fr-FR')} : ${totalReal.toFixed(1)}h pour un contrat ${limit}h`
        });
      }
    });
  });

  return anomalies;
}

// ─────────── ROUTING / RENDER ───────────
function render() {
  const app = $('#app');
  if (state.loading) {
    return; // boot screen stays
  }
  if (!state.user) {
    app.innerHTML = viewLogin();
    bindLogin();
    return;
  }
  if (state.user.role === 'admin') {
    if (!state.page) state.page = 'dashboard';
    app.innerHTML = viewAdminShell();
    bindAdmin();
    return;
  }
  if (state.user.role === 'emp') {
    if (!state.page) state.page = 'home';
    app.innerHTML = viewEmpShell();
    bindEmp();
    return;
  }
}

// ─────────── LOGIN VIEW ───────────
let loginMode = 'emp'; // default to employee (mobile use case)

function viewLogin() {
  return `
    <div class="login-screen">
      <div class="login-card">
        <div class="login-mark">M</div>
        <h1 class="login-h">Man'ouché</h1>
        <div class="login-sub">Espace RH</div>

        <div class="tab-switch" data-active="${loginMode === 'admin' ? '1' : '0'}">
          <button data-mode="emp" class="${loginMode==='emp'?'active':''}">Salarié</button>
          <button data-mode="admin" class="${loginMode==='admin'?'active':''}">Admin</button>
        </div>

        <form id="loginForm">
          <div class="field">
            <label class="field-label">${loginMode === 'admin' ? 'Identifiant' : 'Prénom / username'}</label>
            <input class="input" id="loginUser" autocomplete="username" placeholder="${loginMode === 'admin' ? 'admin' : 'ex: ahmad.y'}" />
          </div>
          <div class="field">
            <label class="field-label">${loginMode === 'admin' ? 'Code' : 'Code PIN'}</label>
            <input class="input mono" id="loginCode" type="password" inputmode="numeric" autocomplete="current-password" placeholder="••••" />
          </div>
          <button class="btn-pri" type="submit">Se connecter</button>
        </form>

        <div class="login-status">
          <span class="dot ${state.fbReady ? 'on' : 'off'}"></span>
          <span>${state.fbReady ? 'Synchronisation en temps réel' : 'Mode local'}</span>
        </div>
      </div>
    </div>`;
}

function bindLogin() {
  $$('[data-mode]').forEach(b => b.addEventListener('click', e => {
    loginMode = e.target.dataset.mode;
    render();
  }));
  $('#loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const u = $('#loginUser').value.trim().toLowerCase();
    const c = $('#loginCode').value.trim();
    if (!u || !c) { toast('Renseigne tous les champs', 'error'); return; }
    if (loginMode === 'admin') {
      if (authAdmin(u, c)) { toast('Bienvenue', 'good'); render(); }
      else toast('Identifiants invalides', 'error');
    } else {
      const e = authEmp(u, c);
      if (e) { toast(`Bonjour ${e.prenom}`, 'good'); render(); }
      else toast('Identifiants invalides', 'error');
    }
  });
}

// ─────────── ADMIN SHELL ───────────
function viewAdminShell() {
  const anomalies = detectAnomalies();
  const pendingReqs = Object.values(state.absenceRequests || {}).filter(r => r && r.status === 'pending').length;

  // Top-level sections — like Combo
  const TOP_SECTIONS = [
    { key: 'dashboard', label: 'Aperçu',   pages: ['dashboard'] },
    { key: 'planning',  label: 'Planning', pages: ['planning', 'month'] },
    { key: 'team',      label: 'Équipe',   pages: ['employees'] },
    { key: 'hours',     label: 'Heures',   pages: ['hours', 'pointages'] },
    { key: 'rh',        label: 'RH',       pages: ['requests', 'cp', 'rh', 'alerts'] },
  ];

  const currentSection = TOP_SECTIONS.find(s => s.pages.includes(state.page)) || TOP_SECTIONS[0];
  const showSubNav = currentSection.key === 'rh';

  return `
    <div class="shell">
      <header class="topnav">
        <div class="topnav-inner">
          <div class="topnav-brand">
            <span class="brand-mark">M</span>
            <span class="brand-name">Man'ouché</span>
          </div>
          <nav class="topnav-links">
            ${TOP_SECTIONS.map(s => {
              const active = s.key === currentSection.key;
              const firstPage = s.pages[0];
              return `<button class="topnav-link ${active?'active':''}" data-page="${firstPage}">${esc(s.label)}${s.key==='rh' && pendingReqs > 0 ? `<span class="dot-badge">${pendingReqs}</span>` : ''}</button>`;
            }).join('')}
          </nav>
          <div class="topnav-right">
            <button class="topnav-icon" title="${state.fbReady?'Connecté':'Hors ligne'}">
              <span class="status-dot-tiny" style="background:${state.fbReady?'#22c55e':'#737373'};"></span>
            </button>
            ${anomalies.length ? `<button class="topnav-icon" data-page="alerts" title="${anomalies.length} alertes">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
              <span class="dot-badge">${anomalies.length}</span>
            </button>` : ''}
            <button class="topnav-icon" data-logout title="Déconnexion">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
            </button>
            <div class="topnav-avatar">A</div>
          </div>
        </div>
        <div class="topnav-mobile">
          <select id="mobNav">
            <optgroup label="Tableau de bord">
              <option value="dashboard" ${state.page==='dashboard'?'selected':''}>Aperçu</option>
            </optgroup>
            <optgroup label="Planning">
              <option value="planning" ${state.page==='planning'?'selected':''}>Planning hebdo</option>
              <option value="month" ${state.page==='month'?'selected':''}>Vue mois</option>
            </optgroup>
            <optgroup label="Équipe">
              <option value="employees" ${state.page==='employees'?'selected':''}>Salariés</option>
            </optgroup>
            <optgroup label="Heures">
              <option value="hours" ${state.page==='hours'?'selected':''}>Préparation paie</option>
              <option value="pointages" ${state.page==='pointages'?'selected':''}>Pointages</option>
            </optgroup>
            <optgroup label="RH">
              <option value="requests" ${state.page==='requests'?'selected':''}>Demandes d'absence${pendingReqs?` (${pendingReqs})`:''}</option>
              <option value="cp" ${state.page==='cp'?'selected':''}>Compteurs CP</option>
              <option value="rh" ${state.page==='rh'?'selected':''}>Suivi RH</option>
              <option value="alerts" ${state.page==='alerts'?'selected':''}>Alertes${anomalies.length?` (${anomalies.length})`:''}</option>
            </optgroup>
          </select>
        </div>
      </header>

      <div class="shell-body">
        ${showSubNav ? `
          <aside class="subnav">
            <div class="subnav-section">RH</div>
            <button class="subnav-item ${state.page==='requests'?'active':''}" data-page="requests">
              Demandes d'absence
              ${pendingReqs > 0 ? `<span class="subnav-badge">${pendingReqs}</span>` : ''}
            </button>
            <button class="subnav-item ${state.page==='cp'?'active':''}" data-page="cp">Compteurs CP</button>
            <button class="subnav-item ${state.page==='rh'?'active':''}" data-page="rh">Suivi RH</button>
            <button class="subnav-item ${state.page==='alerts'?'active':''}" data-page="alerts">
              Alertes
              ${anomalies.length ? `<span class="subnav-badge alert">${anomalies.length}</span>` : ''}
            </button>
          </aside>
        ` : ''}

        <main class="main ${showSubNav?'has-subnav':''}">
          <div class="page-pad fade-in" id="adminBody">
            ${renderAdminPage()}
          </div>
        </main>
      </div>
    </div>`;
}

function renderAdminPage() {
  switch (state.page) {
    case 'dashboard': return pageDashboard();
    case 'planning': return pagePlanning();
    case 'month': return pageMonth();
    case 'hours': return pageHours();
    case 'pointages': return pagePointages();
    case 'alerts': return pageAlerts();
    case 'employees': return state.empDetail ? pageEmployeeDetail() : pageEmployees();
    case 'requests': return pageAbsenceRequests();
    case 'cp': return pageCpCompteurs();
    case 'rh': return pageRH();
    default: return pageDashboard();
  }
}

function bindAdmin() {
  $$('[data-page]').forEach(b => b.addEventListener('click', e => {
    state.page = e.currentTarget.dataset.page;
    state.empDetail = null;
    render();
  }));
  $$('[data-logout]').forEach(b => b.addEventListener('click', logout));
  const mob = $('#mobNav');
  if (mob) mob.addEventListener('change', e => {
    state.page = e.target.value;
    state.empDetail = null;
    render();
  });

  switch (state.page) {
    case 'dashboard': bindDashboard(); break;
    case 'planning': bindPlanning(); break;
    case 'month': bindMonth(); break;
    case 'hours': bindHours(); break;
    case 'pointages': bindPointages(); break;
    case 'alerts': bindAlerts(); break;
    case 'employees': state.empDetail ? bindEmployeeDetail() : bindEmployees(); break;
    case 'requests': bindAbsenceRequests(); break;
    case 'cp': bindCpCompteurs(); break;
    case 'rh': bindRH(); break;
  }
}

// ─────────── DASHBOARD ───────────
function pageDashboard() {
  const actives = state.employees.filter(e => e.statut === 'Actif');
  const wk = weekKey(state.weekStart);
  let totalHours = 0;
  actives.forEach(e => {
    for (let d = 0; d < 7; d++) {
      const sh = state.shifts[`${e.id}_${d}_${wk}`] || [];
      sh.forEach(s => totalHours += shiftHours(s));
    }
  });
  const anomalies = detectAnomalies();
  const todayISO = dateISO(new Date());
  const todayDay = (new Date().getDay() + 6) % 7;
  const todayShifts = actives.filter(e => (state.shifts[`${e.id}_${todayDay}_${wk}`]||[]).length > 0).length;

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">${fmtDateLong(new Date())}</div>
        <h1 class="h-display">Bonjour Jad.</h1>
      </div>
    </div>

    <div class="kpi-grid">
      <div class="kpi">
        <div class="kpi-label">Salariés actifs</div>
        <div class="kpi-value">${actives.length}</div>
        <div class="kpi-meta">${state.employees.length - actives.length} inactifs</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Heures planifiées</div>
        <div class="kpi-value">${Math.round(totalHours)}<span style="font-size:18px;color:var(--c-ink-4);"> h</span></div>
        <div class="kpi-meta">Semaine du ${state.weekStart.toLocaleDateString('fr-FR')}</div>
      </div>
      <div class="kpi">
        <div class="kpi-label">Au travail aujourd'hui</div>
        <div class="kpi-value">${todayShifts}</div>
        <div class="kpi-meta">sur ${actives.length} actifs</div>
      </div>
      <div class="kpi ${anomalies.length ? 'alert' : ''}">
        <div class="kpi-label">Anomalies</div>
        <div class="kpi-value">${anomalies.length}</div>
        <div class="kpi-meta">${anomalies.length ? 'à examiner' : 'tout est bon'}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Équipe en service aujourd'hui</h3>
        <button class="btn-ghost" data-page="planning">Voir le planning →</button>
      </div>
      <div class="panel-body nopad">
        ${renderTodayTeam(actives, todayDay, wk)}
      </div>
    </div>

    ${anomalies.length ? `
      <div class="panel" style="margin-top:16px;">
        <div class="panel-head">
          <h3>Anomalies récentes</h3>
          <button class="btn-ghost" data-page="alerts">Tout voir →</button>
        </div>
        <div class="panel-body nopad">
          ${anomalies.slice(0, 5).map(a => renderAlertRow(a)).join('')}
        </div>
      </div>` : ''}
  `;
}

function renderTodayTeam(actives, dayIdx, wk) {
  const onShift = actives
    .map(e => ({ e, shifts: state.shifts[`${e.id}_${dayIdx}_${wk}`] || [] }))
    .filter(x => x.shifts.length);
  if (!onShift.length) {
    return `<div class="empty"><h4>Personne aujourd'hui</h4><div>Aucun shift planifié pour ce jour.</div></div>`;
  }
  return `<table class="tbl">
    <thead><tr><th>Salarié</th><th>Horaire</th><th>Type</th><th>Heures</th></tr></thead>
    <tbody>
    ${onShift.map(({e, shifts}) => shifts.map(s => `
      <tr>
        <td><div class="emp-cell"><div class="av-emp">${initials(e)}</div><div><div class="emp-cell-name">${esc(e.prenom)} ${esc(e.nom)}</div><div class="emp-cell-meta">${esc(e.poste)}</div></div></div></td>
        <td class="mono">${s.start} → ${s.end}</td>
        <td><span class="chip">${s.type === 'midi' ? 'Midi' : s.type === 'soir' ? 'Soir' : 'Journée'}</span></td>
        <td class="mono tabular">${shiftHours(s).toFixed(1)} h</td>
      </tr>
    `).join('')).join('')}
    </tbody>
  </table>`;
}

function renderAlertRow(a) {
  const e = state.employees.find(x => x.id === a.empId);
  return `
    <div class="alert-row ${a.severity === 'warn' ? 'warn' : ''}">
      <div class="alert-icon">!</div>
      <div class="alert-body">
        <div class="alert-title">${esc(a.title)}</div>
        <div class="alert-meta">${esc(a.detail)}</div>
      </div>
    </div>`;
}

function bindDashboard() {
  $$('[data-page]').forEach(b => b.addEventListener('click', e => {
    const p = e.currentTarget.dataset.page;
    if (p) { state.page = p; render(); }
  }));
}

// ─────────── PLANNING ───────────
function pagePlanning() {
  const wk = weekKey(state.weekStart);
  const actives = state.employees.filter(e => e.statut === 'Actif');
  const wkEnd = addDays(state.weekStart, 6);
  const todayISO = dateISO(new Date());

  let weekShiftCount = 0;
  actives.forEach(e => {
    for (let d = 0; d < 7; d++) {
      weekShiftCount += (state.shifts[`${e.id}_${d}_${wk}`] || []).length;
    }
  });

  const prevWk = weekKey(addDays(state.weekStart, -7));
  let prevWeekShiftCount = 0;
  actives.forEach(e => {
    for (let d = 0; d < 7; d++) {
      prevWeekShiftCount += (state.shifts[`${e.id}_${d}_${prevWk}`] || []).length;
    }
  });

  const pub = state.publications[wk];
  const isPublished = !!pub;

  // Total heures planifiées
  let totalH = 0;
  actives.forEach(e => {
    for (let d = 0; d < 7; d++) {
      const shifts = state.shifts[`${e.id}_${d}_${wk}`] || [];
      shifts.forEach(s => totalH += shiftHours(s));
    }
  });

  // Jours fériés de la semaine
  const weekFeries = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(state.weekStart, i);
    const f = holidayFor(d);
    if (f) weekFeries.push({ date: d, dayIdx: i, ...f });
  }

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Planning hebdomadaire</div>
        <h1 class="h-1">${fmtRange(state.weekStart, wkEnd)}</h1>
        <div class="row" style="gap:8px;margin-top:6px;">
          <span class="chip">${Math.round(totalH)} h planifiées</span>
          ${isPublished
            ? `<span class="chip good">✓ Publié ${new Date(pub.publishedAt).toLocaleDateString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</span>`
            : (weekShiftCount > 0
              ? `<span class="chip draft">● BROUILLON — invisible des salariés</span>`
              : `<span class="chip">Semaine vide</span>`)}
        </div>
      </div>
      <div class="page-actions">
        <div class="week-nav">
          <button class="btn-icon" data-week="prev">←</button>
          <span class="week-label">Semaine du ${pad(state.weekStart.getDate())}/${pad(state.weekStart.getMonth()+1)}</span>
          <button class="btn-icon" data-week="next">→</button>
          <button class="btn-sec" data-week="today">Aujourd'hui</button>
        </div>
      </div>
    </div>

    ${!isPublished && weekShiftCount > 0 ? `
      <div class="info-banner draft-banner">
        <span style="font-size:18px;">📝</span>
        <div style="flex:1;">
          <strong>Cette semaine est un brouillon</strong>
          <div style="font-size:12px;margin-top:2px;opacity:.85;">Les salariés ne voient pas encore ce planning. Tu peux éditer librement. Quand c'est prêt, clique <strong>Publier le planning</strong> en bas à droite pour le rendre visible.</div>
        </div>
        <button class="btn-link" id="dismissDraftInfo">×</button>
      </div>
    ` : ''}

    ${weekFeries.length ? `
      <div class="ferie-banner">
        <span class="ferie-icon">🇫🇷</span>
        <div>
          <strong>Jour${weekFeries.length>1?'s':''} férié${weekFeries.length>1?'s':''} cette semaine</strong>
          <div style="font-size:12px;margin-top:2px;">${weekFeries.map(f => `${esc(f.long)} — ${DAYS[f.dayIdx]} ${f.date.getDate()}/${pad(f.date.getMonth()+1)}`).join(' · ')}</div>
        </div>
      </div>
    ` : ''}

    <div class="row plan-actions">
      <button class="btn-sec" id="dupFromPrev" ${prevWeekShiftCount > 0 ? '' : 'disabled style="opacity:.4;"'}>↺ Dupliquer la semaine précédente</button>
      <button class="btn-sec" id="clearWeek" ${weekShiftCount > 0 ? '' : 'disabled style="opacity:.4;"'}>🗑 Vider la semaine</button>
      <button class="btn-sec" id="exportCsv" ${weekShiftCount > 0 ? '' : 'disabled style="opacity:.4;"'}>↓ CSV</button>
      <button class="btn-sec" id="exportPdf" ${weekShiftCount > 0 ? '' : 'disabled style="opacity:.4;"'}>↓ PDF</button>
      <div class="spacer"></div>
      ${isPublished ? `<button class="btn-sec" id="unpublishBtn">Dépublier (repasser en brouillon)</button>` : ''}
      <button class="btn-pri" id="publishBtn" style="width:auto;padding:9px 16px;" ${weekShiftCount === 0 ? 'disabled style="opacity:.4;"' : ''}>
        ${isPublished ? '🔄 Republier le planning' : '📢 Publier le planning'}
      </button>
    </div>

    ${weekShiftCount === 0 ? `
      <div class="panel" style="margin-bottom:14px;background:#fafafa;border-style:dashed;">
        <div class="panel-body" style="text-align:center;padding:24px 18px;">
          <div class="serif" style="font-size:22px;letter-spacing:-0.02em;margin-bottom:4px;">Planning vide</div>
          <div class="text-mute" style="font-size:13px;margin-bottom:16px;">Clique sur les cases pour ajouter des shifts, ou charge un planning d'exemple pour démarrer rapidement.</div>
          <button class="btn-pri" id="seedDefault" style="width:auto;padding:10px 18px;">Charger un planning d'exemple</button>
        </div>
      </div>` : ''}

    <div class="panel">
      <div class="panel-body nopad">
        <div class="plan-wrap">
          <div class="plan">
            <div class="plan-cell head"><div class="day">Salarié</div></div>
            ${[0,1,2,3,4,5,6].map(i => {
              const d = addDays(state.weekStart, i);
              const isToday = dateISO(d) === todayISO;
              const fer = holidayFor(d);
              return `<div class="plan-cell head ${fer?'ferie':''}">
                <div class="day">${DAYS_SHORT[i]}</div>
                <div class="date ${isToday?'today':''}">${d.getDate()}</div>
                ${fer ? `<div class="ferie-tag" title="${esc(fer.long)}">${esc(fer.short)}</div>` : ''}
              </div>`;
            }).join('')}
            ${actives.map(e => {
              let empWeekH = 0;
              for (let d = 0; d < 7; d++) {
                const shifts = state.shifts[`${e.id}_${d}_${wk}`] || [];
                shifts.forEach(s => empWeekH += shiftHours(s));
              }
              const gap = empWeekH - (e.heures || 35);
              return `
              <div class="plan-cell emp">
                <div class="row" style="gap:10px;align-items:flex-start;">
                  <div class="av-emp sm">${initials(e)}</div>
                  <div style="flex:1;min-width:0;">
                    <div class="nm">${esc(e.prenom)}</div>
                    <div class="ct">${e.heures}h · <span style="color:${Math.abs(gap)<1?'var(--c-ink-4)':(gap>0?'var(--c-warn)':'var(--c-alert)')};">${empWeekH.toFixed(1)}h</span></div>
                  </div>
                </div>
              </div>
              ${[0,1,2,3,4,5,6].map(d => {
                const dateD = addDays(state.weekStart, d);
                const ferD = holidayFor(dateD);
                const shifts = (state.shifts[`${e.id}_${d}_${wk}`] || []).map(normShift);
                return `<div class="plan-cell cell ${shifts.length?'has':''} ${ferD?'ferie-cell':''}" data-edit="${e.id}_${d}">
                  ${shifts.map(s => renderShiftCell(s)).join('')}
                </div>`;
              }).join('')}
            `}).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:12px; color:var(--c-ink-4); font-size:12px;">
      <span>Astuce :</span><span>cliquez sur une cellule pour ajouter ou modifier un shift, ou pour marquer un congé/absence/arrêt maladie.</span>
    </div>
  `;
}

function renderShiftCell(s) {
  if (s.leaveType) {
    const lt = LEAVE_TYPES[s.leaveType] || { short: s.label || 'Absent', color: 'leave-justifie' };
    return `<div class="shift ${lt.color}">${esc(lt.short)}</div>`;
  }
  const dur = Math.round(shiftHours(s) * 60);
  const pauseStr = s.pauseDuration ? `<span class="pause">☕ ${s.pauseDuration}mn${s.pauseStart?` (${s.pauseStart}–${s.pauseEnd})`:''}</span>` : '';
  return `<div class="shift ${s.type}"><span class="l">${esc(s.label || (s.type==='midi'?'Ouverture':s.type==='soir'?'Fermeture':'Aller/Retour'))}</span><span class="t">${s.start}–${s.end}</span><span class="dur">${dur}mn</span>${pauseStr}</div>`;
}

function bindPlanning() {
  $$('[data-week]').forEach(b => b.addEventListener('click', e => {
    const a = e.currentTarget.dataset.week;
    if (a === 'prev') state.weekStart = addDays(state.weekStart, -7);
    else if (a === 'next') state.weekStart = addDays(state.weekStart, 7);
    else state.weekStart = getMonday(new Date());
    render();
  }));
  $$('[data-edit]').forEach(c => c.addEventListener('click', e => {
    const [empId, dayIdx] = e.currentTarget.dataset.edit.split('_').map(Number);
    openShiftEditor(empId, dayIdx);
  }));

  const seedBtn = $('#seedDefault');
  if (seedBtn) seedBtn.addEventListener('click', () => seedPlanningFromTemplate());

  const dupBtn = $('#dupFromPrev');
  if (dupBtn) dupBtn.addEventListener('click', () => duplicatePreviousWeek());

  const clearBtn = $('#clearWeek');
  if (clearBtn) clearBtn.addEventListener('click', () => clearCurrentWeek());

  const pubBtn = $('#publishBtn');
  if (pubBtn) pubBtn.addEventListener('click', () => publishWeek());

  const unpubBtn = $('#unpublishBtn');
  if (unpubBtn) unpubBtn.addEventListener('click', () => unpublishWeek());

  const csvBtn = $('#exportCsv');
  if (csvBtn) csvBtn.addEventListener('click', () => exportPlanningCSV());

  const pdfBtn = $('#exportPdf');
  if (pdfBtn) pdfBtn.addEventListener('click', () => exportPlanningPDF());
}

function publishWeek() {
  const wk = weekKey(state.weekStart);
  const payload = { publishedAt: new Date().toISOString(), by: 'admin' };
  state.publications[wk] = payload;
  fbSave(`publications/${wk}`, payload);
  toast(`Planning publié — visible par les salariés`, 'good');
  render();
}

function unpublishWeek() {
  const wk = weekKey(state.weekStart);
  if (!confirm(`Repasser ce planning en brouillon ?\n\nIl ne sera plus visible par les salariés.`)) return;
  delete state.publications[wk];
  fbSave(`publications/${wk}`, null);
  toast('Repassé en brouillon', '');
  render();
}

function clearCurrentWeek() {
  const wk = weekKey(state.weekStart);
  const actives = state.employees.filter(e => e.statut === 'Actif');
  if (!confirm(`Vider tout le planning de la semaine du ${state.weekStart.toLocaleDateString('fr-FR')} ?`)) return;
  const updates = {};
  actives.forEach(e => {
    for (let d = 0; d < 7; d++) {
      const k = `${e.id}_${d}_${wk}`;
      if (state.shifts[k]) {
        delete state.shifts[k];
        updates[k] = null;
      }
    }
  });
  if (db && Object.keys(updates).length) db.ref('shifts').update(updates).catch(e => console.warn(e));
  toast('Semaine vidée', '');
  render();
}

function seedPlanningFromTemplate() {
  const wk = weekKey(state.weekStart);
  const updates = {};
  let count = 0;
  Object.entries(SEED_SHIFTS).forEach(([k, v]) => {
    const [empId, dayIdx] = k.split('_');
    const emp = state.employees.find(e => String(e.id) === empId && e.statut === 'Actif');
    if (!emp) return;
    const newKey = `${empId}_${dayIdx}_${wk}`;
    state.shifts[newKey] = v;
    updates[newKey] = v;
    count++;
  });
  if (db) db.ref('shifts').update(updates).catch(e => console.warn(e));
  toast(`${count} shifts chargés`, 'good');
  render();
}

function duplicatePreviousWeek() {
  const prevWk = weekKey(addDays(state.weekStart, -7));
  const curWk = weekKey(state.weekStart);
  const updates = {};
  let count = 0;
  state.employees.forEach(emp => {
    for (let d = 0; d < 7; d++) {
      const prevShifts = state.shifts[`${emp.id}_${d}_${prevWk}`];
      if (prevShifts && prevShifts.length) {
        const newKey = `${emp.id}_${d}_${curWk}`;
        state.shifts[newKey] = JSON.parse(JSON.stringify(prevShifts));
        updates[newKey] = state.shifts[newKey];
        count++;
      }
    }
  });
  if (db) db.ref('shifts').update(updates).catch(e => console.warn(e));
  toast(`${count} shifts dupliqués`, 'good');
  render();
}

function openShiftEditor(empId, dayIdx) {
  const wk = weekKey(state.weekStart);
  const key = `${empId}_${dayIdx}_${wk}`;
  const existing = (state.shifts[key] || []).map(normShift);
  const e = state.employees.find(x => x.id === empId);
  const sh = existing[0] || { type: 'soir', start: '17:00', end: '23:00', pauseDuration: 0 };
  const d = addDays(state.weekStart, dayIdx);
  const currentLeave = sh.leaveType || '';

  const body = `
    <div class="uppercase-eyebrow" style="margin-bottom:4px;">${esc(e.prenom)} ${esc(e.nom)}</div>
    <div style="font-family:var(--f-display);font-size:22px;letter-spacing:-0.01em;margin-bottom:18px;">${fmtDateLong(d)}</div>

    <div class="field full">
      <label class="field-label">Statut</label>
      <select class="input" id="shLeaveType">
        <option value="">— Travaille (shift normal) —</option>
        ${Object.entries(LEAVE_TYPES).map(([k,v]) => `<option value="${k}" ${currentLeave===k?'selected':''}>${esc(v.label)}</option>`).join('')}
      </select>
    </div>

    <div id="shFieldsWrap" ${currentLeave?'style="display:none;"':''}>
      <div class="form-grid" style="margin-top:14px;">
        <div class="field full">
          <label class="field-label">Type de service</label>
          <div class="tab-switch" id="shType" data-active="${sh.type==='midi'?'0':sh.type==='soir'?'1':'2'}" style="grid-template-columns:1fr 1fr 1fr;">
            <button type="button" data-t="midi" class="${sh.type==='midi'?'active':''}">Ouverture</button>
            <button type="button" data-t="soir" class="${sh.type==='soir'?'active':''}">Fermeture</button>
            <button type="button" data-t="ar" class="${sh.type==='ar'?'active':''}">Aller/Retour</button>
          </div>
        </div>
        <div class="field">
          <label class="field-label">Début</label>
          <input class="input mono" id="shStart" type="time" value="${sh.start || '17:00'}">
        </div>
        <div class="field">
          <label class="field-label">Fin</label>
          <input class="input mono" id="shEnd" type="time" value="${sh.end || '23:00'}">
        </div>
        <div class="field">
          <label class="field-label">Pause (mn)</label>
          <input class="input mono" id="shPauseDur" type="number" min="0" step="15" value="${sh.pauseDuration || 0}">
        </div>
        <div class="field">
          <label class="field-label">Pause début</label>
          <input class="input mono" id="shPauseStart" type="time" value="${sh.pauseStart || ''}">
        </div>
        <div class="field full">
          <label class="field-label">Pause fin</label>
          <input class="input mono" id="shPauseEnd" type="time" value="${sh.pauseEnd || ''}">
        </div>
        <div class="field full">
          <label class="field-label">Libellé (optionnel)</label>
          <input class="input" id="shLabel" placeholder="ex: Patron, Renfort..." value="${esc(sh.label || '')}">
        </div>
      </div>
    </div>
  `;

  const footer = `
    ${existing.length ? `<button class="btn-danger" id="shDel">Supprimer</button>` : ''}
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="shSave" style="width:auto;padding:10px 18px;">Enregistrer</button>
  `;

  const { close } = openModal({ title: 'Édition du jour', body, footer });

  let chosenType = sh.type || 'soir';
  $$('#shType [data-t]').forEach(b => b.addEventListener('click', e => {
    chosenType = e.target.dataset.t;
    $$('#shType [data-t]').forEach(x => x.classList.toggle('active', x === e.target));
    const idx = chosenType === 'midi' ? 0 : chosenType === 'soir' ? 1 : 2;
    $('#shType').setAttribute('data-active', idx);
  }));

  $('#shLeaveType').addEventListener('change', ev => {
    $('#shFieldsWrap').style.display = ev.target.value ? 'none' : '';
  });

  $('#shSave').addEventListener('click', () => {
    const leave = $('#shLeaveType').value;
    let newSh;
    if (leave) {
      newSh = { leaveType: leave, label: LEAVE_TYPES[leave].label };
    } else {
      newSh = {
        type: chosenType,
        start: $('#shStart').value,
        end: $('#shEnd').value,
        pauseDuration: parseInt($('#shPauseDur').value) || 0,
      };
      const ps = $('#shPauseStart').value;
      const pe = $('#shPauseEnd').value;
      const lbl = $('#shLabel').value.trim();
      if (ps) newSh.pauseStart = ps;
      if (pe) newSh.pauseEnd = pe;
      if (lbl) newSh.label = lbl;
    }
    state.shifts[key] = [newSh];
    fbSave(`shifts/${key}`, [newSh]);
    toast('Enregistré', 'good');
    close();
    render();
  });

  if (existing.length) {
    $('#shDel').addEventListener('click', () => {
      delete state.shifts[key];
      fbSave(`shifts/${key}`, null);
      toast('Supprimé', '');
      close();
      render();
    });
  }
}

// ─────────── MONTH VIEW ───────────
function pageMonth() {
  const anchor = state.monthAnchor;
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const monthName = MONTHS_FR[month];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month+1, 0);
  // First Monday on or before firstDay
  const gridStart = getMonday(firstDay);
  // Last Sunday on or after lastDay
  const lastDayOfWeek = (lastDay.getDay() + 6) % 7;
  const gridEnd = addDays(lastDay, 6 - lastDayOfWeek);
  const totalDays = Math.round((gridEnd - gridStart) / 86400000) + 1;

  const actives = state.employees.filter(e => e.statut === 'Actif');
  const todayISO = dateISO(new Date());

  // Aggregate per day
  const daysData = [];
  let monthTotalH = 0;
  for (let i = 0; i < totalDays; i++) {
    const d = addDays(gridStart, i);
    const wk = weekKey(d);
    const dayIdx = (d.getDay() + 6) % 7;
    const inMonth = d.getMonth() === month;
    let dayH = 0, workers = 0, leaves = [];
    actives.forEach(e => {
      const shifts = (state.shifts[`${e.id}_${dayIdx}_${wk}`] || []).map(normShift);
      shifts.forEach(s => {
        if (s.leaveType) {
          leaves.push({emp:e, leaveType:s.leaveType});
        } else {
          dayH += shiftHours(s);
          workers++;
        }
      });
    });
    if (inMonth) monthTotalH += dayH;
    daysData.push({date:d, inMonth, dayH, workers, leaves});
  }

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Vue mois</div>
        <h1 class="h-1" style="text-transform:capitalize;">${monthName} ${year}</h1>
        <div class="chip" style="margin-top:6px;">${Math.round(monthTotalH)} h planifiées dans le mois</div>
      </div>
      <div class="page-actions">
        <div class="week-nav">
          <button class="btn-icon" data-mnav="prev">←</button>
          <button class="btn-sec" data-mnav="today">Ce mois</button>
          <button class="btn-icon" data-mnav="next">→</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad">
        <div class="month-grid">
          ${DAYS_SHORT.map(d => `<div class="mc head"><div class="day">${d}</div></div>`).join('')}
          ${daysData.map(d => {
            const isToday = dateISO(d.date) === todayISO;
            const fer = holidayFor(d.date);
            return `
              <div class="mc ${d.inMonth?'':'out'} ${isToday?'today':''} ${fer?'ferie':''}" data-mday="${dateISO(d.date)}">
                <div class="mc-date ${isToday?'today':''}">${d.date.getDate()}</div>
                ${fer ? `<div class="mc-ferie" title="${esc(fer.long)}">${esc(fer.short)}</div>` : ''}
                ${d.workers > 0 ? `<div class="mc-stat"><strong>${d.dayH.toFixed(1)}h</strong> · ${d.workers} pers.</div>` : ''}
                ${d.leaves.length > 0 ? `<div class="mc-leaves">${d.leaves.map(l => `<span class="mc-leave ${LEAVE_TYPES[l.leaveType]?.color || ''}" title="${esc(l.emp.prenom)} — ${esc(LEAVE_TYPES[l.leaveType]?.label || '')}">${esc(l.emp.prenom.charAt(0))}</span>`).join('')}</div>` : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:14px;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--c-ink-4);">
      <span><span class="dot-color" style="background:#dbeafe;"></span> CP</span>
      <span><span class="dot-color" style="background:#fef3c7;"></span> Absent justifié</span>
      <span><span class="dot-color" style="background:#fee2e2;"></span> Absent injustifié</span>
      <span><span class="dot-color" style="background:#ede9fe;"></span> Arrêt maladie</span>
      <span><span class="dot-color" style="background:#cffafe;"></span> RTT</span>
    </div>
  `;
}

function bindMonth() {
  $$('[data-mnav]').forEach(b => b.addEventListener('click', e => {
    const a = e.currentTarget.dataset.mnav;
    if (a === 'prev') state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth()-1, 1);
    else if (a === 'next') state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth()+1, 1);
    else state.monthAnchor = new Date();
    render();
  }));
  $$('[data-mday]').forEach(c => c.addEventListener('click', e => {
    const iso = e.currentTarget.dataset.mday;
    state.weekStart = getMonday(new Date(iso));
    state.page = 'planning';
    render();
  }));
}

// ─────────── HOURS TRACKING ───────────
// ─────────── HOURS TRACKING — VUE COMPTA ───────────
function pageHours() {
  const anchor = state.monthAnchor || new Date();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const actives = state.employees.filter(e => e.statut === 'Actif');
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month+1, 0);

  // Build detailed data for each employee
  const data = actives.map(emp => {
    const n = normEmp(emp);
    let plannedTotal = 0, realTotal = 0;
    let supplH25 = 0, supplH50 = 0, normalH = 0;
    const leaves = { cp: 0, absent_justifie: 0, absent_injustifie: 0, arret_maladie: 0, rtt: 0, recup: 0 };
    let workedDays = 0;
    let ferieWorked = 0; // jours fériés travaillés

    // Iterate week by week to compute heures sup correctly
    const firstMonday = getMonday(monthStart);
    for (let wkDate = new Date(firstMonday); wkDate <= monthEnd; wkDate = addDays(wkDate, 7)) {
      const wk = weekKey(wkDate);
      let wkPlanned = 0;
      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(wkDate, d);
        if (dayDate.getMonth() !== month) continue; // only count days in this month
        const shifts = (state.shifts[`${emp.id}_${d}_${wk}`] || []).map(normShift);
        const fer = holidayFor(dayDate);
        shifts.forEach(s => {
          if (s.leaveType) {
            leaves[s.leaveType] = (leaves[s.leaveType] || 0) + 1;
          } else {
            const h = shiftHours(s);
            wkPlanned += h;
            plannedTotal += h;
            if (h > 0) workedDays++;
            if (fer && h > 0) ferieWorked++;
          }
        });
        // Real hours from punches
        const pks = state.punches[`${emp.id}_${dateISO(dayDate)}`] || [];
        pks.forEach(p => {
          if (p.in && p.out) {
            let dur = timeToMin(p.out) - timeToMin(p.in);
            if (dur < 0) dur += 24*60;
            realTotal += dur / 60;
          }
        });
      }
      // Compute heures sup for this week based on contract
      const contractH = n.heures || 35;
      const wkNormal = Math.min(wkPlanned, contractH);
      const wkSupp25 = Math.min(Math.max(wkPlanned - contractH, 0), 8);
      const wkSupp50 = Math.max(wkPlanned - contractH - 8, 0);
      normalH += wkNormal;
      supplH25 += wkSupp25;
      supplH50 += wkSupp50;
    }

    const taux = n.taux || 12;
    const salaireNormal = normalH * taux;
    const salaireS25 = supplH25 * taux * 1.25;
    const salaireS50 = supplH50 * taux * 1.50;
    const totalBrutPlanifie = salaireNormal + salaireS25 + salaireS50;
    const navigoMensuel = n.navigoMensuel || 0;

    return {
      emp, n,
      plannedTotal, realTotal,
      normalH, supplH25, supplH50,
      salaireNormal, salaireS25, salaireS50, totalBrutPlanifie,
      leaves, workedDays, ferieWorked,
      navigoMensuel,
    };
  });

  // 8 last weeks for synthesis
  const weeks = [];
  for (let i = 7; i >= 0; i--) weeks.push(addDays(state.weekStart, -7 * i));

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Suivi des heures · Paie</div>
        <h1 class="h-1">Heures et préparation paie</h1>
      </div>
      <div class="page-actions">
        <div class="week-nav">
          <button class="btn-icon" data-hnav="prev">←</button>
          <span class="week-label" style="text-transform:capitalize;min-width:170px;">${MONTHS_FR[month]} ${year}</span>
          <button class="btn-icon" data-hnav="next">→</button>
          <button class="btn-sec" data-hnav="today">Mois en cours</button>
        </div>
      </div>
    </div>

    <div class="row" style="margin-bottom:14px;gap:8px;flex-wrap:wrap;">
      <button class="btn-pri" id="exportPaieCsv" style="width:auto;padding:9px 16px;">↓ Export paie (CSV)</button>
      <button class="btn-sec" id="exportPaieDetailled">↓ Export détaillé (CSV)</button>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Récap mensuel pour la paie</h3>
        <span class="text-mute" style="font-size:11.5px;">HCR · sup +25% (36h→43h) · sup +50% (>43h)</span>
      </div>
      <div class="panel-body nopad" style="overflow-x:auto;">
        <table class="tbl tbl-compact">
          <thead>
            <tr>
              <th>Salarié</th>
              <th>Contrat</th>
              <th>Taux €/h</th>
              <th>H. contrat<br>mensuel</th>
              <th>H. normales</th>
              <th>H. sup +25%</th>
              <th>H. sup +50%</th>
              <th>Total H</th>
              <th>Brut estimé</th>
              <th>Navigo</th>
              <th>CP</th>
              <th>AM</th>
              <th>Abs.</th>
              <th>J. fériés trav.</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${data.map(d => {
              const contractMonthly = ((d.n.heures||35) * 52 / 12).toFixed(1);
              const totalAbs = (d.leaves.absent_justifie||0) + (d.leaves.absent_injustifie||0);
              return `
                <tr>
                  <td>
                    <div class="emp-cell">
                      <div class="av-emp sm">${initials(d.emp)}</div>
                      <div>
                        <div class="emp-cell-name">${esc(d.emp.prenom)} ${esc(d.emp.nom)}</div>
                        <div class="emp-cell-meta">${esc(d.emp.poste||'')}</div>
                      </div>
                    </div>
                  </td>
                  <td><span class="chip">${esc(d.emp.contrat||'—')} ${d.n.heures||0}h</span></td>
                  <td class="mono tabular">${d.n.taux ? d.n.taux.toFixed(2)+' €' : '—'}</td>
                  <td class="mono tabular text-mute">${contractMonthly} h</td>
                  <td class="mono tabular"><strong>${d.normalH.toFixed(1)} h</strong></td>
                  <td class="mono tabular ${d.supplH25>0?'over':''}">${d.supplH25.toFixed(1)} h</td>
                  <td class="mono tabular ${d.supplH50>0?'over':''}">${d.supplH50.toFixed(1)} h</td>
                  <td class="mono tabular"><strong>${(d.normalH+d.supplH25+d.supplH50).toFixed(1)} h</strong></td>
                  <td class="mono tabular"><strong>${d.totalBrutPlanifie.toFixed(2)} €</strong></td>
                  <td class="mono tabular">${d.navigoMensuel ? d.navigoMensuel.toFixed(2)+' €' : '—'}</td>
                  <td class="mono tabular">${d.leaves.cp || '—'}</td>
                  <td class="mono tabular">${d.leaves.arret_maladie || '—'}</td>
                  <td class="mono tabular">${totalAbs || '—'}</td>
                  <td class="mono tabular">${d.ferieWorked || '—'}</td>
                  <td><button class="btn-ghost" data-detail-emp="${d.emp.id}">Détail →</button></td>
                </tr>
              `;
            }).join('')}
            ${data.length > 0 ? `
              <tr style="background:#f5f5f5;font-weight:600;">
                <td>TOTAL ÉQUIPE</td>
                <td>—</td>
                <td>—</td>
                <td class="mono tabular">${data.reduce((s,d) => s + (d.n.heures||35) * 52/12, 0).toFixed(1)} h</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.normalH, 0).toFixed(1)} h</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.supplH25, 0).toFixed(1)} h</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.supplH50, 0).toFixed(1)} h</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.normalH + d.supplH25 + d.supplH50, 0).toFixed(1)} h</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.totalBrutPlanifie, 0).toFixed(2)} €</td>
                <td class="mono tabular">${data.reduce((s,d) => s + (d.navigoMensuel||0), 0).toFixed(2)} €</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.leaves.cp, 0) || '—'}</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.leaves.arret_maladie, 0) || '—'}</td>
                <td class="mono tabular">${data.reduce((s,d) => s + (d.leaves.absent_justifie||0) + (d.leaves.absent_injustifie||0), 0) || '—'}</td>
                <td class="mono tabular">${data.reduce((s,d) => s + d.ferieWorked, 0) || '—'}</td>
                <td></td>
              </tr>
            ` : ''}
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel-head">
        <h3>8 dernières semaines · heures planifiées</h3>
      </div>
      <div class="panel-body nopad" style="overflow-x:auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Salarié</th>
              <th>Contrat</th>
              ${weeks.map(w => `<th class="mono">S.${pad(w.getDate())}/${pad(w.getMonth()+1)}</th>`).join('')}
              <th>Moy./sem</th>
            </tr>
          </thead>
          <tbody>
            ${actives.map(emp => {
              const wkHours = weeks.map(w => {
                const wk = weekKey(w);
                let h = 0;
                for (let d = 0; d < 7; d++) {
                  (state.shifts[`${emp.id}_${d}_${wk}`] || []).map(normShift).forEach(s => h += shiftHours(s));
                }
                return h;
              });
              const avg = wkHours.reduce((a,b)=>a+b,0) / wkHours.length;
              return `
                <tr>
                  <td><div class="emp-cell"><div class="av-emp sm">${initials(emp)}</div><span class="emp-cell-name">${esc(emp.prenom)}</span></div></td>
                  <td class="mono">${emp.heures}h</td>
                  ${wkHours.map(h => {
                    const gap = h - emp.heures;
                    const cls = h === 0 ? 'text-dim' : Math.abs(gap) < 1 ? '' : gap > 0 ? 'over' : 'under';
                    return `<td class="mono tabular ${cls}">${h > 0 ? h.toFixed(1) : '—'}</td>`;
                  }).join('')}
                  <td class="mono tabular"><strong>${avg.toFixed(1)}</strong></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="row text-mute" style="margin-top:12px;font-size:11.5px;gap:14px;flex-wrap:wrap;">
      <span><strong>Brut estimé</strong> = (H. normales × taux) + (H. sup 25% × taux × 1,25) + (H. sup 50% × taux × 1,50)</span>
      <span><strong>Hors</strong> : primes, ancienneté, panier-repas, mutuelle, charges</span>
    </div>
  `;
}

function bindHours() {
  $$('[data-hnav]').forEach(b => b.addEventListener('click', e => {
    const a = e.currentTarget.dataset.hnav;
    if (!state.monthAnchor) state.monthAnchor = new Date();
    if (a === 'prev') state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth()-1, 1);
    else if (a === 'next') state.monthAnchor = new Date(state.monthAnchor.getFullYear(), state.monthAnchor.getMonth()+1, 1);
    else state.monthAnchor = new Date();
    render();
  }));
  $$('[data-detail-emp]').forEach(b => b.addEventListener('click', e => {
    state.empDetail = parseInt(e.currentTarget.dataset.detailEmp);
    state.empTab = 'temps';
    state.page = 'employees';
    render();
  }));
  const exp1 = $('#exportPaieCsv');
  if (exp1) exp1.addEventListener('click', () => exportPaieCSV(false));
  const exp2 = $('#exportPaieDetailled');
  if (exp2) exp2.addEventListener('click', () => exportPaieCSV(true));
}

function exportPaieCSV(detailed) {
  const anchor = state.monthAnchor || new Date();
  const year = anchor.getFullYear();
  const month = anchor.getMonth();
  const actives = state.employees.filter(e => e.statut === 'Actif');
  const monthEnd = new Date(year, month+1, 0);
  const firstMonday = getMonday(new Date(year, month, 1));

  const lines = [];
  if (detailed) {
    lines.push('Salarié;Poste;Type contrat;H. contrat hebdo;H. contrat mensuel;Taux €/h;H. normales;H. sup +25%;H. sup +50%;Total H;Brut normales €;Brut sup 25% €;Brut sup 50% €;Total brut €;Navigo €;Jours CP;Jours AM;Absences justifiées;Absences injustifiées;RTT;Récup;Jours fériés travaillés');
  } else {
    lines.push('Salarié;Type contrat;H. contrat;Taux €/h;H. normales;H. sup +25%;H. sup +50%;Total H;Brut estimé €;Navigo €;CP;AM');
  }

  actives.forEach(emp => {
    const n = normEmp(emp);
    let plannedTotal = 0, normalH = 0, supplH25 = 0, supplH50 = 0;
    const leaves = { cp: 0, absent_justifie: 0, absent_injustifie: 0, arret_maladie: 0, rtt: 0, recup: 0 };
    let ferieWorked = 0;
    for (let wkDate = new Date(firstMonday); wkDate <= monthEnd; wkDate = addDays(wkDate, 7)) {
      const wk = weekKey(wkDate);
      let wkPlanned = 0;
      for (let d = 0; d < 7; d++) {
        const dayDate = addDays(wkDate, d);
        if (dayDate.getMonth() !== month) continue;
        const shifts = (state.shifts[`${emp.id}_${d}_${wk}`] || []).map(normShift);
        const fer = holidayFor(dayDate);
        shifts.forEach(s => {
          if (s.leaveType) leaves[s.leaveType] = (leaves[s.leaveType] || 0) + 1;
          else {
            const h = shiftHours(s);
            wkPlanned += h; plannedTotal += h;
            if (fer && h > 0) ferieWorked++;
          }
        });
      }
      const contractH = n.heures || 35;
      normalH += Math.min(wkPlanned, contractH);
      supplH25 += Math.min(Math.max(wkPlanned - contractH, 0), 8);
      supplH50 += Math.max(wkPlanned - contractH - 8, 0);
    }
    const taux = n.taux || 12;
    const contractMonthly = (n.heures||35) * 52 / 12;
    const brutN = normalH * taux;
    const brutS25 = supplH25 * taux * 1.25;
    const brutS50 = supplH50 * taux * 1.50;
    const total = brutN + brutS25 + brutS50;
    const fr = v => String(v.toFixed(2)).replace('.', ',');
    const fr1 = v => String(v.toFixed(1)).replace('.', ',');

    if (detailed) {
      lines.push([
        csvEsc(`${emp.prenom} ${emp.nom}`),
        csvEsc(emp.poste||''),
        csvEsc(emp.contrat||''),
        n.heures||35,
        fr1(contractMonthly),
        fr(taux),
        fr1(normalH),
        fr1(supplH25),
        fr1(supplH50),
        fr1(normalH+supplH25+supplH50),
        fr(brutN),
        fr(brutS25),
        fr(brutS50),
        fr(total),
        fr(n.navigoMensuel||0),
        leaves.cp,
        leaves.arret_maladie,
        leaves.absent_justifie,
        leaves.absent_injustifie,
        leaves.rtt,
        leaves.recup,
        ferieWorked,
      ].join(';'));
    } else {
      lines.push([
        csvEsc(`${emp.prenom} ${emp.nom}`),
        csvEsc(emp.contrat||''),
        `${n.heures||35}h`,
        fr(taux),
        fr1(normalH),
        fr1(supplH25),
        fr1(supplH50),
        fr1(normalH+supplH25+supplH50),
        fr(total),
        fr(n.navigoMensuel||0),
        leaves.cp,
        leaves.arret_maladie,
      ].join(';'));
    }
  });

  const csv = lines.join('\r\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `paie_${MONTHS_FR[month]}_${year}${detailed?'_detail':''}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV téléchargé', 'good');
}

// ─────────── POINTAGES ───────────
function pagePointages() {
  // Show last 14 days
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(addDays(new Date(), -i));
  const actives = state.employees.filter(e => e.statut === 'Actif');

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Pointages</div>
        <h1 class="h-1">14 derniers jours</h1>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad">
        <table class="tbl">
          <thead><tr><th>Date</th><th>Salarié</th><th>Entrée</th><th>Sortie</th><th>Durée</th><th>État</th></tr></thead>
          <tbody>
            ${days.flatMap(d => {
              const iso = dateISO(d);
              const dayIdx = (d.getDay() + 6) % 7;
              const wk = weekKey(d);
              return actives.flatMap(e => {
                const punches = state.punches[`${e.id}_${iso}`] || [];
                const planned = state.shifts[`${e.id}_${dayIdx}_${wk}`] || [];
                if (!punches.length && !planned.length) return [];
                if (!punches.length) {
                  return [`<tr>
                    <td class="mono">${pad(d.getDate())}/${pad(d.getMonth()+1)}</td>
                    <td><div class="emp-cell"><div class="av-emp sm">${initials(e)}</div><span class="emp-cell-name">${esc(e.prenom)}</span></div></td>
                    <td class="text-dim">—</td><td class="text-dim">—</td><td class="text-dim">—</td>
                    <td><span class="chip alert">Pas de pointage</span></td>
                  </tr>`];
                }
                return punches.map(p => `
                  <tr>
                    <td class="mono">${pad(d.getDate())}/${pad(d.getMonth()+1)}</td>
                    <td><div class="emp-cell"><div class="av-emp sm">${initials(e)}</div><span class="emp-cell-name">${esc(e.prenom)}</span></div></td>
                    <td class="mono">${p.in || '—'}</td>
                    <td class="mono">${p.out || '<span class="text-dim">en cours</span>'}</td>
                    <td class="mono tabular">${p.in && p.out ? ((timeToMin(p.out) - timeToMin(p.in) + (timeToMin(p.out)<timeToMin(p.in)?1440:0))/60).toFixed(1) + ' h' : '—'}</td>
                    <td>${p.in && p.out ? '<span class="chip good">Complet</span>' : '<span class="chip warn">En cours</span>'}</td>
                  </tr>
                `);
              });
            }).join('') || `<tr><td colspan="6"><div class="empty"><h4>Aucun pointage</h4><div>Les pointages des salariés apparaîtront ici.</div></div></td></tr>`}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
function bindPointages() {}

// ─────────── ALERTS ───────────
function pageAlerts() {
  const all = detectAnomalies();
  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Surveillance</div>
        <h1 class="h-1">Anomalies de pointage</h1>
      </div>
      <div class="page-actions">
        <span class="chip ${all.length?'alert':'good'}">${all.length} ${all.length>1?'anomalies':'anomalie'}</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad">
        ${all.length === 0
          ? `<div class="empty"><h4>Tout est en ordre</h4><div>Aucune anomalie détectée sur les 28 derniers jours.</div></div>`
          : all.map(a => renderAlertRow(a)).join('')}
      </div>
    </div>

    <div class="panel" style="margin-top:16px;">
      <div class="panel-head"><h3>Règles de détection</h3></div>
      <div class="panel-body" style="font-size:13px;line-height:1.7;color:var(--c-ink-3);">
        <div><strong style="color:var(--c-ink);">Oubli de pointage</strong> · planning prévu mais aucun pointage enregistré pour la journée passée.</div>
        <div><strong style="color:var(--c-ink);">Pointage hors planning</strong> · un salarié pointe sans shift prévu.</div>
        <div><strong style="color:var(--c-ink);">Pointage incomplet</strong> · entrée sans sortie pour un jour passé.</div>
        <div><strong style="color:var(--c-ink);">Écart contrat/réel</strong> · différence d'au moins 1h entre planning et réel sur une journée.</div>
        <div><strong style="color:var(--c-ink);">Heures sup. non déclarées</strong> · dépassement de plus de 3h du contrat hebdo sans heures sup. déclarées.</div>
      </div>
    </div>
  `;
}
function bindAlerts() {}

// ─────────── EMPLOYEES ───────────
// ─────────── EMPLOYEES — LIST ───────────
function pageEmployees() {
  const sorted = [...state.employees].sort((a,b) => {
    if (a.statut !== b.statut) return a.statut === 'Actif' ? -1 : 1;
    return (a.prenom + a.nom).localeCompare(b.prenom + b.nom);
  });
  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Équipe</div>
        <h1 class="h-1">Salariés (${state.employees.length})</h1>
      </div>
      <div class="page-actions">
        <button class="btn-pri" id="addEmp" style="width:auto;padding:10px 16px;">+ Nouveau salarié</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad">
        <table class="tbl">
          <thead><tr><th>Salarié</th><th>Poste</th><th>Contrat</th><th>Heures</th><th>Email</th><th>Statut</th><th>Profil</th><th></th></tr></thead>
          <tbody>
            ${sorted.map(e => {
              const n = normEmp(e);
              const complete = isProfileComplete(n);
              return `
              <tr>
                <td><div class="emp-cell"><div class="av-emp">${initials(e)}</div><div><div class="emp-cell-name">${esc(e.prenom)} ${esc(e.nom)}</div><div class="emp-cell-meta">${esc(n.telMobile||'—')}</div></div></div></td>
                <td>${esc(e.poste||'—')}</td>
                <td><span class="chip">${esc(e.contrat||'—')}</span></td>
                <td class="mono tabular">${e.heures||0}h</td>
                <td class="mono" style="font-size:12px;">${esc(n.email||'—')}</td>
                <td><span class="status-dot ${e.statut==='Actif'?'on':'off'}">${esc(e.statut||'—')}</span></td>
                <td>${complete ? '<span class="chip good" style="font-size:10.5px;">✓ Complet</span>' : '<span class="chip warn" style="font-size:10.5px;">À compléter</span>'}</td>
                <td><button class="btn-ghost" data-view-emp="${e.id}">Voir →</button></td>
              </tr>
            `}).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function bindEmployees() {
  $('#addEmp').addEventListener('click', () => openEmployeeCreator());
  $$('[data-view-emp]').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.currentTarget.dataset.viewEmp);
    state.empDetail = id;
    state.empTab = 'info';
    render();
  }));
}

function openEmployeeCreator() {
  const newId = Math.max(0, ...state.employees.map(x => x.id||0)) + 1;
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Prénom *</label><input class="input" id="ncPrenom"></div>
      <div class="field"><label class="field-label">Nom *</label><input class="input" id="ncNom"></div>
      <div class="field"><label class="field-label">Poste</label><input class="input" id="ncPoste" value="Cuisinier"></div>
      <div class="field"><label class="field-label">Contrat</label>
        <select class="input" id="ncContrat">
          ${['CDI','CDD','Extra','Apprenti','Stage'].map(c => `<option>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="field-label">Heures hebdo</label><input class="input mono" id="ncHeures" type="number" value="35"></div>
      <div class="field"><label class="field-label">Email</label><input class="input" id="ncEmail" type="email"></div>
    </div>
    <div class="text-mute" style="margin-top:12px;font-size:12px;">Les autres infos (état civil, adresse, etc.) se complètent depuis la fiche du salarié.</div>
  `;
  const footer = `
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="ncSave" style="width:auto;padding:10px 18px;">Créer</button>
  `;
  const { close } = openModal({ title: 'Nouveau salarié', body, footer });
  $('#ncSave').addEventListener('click', () => {
    const prenom = $('#ncPrenom').value.trim();
    const nom = $('#ncNom').value.trim();
    if (!prenom || !nom) { toast('Prénom et nom requis', 'error'); return; }
    const emp = normEmp({
      id: newId, prenom, nom,
      poste: $('#ncPoste').value.trim() || 'Cuisinier',
      contrat: $('#ncContrat').value,
      heures: parseInt($('#ncHeures').value) || 35,
      email: $('#ncEmail').value.trim(),
      taux: 12, statut: 'Actif',
      username: prenom.toLowerCase().replace(/[^a-z0-9]/g,''),
      code: '1234',
    });
    state.employees.push(emp);
    fbSave('employees', state.employees);
    toast('Salarié créé', 'good');
    close();
    state.empDetail = newId;
    state.empTab = 'info';
    render();
  });
}

// ─────────── EMPLOYEE DETAIL ───────────
function pageEmployeeDetail() {
  const e = state.employees.find(x => x.id === state.empDetail);
  if (!e) { state.empDetail = null; return pageEmployees(); }
  const n = normEmp(e);
  const tab = state.empTab || 'info';

  return `
    <div class="row" style="margin-bottom:14px;">
      <button class="btn-ghost" id="backToList">← Retour à la liste</button>
    </div>

    <div class="emp-header">
      <div class="emp-header-top">
        <div class="av-emp lg">${initials(e)}</div>
        <div style="flex:1;">
          <div class="emp-header-name">${esc(e.prenom)} ${esc(e.nom)}</div>
          <div class="emp-header-sub">${esc(e.poste||'—')} · ${esc(e.contrat||'—')} · ${e.heures||0}h</div>
        </div>
        <span class="status-dot ${e.statut==='Actif'?'on':'off'}" style="background:rgba(255,255,255,.15);color:#fff;">${esc(e.statut||'—')}</span>
      </div>
      <div class="emp-header-grid">
        <div><div class="ehg-label">Début contrat</div><div class="ehg-value">${n.contratDebut ? fmtDateShort(n.contratDebut) : '—'}</div></div>
        <div><div class="ehg-label">Fin contrat</div><div class="ehg-value">${n.contratFin ? fmtDateShort(n.contratFin) : '—'}</div></div>
        <div><div class="ehg-label">Type</div><div class="ehg-value">${esc(e.contrat||'—')}</div></div>
        <div><div class="ehg-label">Établissement</div><div class="ehg-value">Man'ouché</div></div>
        <div><div class="ehg-label">Solde CP</div><div class="ehg-value">${(n.cpAcquisN - n.cpPrisN + n.cpAcquisNm1 - n.cpPrisNm1).toFixed(1)} j</div></div>
      </div>
    </div>

    <div class="emp-tabs">
      <button class="emp-tab ${tab==='info'?'active':''}" data-emp-tab="info">Informations personnelles</button>
      <button class="emp-tab ${tab==='contrats'?'active':''}" data-emp-tab="contrats">Contrats</button>
      <button class="emp-tab ${tab==='temps'?'active':''}" data-emp-tab="temps">Temps et planification</button>
      <button class="emp-tab ${tab==='conges'?'active':''}" data-emp-tab="conges">Congés et Absences</button>
      <button class="emp-tab ${tab==='docs'?'active':''}" data-emp-tab="docs">Documents</button>
      <button class="emp-tab ${tab==='role'?'active':''}" data-emp-tab="role">Rôle et permissions</button>
    </div>

    <div class="emp-tabbody">
      ${tab==='info' ? empTabInfo(n) :
        tab==='contrats' ? empTabContrats(n) :
        tab==='temps' ? empTabTemps(n) :
        tab==='conges' ? empTabConges(n) :
        tab==='docs' ? empTabDocs(n) :
        tab==='role' ? empTabRole(n) : ''}
    </div>
  `;
}

function bindEmployeeDetail() {
  $('#backToList').addEventListener('click', () => {
    state.empDetail = null;
    render();
  });
  $$('[data-emp-tab]').forEach(b => b.addEventListener('click', ev => {
    state.empTab = ev.currentTarget.dataset.empTab;
    render();
  }));
  // Tab-specific bindings
  const tab = state.empTab || 'info';
  if (tab === 'info') bindEmpTabInfo();
  if (tab === 'contrats') bindEmpTabContrats();
  if (tab === 'temps') bindEmpTabTemps();
  if (tab === 'conges') bindEmpTabConges();
  if (tab === 'docs') bindEmpTabDocs();
  if (tab === 'role') bindEmpTabRole();
}

// ── INFOS PERSO TAB ──
function empTabInfo(n) {
  return `
    <div class="info-grid">
      <div class="panel">
        <div class="panel-head"><h3>État civil</h3></div>
        <div class="panel-body">
          ${kvRow('Genre', n.genre || 'Non renseigné')}
          ${kvRow('Prénom', n.prenom)}
          ${kvRow('Nom de naissance', n.nomNaissance || 'Non renseigné')}
          ${kvRow('Nom de famille', n.nom)}
          ${kvRow('Nationalité', n.nationalite || 'Non renseigné')}
          ${kvRow('Date de naissance', n.dateNaissance ? fmtDateShort(n.dateNaissance) : 'Non renseigné')}
          ${kvRow('Pays de naissance', n.paysNaissance || 'Non renseigné')}
          ${kvRow('Département de naissance', n.departementNaissance || 'Non renseigné')}
          ${kvRow('Commune de naissance', n.communeNaissance || 'Non renseigné')}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Coordonnées</h3></div>
        <div class="panel-body">
          ${kvRow('Email', n.email || 'Non renseigné')}
          ${kvRow('Tél. mobile', n.telMobile || 'Non renseigné')}
          ${kvRow('Notifications SMS', n.notifSMS ? 'Oui' : 'Non')}
          ${kvRow('Tél. fixe', n.telFixe || 'Non renseigné')}
          ${kvRow('Adresse', n.adresse || 'Non renseigné')}
          ${kvRow('Complément', n.complementAdresse || 'Non renseigné')}
          ${kvRow('Code postal', n.codePostal || 'Non renseigné')}
          ${kvRow('Ville', n.ville || 'Non renseigné')}
          ${kvRow('Pays', n.pays || 'France')}
        </div>
      </div>
    </div>
    <div class="row" style="justify-content:center;margin-top:18px;">
      <button class="btn-pri" id="editInfo" style="width:auto;padding:10px 18px;">✎ Modifier les informations personnelles</button>
    </div>
  `;
}

function bindEmpTabInfo() {
  $('#editInfo').addEventListener('click', () => openInfoEditor());
}

function openInfoEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="modal-section-title">État civil</div>
    <div class="form-grid">
      <div class="field"><label class="field-label">Genre</label>
        <select class="input" id="iGenre">
          <option value="" ${!n.genre?'selected':''}>Non renseigné</option>
          <option value="M" ${n.genre==='M'?'selected':''}>Masculin</option>
          <option value="F" ${n.genre==='F'?'selected':''}>Féminin</option>
        </select>
      </div>
      <div class="field"><label class="field-label">Prénom</label><input class="input" id="iPrenom" value="${esc(n.prenom)}"></div>
      <div class="field"><label class="field-label">Nom de naissance</label><input class="input" id="iNomNaiss" value="${esc(n.nomNaissance)}"></div>
      <div class="field"><label class="field-label">Nom de famille</label><input class="input" id="iNom" value="${esc(n.nom)}"></div>
      <div class="field"><label class="field-label">Nationalité</label><input class="input" id="iNat" value="${esc(n.nationalite)}" placeholder="ex: Française"></div>
      <div class="field"><label class="field-label">Date de naissance</label><input class="input" id="iDOB" type="date" value="${esc(n.dateNaissance)}"></div>
      <div class="field"><label class="field-label">Pays de naissance</label><input class="input" id="iPaysN" value="${esc(n.paysNaissance)}"></div>
      <div class="field"><label class="field-label">Département de naissance</label><input class="input" id="iDeptN" value="${esc(n.departementNaissance)}"></div>
      <div class="field full"><label class="field-label">Commune de naissance</label><input class="input" id="iComN" value="${esc(n.communeNaissance)}"></div>
    </div>

    <div class="modal-section-title">Coordonnées</div>
    <div class="form-grid">
      <div class="field"><label class="field-label">Email</label><input class="input" id="iEmail" type="email" value="${esc(n.email)}"></div>
      <div class="field"><label class="field-label">Tél. mobile</label><input class="input mono" id="iTelM" value="${esc(n.telMobile)}" placeholder="+33 6 ..."></div>
      <div class="field"><label class="field-label">Tél. fixe</label><input class="input mono" id="iTelF" value="${esc(n.telFixe)}"></div>
      <div class="field"><label class="field-label"><input type="checkbox" id="iNotif" ${n.notifSMS?'checked':''}> Notifications SMS</label></div>
      <div class="field full"><label class="field-label">Adresse</label><input class="input" id="iAdr" value="${esc(n.adresse)}"></div>
      <div class="field full"><label class="field-label">Complément d'adresse</label><input class="input" id="iAdr2" value="${esc(n.complementAdresse)}"></div>
      <div class="field"><label class="field-label">Code postal</label><input class="input mono" id="iCP" value="${esc(n.codePostal)}"></div>
      <div class="field"><label class="field-label">Ville</label><input class="input" id="iVille" value="${esc(n.ville)}"></div>
      <div class="field"><label class="field-label">Pays</label><input class="input" id="iPays" value="${esc(n.pays)}"></div>
    </div>
  `;
  const footer = `
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="iSave" style="width:auto;padding:10px 18px;">Enregistrer</button>
  `;
  const { close } = openModal({ title: 'Modifier les informations personnelles', body, footer });
  $('#iSave').addEventListener('click', () => {
    const updated = {
      ...e,
      genre: $('#iGenre').value,
      prenom: $('#iPrenom').value.trim(),
      nomNaissance: $('#iNomNaiss').value.trim(),
      nom: $('#iNom').value.trim(),
      nationalite: $('#iNat').value.trim(),
      dateNaissance: $('#iDOB').value,
      paysNaissance: $('#iPaysN').value.trim(),
      departementNaissance: $('#iDeptN').value.trim(),
      communeNaissance: $('#iComN').value.trim(),
      email: $('#iEmail').value.trim(),
      telMobile: $('#iTelM').value.trim(),
      telFixe: $('#iTelF').value.trim(),
      notifSMS: $('#iNotif').checked,
      adresse: $('#iAdr').value.trim(),
      complementAdresse: $('#iAdr2').value.trim(),
      codePostal: $('#iCP').value.trim(),
      ville: $('#iVille').value.trim(),
      pays: $('#iPays').value.trim() || 'France',
    };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Informations mises à jour', 'good');
    close();
    render();
  });
}

// ── CONTRATS TAB ──
function empTabContrats(n) {
  const avenants = n.avenants || [];
  return `
    <div class="panel">
      <div class="panel-head"><h3>Contrat en cours</h3></div>
      <div class="panel-body">
        ${kvRow('Type', n.contrat || 'Non renseigné')}
        ${kvRow('Début du contrat', n.contratDebut ? fmtDateShort(n.contratDebut) : 'Non renseigné')}
        ${kvRow('Fin du contrat', n.contratFin ? fmtDateShort(n.contratFin) : (n.contrat==='CDI'?'Indéterminée':'Non renseigné'))}
        ${kvRow('Période d\'essai', n.periodeEssaiJours ? `${n.periodeEssaiJours} jours` : 'Non renseigné')}
        ${kvRow('Poste', n.poste || 'Non renseigné')}
        ${kvRow('Rémunération mensuelle brute', n.remuneration ? `${n.remuneration} €` : 'Non renseigné')}
        ${kvRow('Taux horaire', n.taux ? `${n.taux} €/h` : 'Non renseigné')}
        ${kvRow('Durée de travail hebdomadaire', `${n.heures || 0}h`)}
        ${kvRow('Nb. de jours travaillés par semaine', `${n.joursTravailles || 5} jours`)}
        ${kvRow('Remboursement Navigo / mois', n.navigoMensuel ? `${n.navigoMensuel} €` : 'Non renseigné')}
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel-head">
        <h3>Tous les contrats et avenants</h3>
        <button class="btn-sec" id="addAvenant">+ Nouvel avenant</button>
      </div>
      <div class="panel-body ${avenants.length?'nopad':''}">
        ${avenants.length === 0 ? '<div class="text-mute" style="text-align:center;padding:18px 0;font-size:13px;">Aucun avenant enregistré</div>' : `
          <table class="tbl">
            <thead><tr><th>Date</th><th>Type</th><th>Modification</th><th>Détail</th><th></th></tr></thead>
            <tbody>
              ${avenants.map((a,i) => `
                <tr>
                  <td class="mono">${a.date ? fmtDateShort(a.date) : '—'}</td>
                  <td>${esc(a.type||'—')}</td>
                  <td>${esc(a.modif||'—')}</td>
                  <td class="text-mute">${esc(a.detail||'—')}</td>
                  <td><button class="btn-ghost" data-del-avenant="${i}">Supprimer</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>

    <div class="row" style="justify-content:center;margin-top:18px;">
      <button class="btn-pri" id="editContrat" style="width:auto;padding:10px 18px;">✎ Modifier le contrat en cours</button>
    </div>
  `;
}

function bindEmpTabContrats() {
  $('#editContrat').addEventListener('click', () => openContratEditor());
  const addBtn = $('#addAvenant');
  if (addBtn) addBtn.addEventListener('click', () => openAvenantEditor());
  $$('[data-del-avenant]').forEach(b => b.addEventListener('click', ev => {
    const i = parseInt(ev.currentTarget.dataset.delAvenant);
    if (!confirm('Supprimer cet avenant ?')) return;
    const e = state.employees.find(x => x.id === state.empDetail);
    const avenants = [...(e.avenants||[])];
    avenants.splice(i, 1);
    const updated = { ...e, avenants };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Avenant supprimé', '');
    render();
  }));
}

function openContratEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Type de contrat</label>
        <select class="input" id="cType">
          ${['CDI','CDD','Extra','Apprenti','Stage','Interim'].map(c => `<option ${c===n.contrat?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="field-label">Poste</label><input class="input" id="cPoste" value="${esc(n.poste)}"></div>
      <div class="field"><label class="field-label">Date de début</label><input class="input" id="cDebut" type="date" value="${esc(n.contratDebut)}"></div>
      <div class="field"><label class="field-label">Date de fin (laisser vide pour CDI)</label><input class="input" id="cFin" type="date" value="${esc(n.contratFin)}"></div>
      <div class="field"><label class="field-label">Période d'essai (jours)</label><input class="input mono" id="cEssai" type="number" value="${n.periodeEssaiJours||60}"></div>
      <div class="field"><label class="field-label">Heures hebdo</label><input class="input mono" id="cHeures" type="number" value="${n.heures||35}"></div>
      <div class="field"><label class="field-label">Jours travaillés / semaine</label><input class="input mono" id="cJours" type="number" min="1" max="7" value="${n.joursTravailles||5}"></div>
      <div class="field"><label class="field-label">Taux horaire (€)</label><input class="input mono" id="cTaux" type="number" step="0.01" value="${n.taux||12}"></div>
      <div class="field full"><label class="field-label">Rémunération mensuelle brute (€)</label><input class="input mono" id="cRem" type="number" step="0.01" value="${n.remuneration||0}"></div>
      <div class="field full"><label class="field-label">Remboursement Navigo / transport mensuel (€)</label><input class="input mono" id="cNavigo" type="number" step="0.01" value="${n.navigoMensuel||0}" placeholder="ex: 42,15"></div>
    </div>
  `;
  const footer = `
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="cSave" style="width:auto;padding:10px 18px;">Enregistrer</button>
  `;
  const { close } = openModal({ title: 'Modifier le contrat', body, footer });
  $('#cSave').addEventListener('click', () => {
    const updated = {
      ...e,
      contrat: $('#cType').value,
      poste: $('#cPoste').value.trim(),
      contratDebut: $('#cDebut').value,
      contratFin: $('#cFin').value,
      periodeEssaiJours: parseInt($('#cEssai').value) || 60,
      heures: parseInt($('#cHeures').value) || 35,
      joursTravailles: parseInt($('#cJours').value) || 5,
      taux: parseFloat($('#cTaux').value) || 12,
      remuneration: parseFloat($('#cRem').value) || 0,
      navigoMensuel: parseFloat($('#cNavigo').value) || 0,
    };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Contrat mis à jour', 'good');
    close();
    render();
  });
}

function openAvenantEditor() {
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Date</label><input class="input" id="aDate" type="date" value="${dateISO(new Date())}"></div>
      <div class="field"><label class="field-label">Type</label>
        <select class="input" id="aType">
          <option>Changement d'horaire</option>
          <option>Augmentation</option>
          <option>Changement de poste</option>
          <option>Renouvellement CDD</option>
          <option>Autre</option>
        </select>
      </div>
      <div class="field full"><label class="field-label">Modification (résumé court)</label><input class="input" id="aModif" placeholder="ex: passage 35h → 39h"></div>
      <div class="field full"><label class="field-label">Détail (optionnel)</label><textarea class="input" id="aDetail" rows="3"></textarea></div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="aSave" style="width:auto;padding:10px 18px;">Ajouter</button>`;
  const { close } = openModal({ title: 'Nouvel avenant', body, footer });
  $('#aSave').addEventListener('click', () => {
    const e = state.employees.find(x => x.id === state.empDetail);
    const newAv = {
      date: $('#aDate').value,
      type: $('#aType').value,
      modif: $('#aModif').value.trim(),
      detail: $('#aDetail').value.trim(),
    };
    if (!newAv.modif) { toast('Saisis au moins la modification', 'error'); return; }
    const avenants = [...(e.avenants||[]), newAv].sort((a,b) => (b.date||'').localeCompare(a.date||''));
    const updated = { ...e, avenants };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Avenant ajouté', 'good');
    close();
    render();
  });
}

// ── TEMPS & PLANIF TAB ──
function empTabTemps(n) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  let monthH = 0;
  for (let d = new Date(monthStart); d <= new Date(now.getFullYear(), now.getMonth()+1, 0); d = addDays(d, 1)) {
    const wk = weekKey(d);
    const dayIdx = (d.getDay() + 6) % 7;
    (state.shifts[`${n.id}_${dayIdx}_${wk}`] || []).forEach(s => monthH += shiftHours(s));
  }
  return `
    <div class="info-grid">
      <div class="panel">
        <div class="panel-head"><h3>Temps de travail</h3></div>
        <div class="panel-body">
          ${kvRow('Mois en cours', `${monthH.toFixed(1)} h`)}
          ${kvRow('Heures contractuelles hebdo', `${n.heures||0} h`)}
          ${kvRow('Estimation mensuelle contractuelle', `~${((n.heures||0) * 4.33).toFixed(0)} h`)}
        </div>
      </div>
      <div class="panel">
        <div class="panel-head"><h3>Disponibilités hebdomadaires</h3></div>
        <div class="panel-body" style="padding:0;">
          ${DAYS.map((d,i) => `
            <div class="row" style="padding:10px 16px;border-bottom:1px solid var(--c-line-2);">
              <span style="flex:1;font-weight:500;">${d}</span>
              <span class="chip ${n.dispos?.[i]!==false?'good':''}" style="font-size:11px;">${n.dispos?.[i]!==false?'✓ Disponible':'✗ Indisponible'}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="row" style="justify-content:center;margin-top:18px;">
      <button class="btn-pri" id="editDispos" style="width:auto;padding:10px 18px;">✎ Modifier les disponibilités</button>
    </div>
  `;
}

function bindEmpTabTemps() {
  $('#editDispos').addEventListener('click', () => openDisposEditor());
}

function openDisposEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="text-mute" style="margin-bottom:10px;font-size:12.5px;">Décoche les jours où le salarié n'est pas disponible</div>
    ${DAYS.map((d,i) => `
      <label class="row" style="padding:10px 0;border-bottom:1px solid var(--c-line-2);cursor:pointer;">
        <input type="checkbox" id="d${i}" ${n.dispos[i]!==false?'checked':''} style="margin-right:10px;">
        <span style="flex:1;font-weight:500;">${d}</span>
      </label>
    `).join('')}
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="dSave" style="width:auto;padding:10px 18px;">Enregistrer</button>`;
  const { close } = openModal({ title: 'Disponibilités', body, footer });
  $('#dSave').addEventListener('click', () => {
    const dispos = {};
    for (let i = 0; i < 7; i++) dispos[i] = $('#d'+i).checked;
    const updated = { ...e, dispos };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Disponibilités mises à jour', 'good');
    close();
    render();
  });
}

// ── CONGÉS TAB ──
function empTabConges(n) {
  const cpPrisAuto = computeCpPris(n.id);
  const soldeN = (n.cpAcquisN||0) - (n.cpPrisN||0);
  const soldeNm1 = (n.cpAcquisNm1||0) - (n.cpPrisNm1||0);
  const total = soldeN + soldeNm1;
  const reqs = Object.values(state.absenceRequests||{}).filter(r => r && r.empId === n.id);
  return `
    <div class="cp-grid">
      <div class="cp-card">
        <div class="cp-card-label">Solde CP total</div>
        <div class="cp-card-value">${total.toFixed(1)} j</div>
        <div class="cp-card-sub">N: ${soldeN.toFixed(1)} · N-1: ${soldeNm1.toFixed(1)}</div>
      </div>
      <div class="cp-card">
        <div class="cp-card-label">Repos compensateur</div>
        <div class="cp-card-value">${(n.reposCompensateur||0)} h</div>
      </div>
      <div class="cp-card">
        <div class="cp-card-label">Récupération jours fériés</div>
        <div class="cp-card-value">${(n.recupJoursFeries||0)} h</div>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel-head"><h3>Compteurs CP — Détail</h3></div>
      <div class="panel-body nopad">
        <table class="tbl">
          <thead><tr><th>Période</th><th>Acquis</th><th>Pris</th><th>Solde</th></tr></thead>
          <tbody>
            <tr><td>N-1 (année précédente)</td><td class="mono tabular">${(n.cpAcquisNm1||0).toFixed(1)}</td><td class="mono tabular">${(n.cpPrisNm1||0).toFixed(1)}</td><td class="mono tabular"><strong>${soldeNm1.toFixed(1)}</strong></td></tr>
            <tr><td>N (année en cours)</td><td class="mono tabular">${(n.cpAcquisN||0).toFixed(1)}</td><td class="mono tabular">${(n.cpPrisN||0).toFixed(1)} <span class="text-mute" style="font-size:10.5px;">(${cpPrisAuto} auto-détectés)</span></td><td class="mono tabular"><strong>${soldeN.toFixed(1)}</strong></td></tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel-head"><h3>Demandes d'absence</h3></div>
      <div class="panel-body ${reqs.length?'nopad':''}">
        ${reqs.length === 0 ? '<div class="text-mute" style="text-align:center;padding:18px 0;font-size:13px;">Aucune demande</div>' : `
          <table class="tbl">
            <thead><tr><th>Date(s)</th><th>Jours</th><th>Type</th><th>Statut</th></tr></thead>
            <tbody>
              ${reqs.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||'')).map(r => `
                <tr>
                  <td>${fmtDateShort(r.dateStart)} → ${fmtDateShort(r.dateEnd)}</td>
                  <td class="mono">${r.nbJours || '?'}</td>
                  <td>${esc(LEAVE_TYPES[r.type]?.label || r.type)}</td>
                  <td>${reqStatusChip(r.status)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>

    <div class="row" style="justify-content:center;margin-top:18px;gap:10px;">
      <button class="btn-sec" id="editCp">✎ Modifier les compteurs CP</button>
      <button class="btn-pri" id="addAbsence" style="width:auto;padding:10px 18px;">+ Ajouter une absence</button>
    </div>
  `;
}

function bindEmpTabConges() {
  $('#editCp').addEventListener('click', () => openCpEditor());
  $('#addAbsence').addEventListener('click', () => openAbsenceCreator(state.empDetail));
}

function openCpEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="modal-section-title">N-1 (année précédente)</div>
    <div class="form-grid">
      <div class="field"><label class="field-label">CP acquis N-1</label><input class="input mono" id="cAcq1" type="number" step="0.5" value="${n.cpAcquisNm1||0}"></div>
      <div class="field"><label class="field-label">CP pris N-1</label><input class="input mono" id="cPri1" type="number" step="0.5" value="${n.cpPrisNm1||0}"></div>
    </div>
    <div class="modal-section-title">N (année en cours)</div>
    <div class="form-grid">
      <div class="field"><label class="field-label">CP acquis N</label><input class="input mono" id="cAcq" type="number" step="0.5" value="${n.cpAcquisN||0}"></div>
      <div class="field"><label class="field-label">CP pris N (manuel)</label><input class="input mono" id="cPri" type="number" step="0.5" value="${n.cpPrisN||0}"></div>
    </div>
    <div class="modal-section-title">Autres compteurs</div>
    <div class="form-grid">
      <div class="field"><label class="field-label">Repos compensateur (heures)</label><input class="input mono" id="cRC" type="number" step="0.5" value="${n.reposCompensateur||0}"></div>
      <div class="field"><label class="field-label">Récup jours fériés (heures)</label><input class="input mono" id="cRJF" type="number" step="0.5" value="${n.recupJoursFeries||0}"></div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="cpSave" style="width:auto;padding:10px 18px;">Enregistrer</button>`;
  const { close } = openModal({ title: 'Compteurs CP', body, footer });
  $('#cpSave').addEventListener('click', () => {
    const updated = {
      ...e,
      cpAcquisNm1: parseFloat($('#cAcq1').value) || 0,
      cpPrisNm1: parseFloat($('#cPri1').value) || 0,
      cpAcquisN: parseFloat($('#cAcq').value) || 0,
      cpPrisN: parseFloat($('#cPri').value) || 0,
      reposCompensateur: parseFloat($('#cRC').value) || 0,
      recupJoursFeries: parseFloat($('#cRJF').value) || 0,
    };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Compteurs mis à jour', 'good');
    close();
    render();
  });
}

// ── DOCS TAB ──
function empTabDocs(n) {
  const docs = n.documents || [];
  // Group by category
  const byCat = {};
  docs.forEach(d => {
    const c = d.category || 'autre';
    if (!byCat[c]) byCat[c] = [];
    byCat[c].push(d);
  });

  const totalSize = docs.reduce((s,d) => s + (d.size||0), 0);

  return `
    <div class="row" style="gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
      <div class="row" style="gap:8px;flex:1;">
        <span class="chip">${docs.length} document${docs.length>1?'s':''}</span>
        <span class="chip">${formatBytes(totalSize)}</span>
      </div>
      ${docs.length > 0 ? `<button class="btn-sec" id="downloadAllDocs">↓ Tout télécharger</button>` : ''}
      <button class="btn-pri" id="uploadDoc" style="width:auto;padding:9px 16px;">+ Ajouter un document</button>
    </div>

    ${docs.length === 0 ? `
      <div class="panel" style="background:#fafafa;border-style:dashed;">
        <div class="panel-body" style="text-align:center;padding:32px 18px;">
          <div style="font-size:36px;margin-bottom:8px;">📁</div>
          <div style="font-weight:500;margin-bottom:4px;">Aucun document pour le moment</div>
          <div class="text-mute" style="font-size:13px;max-width:420px;margin:6px auto 0;">
            Téléverse contrat, avenants, navigo, arrêts maladie, fiches de paie, titre de séjour, RIB...
          </div>
        </div>
      </div>
    ` : `
      <div class="docs-grid">
        ${Object.entries(byCat).sort(([a],[b]) => a.localeCompare(b)).map(([cat, items]) => {
          const c = DOC_CATEGORIES[cat] || DOC_CATEGORIES.autre;
          return `
            <div class="panel doc-cat-panel">
              <div class="panel-head">
                <h3>${c.icon} ${esc(c.label)} <span class="text-mute" style="font-size:12px;font-weight:400;">(${items.length})</span></h3>
              </div>
              <div class="panel-body" style="padding:0;">
                ${items.sort((a,b) => (b.uploadedAt||'').localeCompare(a.uploadedAt||'')).map(d => `
                  <div class="doc-item">
                    <div class="doc-icon">${docFileIcon(d.type, d.name)}</div>
                    <div class="doc-info">
                      <div class="doc-name">${esc(d.name)}</div>
                      <div class="doc-meta">${formatBytes(d.size||0)} · ${new Date(d.uploadedAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                    <div class="doc-actions">
                      <button class="btn-ghost" data-open-doc="${esc(d.id)}" data-fname="${esc(d.name)}" title="Ouvrir">↗</button>
                      <button class="btn-ghost" data-dl-doc="${esc(d.id)}" data-fname="${esc(d.name)}" title="Télécharger">↓</button>
                      <button class="btn-ghost" data-del-doc="${esc(d.id)}" title="Supprimer">✕</button>
                    </div>
                  </div>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `}

    ${n.travailleurEtranger ? `
      <div class="panel" style="margin-top:14px;">
        <div class="panel-head"><h3>🛂 Titre de séjour — détails</h3></div>
        <div class="panel-body">
          ${kvRow('Type', n.titreSejourType || 'Non renseigné')}
          ${kvRow('Numéro', n.titreSejourNumero || 'Non renseigné')}
          ${kvRow('Début validité', n.titreSejourDebut ? fmtDateShort(n.titreSejourDebut) : 'Non renseigné')}
          ${kvRow('Fin validité', n.titreSejourFin ? fmtDateShort(n.titreSejourFin) : 'Non renseigné')}
        </div>
      </div>
    ` : ''}
  `;
}

function docFileIcon(type, name) {
  const ext = (name||'').split('.').pop().toLowerCase();
  if (type && type.startsWith('image/')) return '🖼️';
  if (ext === 'pdf' || (type && type.includes('pdf'))) return '📕';
  if (['doc','docx'].includes(ext)) return '📘';
  if (['xls','xlsx','csv'].includes(ext)) return '📗';
  return '📄';
}

function bindEmpTabDocs() {
  $('#uploadDoc').addEventListener('click', () => openDocUploader());
  const dlAll = $('#downloadAllDocs');
  if (dlAll) dlAll.addEventListener('click', () => downloadAllEmpDocs());
  $$('[data-open-doc]').forEach(b => b.addEventListener('click', ev => {
    openDocInNewTab(ev.currentTarget.dataset.openDoc, ev.currentTarget.dataset.fname);
  }));
  $$('[data-dl-doc]').forEach(b => b.addEventListener('click', ev => {
    downloadDocFile(ev.currentTarget.dataset.dlDoc, ev.currentTarget.dataset.fname);
  }));
  $$('[data-del-doc]').forEach(b => b.addEventListener('click', ev => {
    const docId = ev.currentTarget.dataset.delDoc;
    deleteEmpDoc(docId);
  }));
}

async function deleteEmpDoc(docId) {
  const e = state.employees.find(x => x.id === state.empDetail);
  const doc = (e.documents||[]).find(d => d.id === docId);
  if (!doc) return;
  if (!confirm(`Supprimer "${doc.name}" ? Cette action est irréversible.`)) return;
  await deleteDocBlob(docId);
  const updated = { ...e, documents: (e.documents||[]).filter(d => d.id !== docId) };
  state.employees = state.employees.map(x => x.id === e.id ? updated : x);
  fbSave('employees', state.employees);
  toast('Document supprimé', '');
  render();
}

async function downloadAllEmpDocs() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const docs = e.documents || [];
  if (!docs.length) return;
  toast(`Téléchargement de ${docs.length} document${docs.length>1?'s':''}...`, '');
  for (const d of docs) {
    try {
      await downloadDocFile(d.id, d.name);
      await new Promise(r => setTimeout(r, 350));
    } catch (err) { console.warn(err); }
  }
  toast('Téléchargements terminés', 'good');
}

function openDocUploader() {
  const empId = state.empDetail;
  const e = state.employees.find(x => x.id === empId);
  const body = `
    <div class="form-grid">
      <div class="field full"><label class="field-label">Catégorie</label>
        <select class="input" id="dCat">
          ${Object.entries(DOC_CATEGORIES).map(([k,v]) => `<option value="${k}">${v.icon} ${esc(v.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field full">
        <label class="field-label">Fichier(s)</label>
        <label class="file-drop" id="fileDrop">
          <input type="file" id="dFile" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx" style="display:none;">
          <div class="file-drop-content">
            <div style="font-size:32px;">📤</div>
            <div style="font-weight:500;margin-top:8px;">Cliquer pour choisir ou déposer</div>
            <div class="text-mute" style="font-size:12px;margin-top:4px;">PDF, images, Word, Excel — <strong>max 2 Mo par fichier</strong></div>
            <div class="text-mute" style="font-size:11px;margin-top:2px;">Les images sont automatiquement compressées</div>
          </div>
        </label>
        <div id="fileList" style="margin-top:10px;"></div>
      </div>
    </div>
    <div id="uploadProgress" style="display:none;margin-top:12px;">
      <div class="progress-bar"><div class="progress-fill" id="progFill"></div></div>
      <div class="text-mute" style="font-size:11.5px;margin-top:6px;" id="progLabel">Upload en cours...</div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="dUpload" style="width:auto;padding:10px 18px;" disabled>Téléverser</button>`;
  const { close } = openModal({ title: `Ajouter un document — ${e.prenom} ${e.nom}`, body, footer });

  let selectedFiles = [];

  const renderFileList = () => {
    const fl = $('#fileList');
    if (!selectedFiles.length) { fl.innerHTML = ''; return; }
    fl.innerHTML = selectedFiles.map((f,i) => `
      <div class="row" style="gap:8px;padding:6px 10px;background:#fafafa;border-radius:6px;margin-bottom:4px;font-size:12.5px;">
        <span style="flex:1;">${esc(f.name)}</span>
        <span class="text-mute mono">${formatBytes(f.size)}</span>
        <button class="btn-ghost" data-rm="${i}" style="padding:0 6px;">✕</button>
      </div>
    `).join('');
    $$('[data-rm]', fl).forEach(b => b.addEventListener('click', ev => {
      selectedFiles.splice(parseInt(ev.target.dataset.rm), 1);
      renderFileList();
      $('#dUpload').disabled = !selectedFiles.length;
    }));
  };

  $('#dFile').addEventListener('change', ev => {
    selectedFiles = [...ev.target.files];
    renderFileList();
    $('#dUpload').disabled = !selectedFiles.length;
  });

  // Drag & drop
  const drop = $('#fileDrop');
  ['dragover','dragenter'].forEach(evt => drop.addEventListener(evt, ev => { ev.preventDefault(); drop.classList.add('drag'); }));
  ['dragleave','dragend','drop'].forEach(evt => drop.addEventListener(evt, ev => { ev.preventDefault(); drop.classList.remove('drag'); }));
  drop.addEventListener('drop', ev => {
    selectedFiles = [...ev.dataTransfer.files];
    renderFileList();
    $('#dUpload').disabled = !selectedFiles.length;
  });

  $('#dUpload').addEventListener('click', async () => {
    if (!selectedFiles.length) return;
    const cat = $('#dCat').value;
    $('#dUpload').disabled = true;
    $('#uploadProgress').style.display = '';
    const e2 = state.employees.find(x => x.id === empId);
    const newDocs = [...(e2.documents || [])];
    let done = 0;
    for (const file of selectedFiles) {
      $('#progLabel').textContent = `Upload ${done+1}/${selectedFiles.length} : ${file.name}`;
      $('#progFill').style.width = `${(done/selectedFiles.length)*100}%`;
      const meta = await uploadEmployeeDoc(empId, file, cat);
      if (meta) newDocs.push(meta);
      done++;
    }
    $('#progFill').style.width = '100%';
    $('#progLabel').textContent = 'Terminé !';
    const updated = { ...e2, documents: newDocs };
    state.employees = state.employees.map(x => x.id === empId ? updated : x);
    fbSave('employees', state.employees);
    toast(`${done} document${done>1?'s':''} ajouté${done>1?'s':''}`, 'good');
    setTimeout(close, 600);
    render();
  });
}

// ── ROLE TAB ──
function empTabRole(n) {
  return `
    <div class="panel">
      <div class="panel-head"><h3>Compte</h3></div>
      <div class="panel-body">
        ${kvRow('Username', n.username || 'Non renseigné')}
        ${kvRow('Code PIN', n.code || '—')}
        ${kvRow('Accès au compte', n.peutSeConnecter !== false ? 'Activé' : 'Désactivé')}
      </div>
    </div>

    <div class="panel" style="margin-top:14px;">
      <div class="panel-head"><h3>Statut</h3></div>
      <div class="panel-body">
        ${kvRow('Statut', n.statut || 'Actif')}
        ${kvRow('Date de sortie', n.dateSortie ? fmtDateShort(n.dateSortie) : '—')}
        ${kvRow('Motif de sortie', n.motifSortie || '—')}
        ${kvRow('Travailleur étranger', n.travailleurEtranger ? 'Oui' : 'Non')}
      </div>
    </div>

    <div class="row" style="justify-content:center;margin-top:18px;gap:10px;">
      <button class="btn-sec" id="editRole">✎ Modifier le compte</button>
      <button class="btn-sec" id="markExit">Enregistrer une sortie</button>
      <button class="btn-danger" id="delEmp">Supprimer le salarié</button>
    </div>
  `;
}

function bindEmpTabRole() {
  $('#editRole').addEventListener('click', () => openRoleEditor());
  $('#markExit').addEventListener('click', () => openExitEditor());
  $('#delEmp').addEventListener('click', () => {
    const e = state.employees.find(x => x.id === state.empDetail);
    if (!confirm(`Supprimer ${e.prenom} ${e.nom} ? Cette action est irréversible.`)) return;
    state.employees = state.employees.filter(x => x.id !== state.empDetail);
    fbSave('employees', state.employees);
    state.empDetail = null;
    toast('Salarié supprimé', '');
    render();
  });
}

function openRoleEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Username</label><input class="input mono" id="rUser" value="${esc(n.username)}"></div>
      <div class="field"><label class="field-label">Code PIN</label><input class="input mono" id="rCode" value="${esc(String(n.code))}"></div>
      <div class="field full"><label class="field-label"><input type="checkbox" id="rConnect" ${n.peutSeConnecter!==false?'checked':''}> Le salarié peut accéder à son compte</label></div>
      <div class="field full"><label class="field-label"><input type="checkbox" id="rForeign" ${n.travailleurEtranger?'checked':''}> Travailleur étranger</label></div>
    </div>
    <div id="foreignWrap" style="${n.travailleurEtranger?'':'display:none;'}">
      <div class="modal-section-title">Titre de séjour</div>
      <div class="form-grid">
        <div class="field"><label class="field-label">Type</label><input class="input" id="rTSType" value="${esc(n.titreSejourType)}" placeholder="ex: Carte de séjour"></div>
        <div class="field"><label class="field-label">Numéro</label><input class="input mono" id="rTSNum" value="${esc(n.titreSejourNumero)}"></div>
        <div class="field"><label class="field-label">Début validité</label><input class="input" id="rTSDeb" type="date" value="${esc(n.titreSejourDebut)}"></div>
        <div class="field"><label class="field-label">Fin validité</label><input class="input" id="rTSFin" type="date" value="${esc(n.titreSejourFin)}"></div>
      </div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="rSave" style="width:auto;padding:10px 18px;">Enregistrer</button>`;
  const { close } = openModal({ title: 'Compte & permissions', body, footer });
  $('#rForeign').addEventListener('change', ev => {
    $('#foreignWrap').style.display = ev.target.checked ? '' : 'none';
  });
  $('#rSave').addEventListener('click', () => {
    const updated = {
      ...e,
      username: $('#rUser').value.trim().toLowerCase(),
      code: $('#rCode').value.trim(),
      peutSeConnecter: $('#rConnect').checked,
      travailleurEtranger: $('#rForeign').checked,
      titreSejourType: $('#rTSType').value.trim(),
      titreSejourNumero: $('#rTSNum').value.trim(),
      titreSejourDebut: $('#rTSDeb').value,
      titreSejourFin: $('#rTSFin').value,
    };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Compte mis à jour', 'good');
    close();
    render();
  });
}

function openExitEditor() {
  const e = state.employees.find(x => x.id === state.empDetail);
  const n = normEmp(e);
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Date de sortie</label><input class="input" id="eDate" type="date" value="${esc(n.dateSortie)||dateISO(new Date())}"></div>
      <div class="field"><label class="field-label">Motif</label>
        <select class="input" id="eMotif">
          <option value="">—</option>
          <option ${n.motifSortie==='Démission'?'selected':''}>Démission</option>
          <option ${n.motifSortie==='Fin de CDD'?'selected':''}>Fin de CDD</option>
          <option ${n.motifSortie==='Licenciement'?'selected':''}>Licenciement</option>
          <option ${n.motifSortie==='Rupture conventionnelle'?'selected':''}>Rupture conventionnelle</option>
          <option ${n.motifSortie==="Fin de période d'essai"?'selected':''}>Fin de période d'essai</option>
          <option ${n.motifSortie==='Autre'?'selected':''}>Autre</option>
        </select>
      </div>
      <div class="field full" style="margin-top:8px;">
        <label class="field-label"><input type="checkbox" id="eInactif" checked> Marquer le salarié comme inactif</label>
      </div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="eSave" style="width:auto;padding:10px 18px;">Enregistrer la sortie</button>`;
  const { close } = openModal({ title: 'Enregistrer une sortie', body, footer });
  $('#eSave').addEventListener('click', () => {
    const updated = {
      ...e,
      dateSortie: $('#eDate').value,
      motifSortie: $('#eMotif').value,
      statut: $('#eInactif').checked ? 'Inactif' : e.statut,
    };
    state.employees = state.employees.map(x => x.id === e.id ? updated : x);
    fbSave('employees', state.employees);
    toast('Sortie enregistrée', 'good');
    close();
    render();
  });
}

// ─────────── ABSENCE REQUESTS ───────────
function reqStatusChip(s) {
  if (s === 'approved') return '<span class="chip good">✓ Validée</span>';
  if (s === 'rejected') return '<span class="chip alert">✗ Refusée</span>';
  return '<span class="chip warn">⏳ En attente</span>';
}

function pageAbsenceRequests() {
  const all = Object.entries(state.absenceRequests || {}).map(([id,r]) => ({...r, id}));
  const tab = state.reqTab || 'pending';
  const filtered = all.filter(r => r.status === tab);
  filtered.sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Suivi RH</div>
        <h1 class="h-1">Demandes d'absence</h1>
      </div>
    </div>

    <div class="emp-tabs" style="margin-bottom:14px;">
      <button class="emp-tab ${tab==='pending'?'active':''}" data-req-tab="pending">En attente (${all.filter(r=>r.status==='pending').length})</button>
      <button class="emp-tab ${tab==='approved'?'active':''}" data-req-tab="approved">Validées (${all.filter(r=>r.status==='approved').length})</button>
      <button class="emp-tab ${tab==='rejected'?'active':''}" data-req-tab="rejected">Refusées (${all.filter(r=>r.status==='rejected').length})</button>
    </div>

    <div class="panel">
      <div class="panel-body ${filtered.length?'nopad':''}">
        ${filtered.length === 0 ? `<div class="text-mute" style="text-align:center;padding:32px 0;font-size:13px;">Aucune demande ${tab==='pending'?'en attente':tab==='approved'?'validée':'refusée'}</div>` : `
          <table class="tbl">
            <thead>
              <tr>
                <th>Salarié</th>
                <th>Type</th>
                <th>Dates</th>
                <th>Jours</th>
                <th>Demandée le</th>
                <th>Motif</th>
                ${tab==='pending'?'<th>Actions</th>':'<th>Décision</th>'}
              </tr>
            </thead>
            <tbody>
              ${filtered.map(r => {
                const emp = state.employees.find(e => e.id === r.empId);
                const lt = LEAVE_TYPES[r.type];
                return `
                  <tr>
                    <td><div class="emp-cell"><div class="av-emp sm">${emp?initials(emp):'?'}</div><div class="emp-cell-name">${emp?esc(emp.prenom+' '+emp.nom):'(inconnu)'}</div></div></td>
                    <td>${esc(lt?.label||r.type)}</td>
                    <td>${fmtDateShort(r.dateStart)} → ${fmtDateShort(r.dateEnd)}</td>
                    <td class="mono">${r.nbJours||'?'}</td>
                    <td class="mono" style="font-size:11.5px;">${r.createdAt?new Date(r.createdAt).toLocaleDateString('fr-FR'):'—'}</td>
                    <td class="text-mute" style="font-size:12px;">${esc(r.motif||'—')}</td>
                    ${tab==='pending' ? `
                      <td>
                        <button class="btn-sec" data-approve="${r.id}" style="padding:5px 10px;font-size:11.5px;">✓ Valider</button>
                        <button class="btn-sec" data-reject="${r.id}" style="padding:5px 10px;font-size:11.5px;">✗ Refuser</button>
                      </td>
                    ` : `
                      <td class="text-mute" style="font-size:11.5px;">${r.decidedAt?new Date(r.decidedAt).toLocaleDateString('fr-FR'):'—'}${r.commentAdmin?'<br><em>'+esc(r.commentAdmin)+'</em>':''}</td>
                    `}
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;
}

function bindAbsenceRequests() {
  $$('[data-req-tab]').forEach(b => b.addEventListener('click', ev => {
    state.reqTab = ev.currentTarget.dataset.reqTab;
    render();
  }));
  $$('[data-approve]').forEach(b => b.addEventListener('click', ev => {
    const id = ev.currentTarget.dataset.approve;
    approveAbsenceRequest(id);
  }));
  $$('[data-reject]').forEach(b => b.addEventListener('click', ev => {
    const id = ev.currentTarget.dataset.reject;
    rejectAbsenceRequest(id);
  }));
}

function approveAbsenceRequest(id) {
  const r = state.absenceRequests[id];
  if (!r) return;
  if (!confirm(`Valider cette demande ?\n\nLes jours seront automatiquement marqués comme "${LEAVE_TYPES[r.type]?.label||r.type}" sur le planning.`)) return;

  // Inject shifts as leave on each day between dateStart and dateEnd
  const start = new Date(r.dateStart);
  const end = new Date(r.dateEnd);
  const updates = {};
  for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
    const wk = weekKey(d);
    const dayIdx = (d.getDay() + 6) % 7;
    const key = `${r.empId}_${dayIdx}_${wk}`;
    const newSh = [{ leaveType: r.type, label: LEAVE_TYPES[r.type]?.label || r.type }];
    state.shifts[key] = newSh;
    updates[`shifts/${key}`] = newSh;
  }
  // Update request status
  const updatedReq = { ...r, status: 'approved', decidedAt: new Date().toISOString(), decidedBy: 'admin' };
  state.absenceRequests[id] = updatedReq;
  updates[`absenceRequests/${id}`] = updatedReq;
  if (db) db.ref().update(updates).catch(e => console.warn(e));
  toast('Demande validée et planning mis à jour', 'good');
  render();
}

function rejectAbsenceRequest(id) {
  const r = state.absenceRequests[id];
  if (!r) return;
  const reason = prompt('Motif du refus (optionnel) :');
  if (reason === null) return;
  const updated = { ...r, status: 'rejected', decidedAt: new Date().toISOString(), decidedBy: 'admin', commentAdmin: reason };
  state.absenceRequests[id] = updated;
  fbSave(`absenceRequests/${id}`, updated);
  toast('Demande refusée', '');
  render();
}

function openAbsenceCreator(empId) {
  const e = state.employees.find(x => x.id === empId);
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Type</label>
        <select class="input" id="abType">
          ${Object.entries(LEAVE_TYPES).map(([k,v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="field-label">Date de début</label><input class="input" id="abStart" type="date" value="${dateISO(new Date())}"></div>
      <div class="field"><label class="field-label">Date de fin</label><input class="input" id="abEnd" type="date" value="${dateISO(new Date())}"></div>
      <div class="field full"><label class="field-label">Motif (optionnel)</label><textarea class="input" id="abMotif" rows="2"></textarea></div>
      <div class="field full text-mute" style="font-size:12px;">Cette absence sera automatiquement validée et injectée dans le planning.</div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="abSave" style="width:auto;padding:10px 18px;">Ajouter</button>`;
  const { close } = openModal({ title: `Absence pour ${e.prenom} ${e.nom}`, body, footer });
  $('#abSave').addEventListener('click', () => {
    const start = $('#abStart').value;
    const endVal = $('#abEnd').value;
    if (!start || !endVal) { toast('Renseigne les dates', 'error'); return; }
    if (endVal < start) { toast('Date de fin avant date de début', 'error'); return; }
    const sD = new Date(start), eD = new Date(endVal);
    const nbJours = Math.round((eD - sD)/86400000) + 1;
    const id = 'r' + Date.now();
    const r = {
      empId, type: $('#abType').value,
      dateStart: start, dateEnd: endVal,
      motif: $('#abMotif').value.trim(),
      nbJours,
      status: 'pending', createdAt: new Date().toISOString(),
    };
    state.absenceRequests[id] = r;
    fbSave(`absenceRequests/${id}`, r);
    close();
    approveAbsenceRequest(id);
  });
}

// ─────────── COMPTEURS CP ───────────
function pageCpCompteurs() {
  const actives = state.employees.filter(e => e.statut === 'Actif');
  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Suivi RH</div>
        <h1 class="h-1">Compteurs de congés payés</h1>
      </div>
      <div class="page-actions">
        <button class="btn-sec" id="exportCp">↓ Exporter CSV</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad" style="overflow-x:auto;">
        <table class="tbl">
          <thead>
            <tr>
              <th>Salarié</th>
              <th class="mono">Acquis N-1</th>
              <th class="mono">Pris N-1</th>
              <th class="mono">Solde N-1</th>
              <th class="mono">Acquis N</th>
              <th class="mono">Pris N</th>
              <th class="mono">Solde N</th>
              <th class="mono">Solde total</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${actives.map(e => {
              const n = normEmp(e);
              const sNm1 = (n.cpAcquisNm1||0) - (n.cpPrisNm1||0);
              const sN = (n.cpAcquisN||0) - (n.cpPrisN||0);
              const total = sNm1 + sN;
              return `
                <tr>
                  <td><div class="emp-cell"><div class="av-emp sm">${initials(e)}</div><span class="emp-cell-name">${esc(e.prenom)} ${esc(e.nom)}</span></div></td>
                  <td class="mono tabular">${(n.cpAcquisNm1||0).toFixed(1)}</td>
                  <td class="mono tabular">${(n.cpPrisNm1||0).toFixed(1)}</td>
                  <td class="mono tabular"><strong>${sNm1.toFixed(1)}</strong></td>
                  <td class="mono tabular">${(n.cpAcquisN||0).toFixed(1)}</td>
                  <td class="mono tabular">${(n.cpPrisN||0).toFixed(1)}</td>
                  <td class="mono tabular"><strong>${sN.toFixed(1)}</strong></td>
                  <td class="mono tabular"><strong>${total.toFixed(1)}</strong></td>
                  <td><button class="btn-ghost" data-view-emp-cp="${e.id}">Modifier</button></td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function bindCpCompteurs() {
  $('#exportCp').addEventListener('click', () => exportCpCSV());
  $$('[data-view-emp-cp]').forEach(b => b.addEventListener('click', ev => {
    state.empDetail = parseInt(ev.currentTarget.dataset.viewEmpCp);
    state.empTab = 'conges';
    state.page = 'employees';
    render();
  }));
}

function exportCpCSV() {
  const lines = ['Salarié;Acquis N-1;Pris N-1;Solde N-1;Acquis N;Pris N;Solde N;Solde total'];
  state.employees.filter(e => e.statut === 'Actif').forEach(e => {
    const n = normEmp(e);
    const sNm1 = (n.cpAcquisNm1||0) - (n.cpPrisNm1||0);
    const sN = (n.cpAcquisN||0) - (n.cpPrisN||0);
    lines.push([
      csvEsc(`${e.prenom} ${e.nom}`),
      (n.cpAcquisNm1||0).toFixed(1).replace('.', ','),
      (n.cpPrisNm1||0).toFixed(1).replace('.', ','),
      sNm1.toFixed(1).replace('.', ','),
      (n.cpAcquisN||0).toFixed(1).replace('.', ','),
      (n.cpPrisN||0).toFixed(1).replace('.', ','),
      sN.toFixed(1).replace('.', ','),
      (sNm1+sN).toFixed(1).replace('.', ','),
    ].join(';'));
  });
  const blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `compteurs_cp_${dateISO(new Date())}.csv`;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast('CSV téléchargé', 'good');
}

// ─────────── SUIVI RH (Entrées, Sorties, Fins essai, Profils incomplets) ───────────
function pageRH() {
  const tab = state.rhTab || 'entries';
  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Suivi RH</div>
        <h1 class="h-1">${tab==='entries'?'Entrées':tab==='exits'?'Sorties':tab==='essai'?'Fins de période d\'essai':'Profils incomplets'}</h1>
      </div>
    </div>

    <div class="emp-tabs" style="margin-bottom:14px;">
      <button class="emp-tab ${tab==='entries'?'active':''}" data-rh-tab="entries">Entrées</button>
      <button class="emp-tab ${tab==='exits'?'active':''}" data-rh-tab="exits">Sorties</button>
      <button class="emp-tab ${tab==='essai'?'active':''}" data-rh-tab="essai">Fins période essai</button>
      <button class="emp-tab ${tab==='incomplete'?'active':''}" data-rh-tab="incomplete">Profils incomplets</button>
    </div>

    ${tab === 'entries' ? rhEntries() :
      tab === 'exits' ? rhExits() :
      tab === 'essai' ? rhEssai() :
      rhIncomplete()}
  `;
}

function bindRH() {
  $$('[data-rh-tab]').forEach(b => b.addEventListener('click', ev => {
    state.rhTab = ev.currentTarget.dataset.rhTab;
    render();
  }));
  $$('[data-rh-view]').forEach(b => b.addEventListener('click', ev => {
    state.empDetail = parseInt(ev.currentTarget.dataset.rhView);
    state.empTab = 'info';
    state.page = 'employees';
    render();
  }));
}

function rhEntries() {
  // Entrées : salariés avec contratDebut dans les 90 derniers jours
  const now = new Date();
  const cutoff = addDays(now, -90);
  const list = state.employees.map(normEmp).filter(n => {
    if (!n.contratDebut) return false;
    const d = new Date(n.contratDebut);
    return d >= cutoff && d <= addDays(now, 30);
  }).sort((a,b) => (b.contratDebut||'').localeCompare(a.contratDebut||''));
  return rhTable(list, [
    { label: 'Date d\'entrée', val: e => fmtDateShort(e.contratDebut) },
    { label: 'Salarié', val: e => `${e.prenom} ${e.nom}` },
    { label: 'Contrat', val: e => e.contrat||'—' },
    { label: 'Poste', val: e => e.poste||'—' },
    { label: 'Email', val: e => e.email||'—' },
    { label: 'Tél.', val: e => e.telMobile||'—' },
  ], 'Aucune entrée dans les 90 derniers jours');
}

function rhExits() {
  const list = state.employees.map(normEmp).filter(n => n.dateSortie).sort((a,b) => (b.dateSortie||'').localeCompare(a.dateSortie||''));
  return rhTable(list, [
    { label: 'Date de sortie', val: e => fmtDateShort(e.dateSortie) },
    { label: 'Salarié', val: e => `${e.prenom} ${e.nom}` },
    { label: 'Motif', val: e => e.motifSortie||'—' },
    { label: 'Contrat', val: e => e.contrat||'—' },
    { label: 'Email', val: e => e.email||'—' },
  ], 'Aucune sortie enregistrée');
}

function rhEssai() {
  // Salariés en période d'essai : contratDebut + periodeEssaiJours > today
  const now = new Date();
  const cutoff = addDays(now, 60); // afficher ceux dont la fin d'essai arrive dans les 60 prochains jours
  const list = state.employees.map(normEmp).filter(n => {
    if (!n.contratDebut || !n.periodeEssaiJours) return false;
    const finEssai = addDays(new Date(n.contratDebut), n.periodeEssaiJours);
    return finEssai >= addDays(now, -7) && finEssai <= cutoff;
  }).map(n => ({...n, finEssai: addDays(new Date(n.contratDebut), n.periodeEssaiJours)}))
    .sort((a,b) => a.finEssai - b.finEssai);
  return rhTable(list, [
    { label: 'Fin période essai', val: e => fmtDateShort(dateISO(e.finEssai)) },
    { label: 'Date d\'entrée', val: e => fmtDateShort(e.contratDebut) },
    { label: 'Salarié', val: e => `${e.prenom} ${e.nom}` },
    { label: 'Contrat', val: e => e.contrat||'—' },
  ], 'Aucune fin de période d\'essai à venir');
}

function rhIncomplete() {
  const list = state.employees.map(normEmp).filter(n => !isProfileComplete(n));
  return rhTable(list, [
    { label: 'Salarié', val: e => `${e.prenom} ${e.nom}` },
    { label: 'Manque email', val: e => e.email?'✓':'<span style="color:var(--c-alert);">✗</span>' },
    { label: 'Manque tél.', val: e => e.telMobile?'✓':'<span style="color:var(--c-alert);">✗</span>' },
    { label: 'Manque date naiss.', val: e => e.dateNaissance?'✓':'<span style="color:var(--c-alert);">✗</span>' },
    { label: 'Manque adresse', val: e => e.adresse?'✓':'<span style="color:var(--c-alert);">✗</span>' },
    { label: 'Manque CP/ville', val: e => (e.codePostal && e.ville)?'✓':'<span style="color:var(--c-alert);">✗</span>' },
    { label: 'Manque contrat', val: e => e.contratDebut?'✓':'<span style="color:var(--c-alert);">✗</span>' },
  ], 'Tous les profils sont complets ✓');
}

function rhTable(list, cols, emptyMsg) {
  return `
    <div class="panel">
      <div class="panel-body ${list.length?'nopad':''}" style="${list.length?'overflow-x:auto':''}">
        ${list.length === 0 ? `<div class="text-mute" style="text-align:center;padding:32px 0;font-size:13px;">${esc(emptyMsg)}</div>` : `
          <table class="tbl">
            <thead><tr>${cols.map(c => `<th>${esc(c.label)}</th>`).join('')}<th></th></tr></thead>
            <tbody>
              ${list.map(e => `
                <tr>
                  ${cols.map(c => `<td>${c.val(e)}</td>`).join('')}
                  <td><button class="btn-ghost" data-rh-view="${e.id}">Voir →</button></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `}
      </div>
    </div>
  `;
}

// ── Small helper for key-value rows in the detail panels ──
function kvRow(label, value) {
  return `<div class="kv-row"><div class="kv-label">${esc(label)}</div><div class="kv-value">${typeof value === 'string' ? esc(value) : value}</div></div>`;
}
// ─────────── EMPLOYEE MOBILE SHELL ───────────
function viewEmpShell() {
  return `
    <div class="emp-shell">
      <div class="emp-topbar">
        <div class="greet">
          <div class="gtitle">${esc(state.user.prenom)}</div>
          <div class="gsub">${new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <button class="btn-icon" data-logout>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
        </button>
      </div>

      <div class="emp-content fade-in" id="empBody">
        ${renderEmpPage()}
      </div>

      <nav class="emp-tabbar">
        <button class="emp-tab ${state.page==='home'?'active':''}" data-page="home">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12 12 3l9 9M5 10v10h14V10"/></svg>
          Pointer
        </button>
        <button class="emp-tab ${state.page==='myweek'?'active':''}" data-page="myweek">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Planning
        </button>
        <button class="emp-tab ${state.page==='myreqs'?'active':''}" data-page="myreqs">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2a10 10 0 0 1 10 10c0 5-4 9-9 10l-1-4"/><circle cx="12" cy="12" r="3"/></svg>
          Absences
        </button>
        <button class="emp-tab ${state.page==='myhours'?'active':''}" data-page="myhours">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          Heures
        </button>
        <button class="emp-tab ${state.page==='profile'?'active':''}" data-page="profile">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a7 7 0 0 1 7-7h2a7 7 0 0 1 7 7v1"/></svg>
          Profil
        </button>
      </nav>
    </div>`;
}

function renderEmpPage() {
  switch (state.page) {
    case 'home': return empHome();
    case 'myweek': return empWeek();
    case 'myreqs': return empMyRequests();
    case 'myhours': return empHours();
    case 'profile': return empProfile();
    default: return empHome();
  }
}

function bindEmp() {
  $$('[data-page]').forEach(b => b.addEventListener('click', e => {
    state.page = e.currentTarget.dataset.page;
    render();
  }));
  $$('[data-logout]').forEach(b => b.addEventListener('click', logout));

  switch (state.page) {
    case 'home': bindEmpHome(); break;
    case 'myweek': break;
    case 'myreqs': bindEmpMyRequests(); break;
    case 'myhours': break;
    case 'profile': break;
  }
}

// ─────────── EMPLOYEE — MY REQUESTS ───────────
function empMyRequests() {
  const empId = state.user.empId;
  const reqs = Object.entries(state.absenceRequests||{})
    .map(([id,r]) => ({...r, id}))
    .filter(r => r.empId === empId)
    .sort((a,b) => (b.createdAt||'').localeCompare(a.createdAt||''));

  return `
    <div class="row" style="justify-content:space-between;margin-bottom:14px;">
      <div>
        <div class="uppercase-eyebrow">Mes absences</div>
        <div class="serif" style="font-size:24px;letter-spacing:-0.02em;">Demandes</div>
      </div>
    </div>

    <button class="punch-btn" id="newReq" style="margin-bottom:16px;">+ Nouvelle demande</button>

    ${reqs.length === 0 ? `
      <div class="panel" style="background:#fafafa;border-style:dashed;">
        <div class="panel-body" style="text-align:center;padding:24px 18px;">
          <div style="font-size:32px;margin-bottom:8px;">🌴</div>
          <div class="text-mute" style="font-size:13px;">Aucune demande pour le moment</div>
        </div>
      </div>
    ` : reqs.map(r => {
      const lt = LEAVE_TYPES[r.type];
      return `
        <div class="panel" style="margin-bottom:10px;">
          <div class="panel-body" style="padding:14px 16px;">
            <div class="row" style="justify-content:space-between;margin-bottom:6px;">
              <div style="font-weight:500;">${esc(lt?.label||r.type)}</div>
              ${reqStatusChip(r.status)}
            </div>
            <div class="text-mute mono" style="font-size:12px;">
              ${fmtDateShort(r.dateStart)} → ${fmtDateShort(r.dateEnd)} · ${r.nbJours||'?'} jour${r.nbJours>1?'s':''}
            </div>
            ${r.motif ? `<div style="margin-top:6px;font-size:12.5px;color:var(--c-ink-3);">"${esc(r.motif)}"</div>` : ''}
            ${r.commentAdmin ? `<div style="margin-top:6px;font-size:12px;color:var(--c-alert);">Décision : ${esc(r.commentAdmin)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('')}
  `;
}

function bindEmpMyRequests() {
  $('#newReq').addEventListener('click', () => openEmpAbsenceRequest());
}

function openEmpAbsenceRequest() {
  const empId = state.user.empId;
  const body = `
    <div class="form-grid">
      <div class="field full"><label class="field-label">Type d'absence</label>
        <select class="input" id="erType">
          ${Object.entries(LEAVE_TYPES).map(([k,v]) => `<option value="${k}">${esc(v.label)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="field-label">Du</label><input class="input" id="erStart" type="date" value="${dateISO(new Date())}"></div>
      <div class="field"><label class="field-label">Au</label><input class="input" id="erEnd" type="date" value="${dateISO(new Date())}"></div>
      <div class="field full"><label class="field-label">Motif (optionnel)</label><textarea class="input" id="erMotif" rows="3" placeholder="Pourquoi cette absence..."></textarea></div>
      <div class="field full text-mute" style="font-size:11.5px;">Ta demande sera envoyée à la direction. Tu seras notifié dès qu'elle sera traitée.</div>
    </div>
  `;
  const footer = `<div class="spacer"></div><button class="btn-sec" data-close>Annuler</button><button class="btn-pri" id="erSave" style="width:auto;padding:10px 18px;">Envoyer la demande</button>`;
  const { close } = openModal({ title: 'Nouvelle demande d\'absence', body, footer });
  $('#erSave').addEventListener('click', () => {
    const start = $('#erStart').value;
    const endVal = $('#erEnd').value;
    if (!start || !endVal) { toast('Renseigne les dates', 'error'); return; }
    if (endVal < start) { toast('Date de fin avant date de début', 'error'); return; }
    const sD = new Date(start), eD = new Date(endVal);
    const nbJours = Math.round((eD - sD)/86400000) + 1;
    const id = 'r' + Date.now();
    const r = {
      empId, type: $('#erType').value,
      dateStart: start, dateEnd: endVal,
      motif: $('#erMotif').value.trim(),
      nbJours,
      status: 'pending', createdAt: new Date().toISOString(),
    };
    state.absenceRequests[id] = r;
    fbSave(`absenceRequests/${id}`, r);
    toast('Demande envoyée à la direction', 'good');
    close();
    render();
  });
}



// ─────────── EMPLOYEE — HOME (PUNCH) ───────────
function empHome() {
  const empId = state.user.empId;
  const now = new Date();
  const iso = dateISO(now);
  const dayIdx = (now.getDay() + 6) % 7;
  const wk = weekKey(now);
  const wkPublished = weekIsPublished(wk);
  const today = wkPublished ? (state.shifts[`${empId}_${dayIdx}_${wk}`] || []).map(normShift) : [];
  const punches = state.punches[`${empId}_${iso}`] || [];
  const last = punches[punches.length-1];
  const ongoing = last && last.in && !last.out;

  const pub = state.publications[wk];
  const showPubBanner = pub && (Date.now() - new Date(pub.publishedAt).getTime() < 7*24*60*60*1000);

  const todayLeave = today.find(s => s.leaveType);

  let statusText = '';
  if (!wkPublished) statusText = `Planning de la semaine pas encore publié.`;
  else if (todayLeave) statusText = `Aujourd'hui : ${LEAVE_TYPES[todayLeave.leaveType]?.label || 'Absence'}`;
  else if (today.length === 0) statusText = `Aucun shift prévu aujourd'hui.`;
  else if (ongoing) statusText = `Pointé à ${last.in} — en service.`;
  else if (last && last.out) statusText = `Dernier pointage : ${last.in} → ${last.out}.`;
  else statusText = `Shift prévu : ${today[0].start} → ${today[0].end}.`;

  return `
    ${showPubBanner ? `
      <div class="pub-banner">
        <div style="flex:1;">
          <div style="font-weight:500;font-size:13px;">📢 Nouveau planning publié</div>
          <div style="font-size:11.5px;opacity:.85;margin-top:2px;">Publié ${new Date(pub.publishedAt).toLocaleString('fr-FR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
        </div>
        <button class="btn-ghost" data-page="myweek" style="color:inherit;font-weight:500;">Voir →</button>
      </div>
    ` : ''}

    <div class="punch-card">
      <div class="punch-time" id="punchClock">${pad(now.getHours())}:${pad(now.getMinutes())}</div>
      <div class="punch-date">${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="punch-status">${statusText}</div>
      ${todayLeave ? '' :
        (ongoing
          ? `<button class="punch-btn" id="btnPunchOut">Pointer la sortie</button>`
          : (today.length > 0 || punches.length > 0)
            ? `<button class="punch-btn" id="btnPunchIn">Pointer l'entrée</button>`
            : `<button class="punch-btn" id="btnPunchIn">Pointer l'arrivée (hors planning)</button>`)
      }
      ${punches.length ? `<button class="punch-btn secondary" id="btnSignal">Signaler une modification</button>` : ''}
    </div>

    ${today.length && !todayLeave ? `
      <div class="panel">
        <div class="panel-head"><h3>Shift d'aujourd'hui</h3></div>
        <div class="panel-body">
          ${today.map(s => `
            <div class="row" style="justify-content:space-between;">
              <div>
                <div style="font-family:var(--f-mono);font-size:16px;">${s.start} → ${s.end}</div>
                <div class="text-mute" style="font-size:12px;margin-top:2px;">${esc(s.label || (s.type==='midi'?'Service midi':s.type==='soir'?'Service soir':'Journée'))}${s.pauseDuration?` · pause ${s.pauseDuration}mn`:''}</div>
              </div>
              <div class="mono tabular" style="font-size:13px;color:var(--c-ink-4);">${shiftHours(s).toFixed(1)} h</div>
            </div>`).join('')}
        </div>
      </div>` : ''}

    ${punches.length ? `
      <div class="panel" style="margin-top:12px;">
        <div class="panel-head"><h3>Pointages d'aujourd'hui</h3></div>
        <div class="panel-body" style="padding:0;">
          ${punches.map((p,i) => `
            <div class="row" style="padding:12px 16px;border-bottom:1px solid var(--c-line-2);justify-content:space-between;">
              <div class="mono">${p.in || '—'} → ${p.out || '<span class="text-dim">en cours</span>'}</div>
              ${p.meta ? `<div class="text-mute" style="font-size:11px;">${esc(p.meta)}</div>` : ''}
            </div>`).join('')}
        </div>
      </div>` : ''}
  `;
}

function bindEmpHome() {
  // live clock
  const tick = () => {
    const el = $('#punchClock');
    if (!el) return;
    const n = new Date();
    el.textContent = `${pad(n.getHours())}:${pad(n.getMinutes())}`;
  };
  const interval = setInterval(tick, 30000);
  setTimeout(() => clearInterval(interval), 600000); // stop after 10min idle

  const inBtn = $('#btnPunchIn');
  const outBtn = $('#btnPunchOut');
  const sigBtn = $('#btnSignal');

  if (inBtn) inBtn.addEventListener('click', () => doPunch('in'));
  if (outBtn) outBtn.addEventListener('click', () => doPunch('out'));
  if (sigBtn) sigBtn.addEventListener('click', openSignalModal);
}

function doPunch(kind) {
  const empId = state.user.empId;
  const now = new Date();
  const iso = dateISO(now);
  const hhmm = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const key = `${empId}_${iso}`;
  const punches = state.punches[key] ? [...state.punches[key]] : [];
  if (kind === 'in') {
    punches.push({ in: hhmm });
  } else {
    if (punches.length === 0 || punches[punches.length-1].out) {
      toast('Aucune entrée à clôturer', 'error');
      return;
    }
    punches[punches.length-1].out = hhmm;
  }
  state.punches[key] = punches;
  fbSave(`punches/${key}`, punches);
  toast(kind === 'in' ? `Entrée enregistrée à ${hhmm}` : `Sortie enregistrée à ${hhmm}`, 'good');
  render();
}

function openSignalModal() {
  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Entrée réelle</label><input class="input mono" id="sigIn" type="time"></div>
      <div class="field"><label class="field-label">Sortie réelle</label><input class="input mono" id="sigOut" type="time"></div>
      <div class="field full"><label class="field-label">Motif</label>
        <textarea class="input" id="sigReason" rows="3" placeholder="ex: pause étendue, oubli pointage..."></textarea>
      </div>
    </div>
    <div class="text-mute" style="font-size:12px;margin-top:10px;">Ta demande sera transmise à l'admin pour validation.</div>
  `;
  const footer = `
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="sigSend" style="width:auto;padding:10px 18px;">Envoyer</button>
  `;
  const { close } = openModal({ title: 'Signaler une modification', body, footer });
  $('#sigSend').addEventListener('click', () => {
    const empId = state.user.empId;
    const iso = dateISO(new Date());
    const key = `${empId}_${iso}`;
    const inT = $('#sigIn').value, outT = $('#sigOut').value, reason = $('#sigReason').value.trim();
    if (!inT && !outT) { toast('Renseigne au moins une heure', 'error'); return; }
    const punches = state.punches[key] ? [...state.punches[key]] : [];
    punches.push({ in: inT, out: outT, meta: 'Signalé : ' + (reason || 'sans motif') });
    state.punches[key] = punches;
    fbSave(`punches/${key}`, punches);
    toast('Signalement envoyé', 'good');
    close();
    render();
  });
}

// ─────────── EMPLOYEE — MY WEEK ───────────
function empWeek() {
  const empId = state.user.empId;
  const wk = weekKey(state.weekStart);
  const wkPublished = weekIsPublished(wk);
  const todayISO = dateISO(new Date());
  const wkEnd = addDays(state.weekStart, 6);

  let totalH = 0;
  const cards = !wkPublished ? '' : [0,1,2,3,4,5,6].map(i => {
    const d = addDays(state.weekStart, i);
    const iso = dateISO(d);
    const shifts = (state.shifts[`${empId}_${i}_${wk}`] || []).map(normShift);
    const isToday = iso === todayISO;
    const fer = holidayFor(d);
    const hours = shifts.reduce((s, sh) => s + shiftHours(sh), 0);
    totalH += hours;
    const ferieTag = fer ? `<span class="ferie-pill">🇫🇷 ${esc(fer.short)}</span>` : '';
    if (!shifts.length) {
      return `<div class="day-card off ${isToday?'today':''} ${fer?'ferie':''}">
        <div><div class="day-num">${d.getDate()}</div><div class="day-name">${DAYS_SHORT[i]}</div></div>
        <div class="day-info"><div class="day-shift">Repos</div>${ferieTag}</div>
      </div>`;
    }
    return shifts.map(s => {
      if (s.leaveType) {
        const lt = LEAVE_TYPES[s.leaveType];
        return `<div class="day-card ${isToday?'today':''} ${fer?'ferie':''}" style="border-left:3px solid currentColor;">
          <div><div class="day-num">${d.getDate()}</div><div class="day-name">${DAYS_SHORT[i]}</div></div>
          <div class="day-info">
            <div class="day-shift" style="font-family:var(--f-body);">${esc(lt?.label || 'Absence')}</div>
            <div class="day-meta">Non travaillé</div>
            ${ferieTag}
          </div>
        </div>`;
      }
      return `
      <div class="day-card ${isToday?'today':''} ${fer?'ferie':''}">
        <div><div class="day-num">${d.getDate()}</div><div class="day-name">${DAYS_SHORT[i]}</div></div>
        <div class="day-info">
          <div class="day-shift">${s.start} → ${s.end}</div>
          <div class="day-meta">${esc(s.label || (s.type==='midi'?'Service midi':s.type==='soir'?'Service soir':'Journée'))} · ${shiftHours(s).toFixed(1)} h${s.pauseDuration?` · pause ${s.pauseDuration}mn`:''}</div>
          ${ferieTag}
        </div>
      </div>`;
    }).join('');
  }).join('');

  return `
    <div class="row" style="justify-content:space-between;margin-bottom:14px;">
      <div>
        <div class="uppercase-eyebrow">Ma semaine</div>
        <div class="serif" style="font-size:24px;letter-spacing:-0.02em;">${fmtRange(state.weekStart, wkEnd)}</div>
      </div>
      <div class="text-mute mono tabular" style="font-size:13px;">${totalH.toFixed(1)} h</div>
    </div>

    <div class="row" style="margin-bottom:14px;gap:6px;">
      <button class="btn-sec" data-week="prev" style="padding:7px 12px;">←</button>
      <button class="btn-sec" data-week="today" style="padding:7px 14px;flex:1;">Cette semaine</button>
      <button class="btn-sec" data-week="next" style="padding:7px 12px;">→</button>
    </div>

    ${wkPublished ? cards : `
      <div class="panel" style="background:#fafafa;border-style:dashed;">
        <div class="panel-body" style="text-align:center;padding:32px 18px;">
          <div style="font-size:32px;margin-bottom:8px;">📋</div>
          <div style="font-weight:500;margin-bottom:4px;">Planning non publié</div>
          <div class="text-mute" style="font-size:12.5px;">Le planning de cette semaine n'a pas encore été publié par la direction. Reviens un peu plus tard.</div>
        </div>
      </div>
    `}
  `;
}

// ─────────── EMPLOYEE — MY HOURS ───────────
function empHours() {
  const empId = state.user.empId;
  const emp = state.employees.find(e => e.id === empId);
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0);

  let totalReal = 0, totalPlanned = 0, daysWorked = 0;
  for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
    const iso = dateISO(d);
    const dayIdx = (d.getDay() + 6) % 7;
    const wk = weekKey(d);
    const shifts = state.shifts[`${empId}_${dayIdx}_${wk}`] || [];
    const punches = state.punches[`${empId}_${iso}`] || [];
    shifts.forEach(s => totalPlanned += shiftHours(s));
    let dayReal = 0;
    punches.forEach(p => {
      if (p.in && p.out) {
        let dur = timeToMin(p.out) - timeToMin(p.in);
        if (dur < 0) dur += 24*60;
        dayReal += dur / 60;
      }
    });
    if (dayReal > 0) daysWorked++;
    totalReal += dayReal;
  }

  const monthLabel = now.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const expected = (emp.heures || 35) * 4.33;
  const pct = Math.min(100, Math.round((totalReal / expected) * 100));

  return `
    <div class="row" style="justify-content:space-between;margin-bottom:14px;">
      <div>
        <div class="uppercase-eyebrow">Mes heures</div>
        <div class="serif" style="font-size:24px;letter-spacing:-0.02em;text-transform:capitalize;">${monthLabel}</div>
      </div>
    </div>

    <div class="punch-card" style="text-align:left;">
      <div class="uppercase-eyebrow" style="color:rgba(255,255,255,.55);margin-bottom:8px;">Heures réelles ce mois</div>
      <div class="punch-time">${totalReal.toFixed(1)}<span style="font-size:24px;opacity:.6;"> h</span></div>
      <div class="punch-status" style="margin-top:8px;">
        ${daysWorked} jour${daysWorked>1?'s':''} travaillé${daysWorked>1?'s':''} · objectif ~${expected.toFixed(0)} h
      </div>
      <div style="height:6px;background:rgba(255,255,255,.1);border-radius:10px;overflow:hidden;margin-top:8px;">
        <div style="width:${pct}%;height:100%;background:#fff;transition:width .4s;"></div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head"><h3>Comparaison</h3></div>
      <div class="panel-body" style="padding:0;">
        <div class="row" style="padding:14px 16px;border-bottom:1px solid var(--c-line-2);justify-content:space-between;">
          <div><div class="text-mute" style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Planifié</div><div class="serif" style="font-size:22px;">${totalPlanned.toFixed(1)} h</div></div>
          <div><div class="text-mute" style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Réel</div><div class="serif" style="font-size:22px;">${totalReal.toFixed(1)} h</div></div>
          <div><div class="text-mute" style="font-size:11px;letter-spacing:0.06em;text-transform:uppercase;">Écart</div><div class="serif" style="font-size:22px;color:${Math.abs(totalReal-totalPlanned)>=1?'var(--c-alert)':'var(--c-ink)'};">${totalReal-totalPlanned>=0?'+':''}${(totalReal-totalPlanned).toFixed(1)} h</div></div>
        </div>
      </div>
    </div>
  `;
}

// ─────────── EMPLOYEE — PROFILE ───────────
function empProfile() {
  const emp = state.employees.find(e => e.id === state.user.empId);
  if (!emp) return `<div class="empty"><h4>Profil indisponible</h4></div>`;
  return `
    <div class="row" style="margin-bottom:18px;gap:14px;">
      <div class="av-emp lg">${initials(emp)}</div>
      <div>
        <div class="serif" style="font-size:24px;letter-spacing:-0.02em;line-height:1.1;">${esc(emp.prenom)} ${esc(emp.nom)}</div>
        <div class="text-mute" style="font-size:13px;margin-top:2px;">${esc(emp.poste)}</div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body" style="padding:0;">
        ${profileRow('Contrat', esc(emp.contrat))}
        ${profileRow('Heures hebdo', `<span class="mono">${emp.heures} h</span>`)}
        ${profileRow('Taux horaire', `<span class="mono">${emp.taux.toFixed(2)} €</span>`)}
        ${profileRow('Congés acquis', `<span class="mono">${emp.cpAcquis || 0} jours</span>`)}
        ${profileRow('Congés pris', `<span class="mono">${emp.cpPris || 0} jours</span>`)}
        ${emp.email ? profileRow('Email', `<span class="mono" style="font-size:12px;">${esc(emp.email)}</span>`) : ''}
      </div>
    </div>

    <button class="btn-sec" data-logout style="width:100%;margin-top:16px;padding:14px;">Se déconnecter</button>
  `;
}
function profileRow(label, value) {
  return `<div class="row" style="padding:14px 16px;border-bottom:1px solid var(--c-line-2);justify-content:space-between;">
    <div class="text-mute" style="font-size:12px;letter-spacing:0.04em;text-transform:uppercase;">${label}</div>
    <div>${value}</div>
  </div>`;
}

// Week nav for employee
document.addEventListener('click', e => {
  const t = e.target.closest('[data-week]');
  if (!t) return;
  if (state.user?.role !== 'emp') return;
  const a = t.dataset.week;
  if (a === 'prev') state.weekStart = addDays(state.weekStart, -7);
  else if (a === 'next') state.weekStart = addDays(state.weekStart, 7);
  else state.weekStart = getMonday(new Date());
  render();
});

// ─────────── BOOT ───────────
function finishBoot() {
  if (!state.loading) return; // already booted
  state.loading = false;
  if (!state.employees.length) state.employees = DEFAULT_EMPLOYEES;
  if (state.user?.role === 'emp' && !state.employees.find(e => e.id === state.user.empId)) {
    state.employees = DEFAULT_EMPLOYEES;
  }
  console.log('[boot] rendering', { fbReady: state.fbReady, employees: state.employees.length, user: state.user });
  render();
}

(async function boot() {
  console.log('[boot] starting');
  // Restore session if any
  const saved = sessionStorage.getItem('mu_user');
  if (saved) {
    try { state.user = JSON.parse(saved); } catch {}
  }

  // Failsafe: always render within 2.5s regardless of Firebase status
  const failsafe = setTimeout(() => {
    console.warn('[boot] failsafe triggered — Firebase took too long');
    finishBoot();
  }, 2500);

  // Try Firebase with timeout
  try {
    const fbPromise = initFirebase();
    const timeoutPromise = new Promise(r => setTimeout(() => r(false), 4000));
    const ok = await Promise.race([fbPromise, timeoutPromise]);
    if (ok) {
      fbListen();
      try {
        await Promise.race([seedIfEmpty(), new Promise(r => setTimeout(r, 1500))]);
      } catch (e) { console.warn('[boot] seed failed', e); }
    }
  } catch (e) {
    console.error('[boot] firebase error', e);
  }

  clearTimeout(failsafe);
  // Small delay so first listener snapshot can arrive
  setTimeout(finishBoot, 300);
})();

// Service worker registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(e => console.warn('SW failed', e));
  });
}
