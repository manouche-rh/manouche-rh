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
  weekStart: getMonday(new Date()),
  fbReady: false,
  page: null,        // current page id
  loading: true,
  monthView: false,  // toggle between week/month view in planning
  monthAnchor: new Date(),
};

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
  const close = () => { bg.remove(); onClose && onClose(); };
  bg.addEventListener('click', (e) => { if (e.target === bg) close(); });
  $('[data-close]', bg).addEventListener('click', close);
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

function fbListen() {
  if (!db) return;
  ['employees','shifts','punches','publications'].forEach(k => {
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
      if (k === 'publications' && v) {
        state.publications = v;
        console.log('[fb] publications loaded:', Object.keys(state.publications).length);
      }
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
        <h1 class="login-h">Man'<em>ouché</em></h1>
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
  return `
    <div class="shell">
      <aside class="side">
        <div class="side-brand">
          <div class="side-mark">M</div>
          <div>
            <div class="side-brand-name">Man'<em>ouché</em></div>
            <div class="side-brand-sub">Console RH</div>
          </div>
        </div>

        <div class="side-section">Vue d'ensemble</div>
        <button class="nav-item ${state.page==='dashboard'?'active':''}" data-page="dashboard">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 12h6V3H3v9zM3 21h6v-6H3v6zM12 21h9V12h-9v9zM12 3v6h9V3h-9z"/></svg>
          Tableau de bord
        </button>
        <button class="nav-item ${state.page==='planning'?'active':''}" data-page="planning">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>
          Planning
        </button>
        <button class="nav-item ${state.page==='month'?'active':''}" data-page="month">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>
          Vue mois
        </button>
        <button class="nav-item ${state.page==='hours'?'active':''}" data-page="hours">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M12 2v20M2 12h20"/><circle cx="12" cy="12" r="9"/></svg>
          Heures
        </button>
        <button class="nav-item ${state.page==='pointages'?'active':''}" data-page="pointages">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          Pointages
        </button>
        <button class="nav-item ${state.page==='alerts'?'active':''}" data-page="alerts">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.7 3.86a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>
          Alertes
          ${anomalies.length ? `<span class="badge">${anomalies.length}</span>` : ''}
        </button>

        <div class="side-section">Données</div>
        <button class="nav-item ${state.page==='employees'?'active':''}" data-page="employees">
          <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          Salariés
        </button>

        <div class="side-foot">
          <div class="av">A</div>
          <div style="flex:1;">
            <div style="color:#fff;font-weight:500;font-size:12.5px;">Admin</div>
            <div style="font-size:11px;display:flex;align-items:center;gap:6px;">
              <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:${state.fbReady ? '#22c55e' : '#737373'};box-shadow:${state.fbReady ? '0 0 0 3px rgba(34,197,94,.18)' : 'none'};"></span>
              ${state.fbReady ? 'Connecté' : 'Hors ligne'}
            </div>
          </div>
          <button class="btn-icon" data-logout style="color:rgba(255,255,255,.6);" title="Déconnexion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>
      </aside>

      <div class="main">
        <div class="mob-head">
          <div class="side-mark">M</div>
          <div class="brand">Man'<em style="font-style:italic;color:var(--c-ink-5);">ouché</em></div>
          <select id="mobNav">
            <option value="dashboard" ${state.page==='dashboard'?'selected':''}>Tableau de bord</option>
            <option value="planning" ${state.page==='planning'?'selected':''}>Planning</option>
            <option value="month" ${state.page==='month'?'selected':''}>Vue mois</option>
            <option value="hours" ${state.page==='hours'?'selected':''}>Heures</option>
            <option value="pointages" ${state.page==='pointages'?'selected':''}>Pointages</option>
            <option value="alerts" ${state.page==='alerts'?'selected':''}>Alertes${anomalies.length?` (${anomalies.length})`:''}</option>
            <option value="employees" ${state.page==='employees'?'selected':''}>Salariés</option>
          </select>
          <button class="btn-icon" data-logout style="color:rgba(255,255,255,.7);">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>
          </button>
        </div>

        <div class="page-pad fade-in" id="adminBody">
          ${renderAdminPage()}
        </div>
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
    case 'employees': return pageEmployees();
    default: return pageDashboard();
  }
}

function bindAdmin() {
  $$('[data-page]').forEach(b => b.addEventListener('click', e => {
    state.page = e.currentTarget.dataset.page;
    render();
  }));
  $$('[data-logout]').forEach(b => b.addEventListener('click', logout));
  const mob = $('#mobNav');
  if (mob) mob.addEventListener('change', e => { state.page = e.target.value; render(); });

  // Page-specific bindings
  switch (state.page) {
    case 'dashboard': bindDashboard(); break;
    case 'planning': bindPlanning(); break;
    case 'month': bindMonth(); break;
    case 'hours': bindHours(); break;
    case 'pointages': bindPointages(); break;
    case 'alerts': bindAlerts(); break;
    case 'employees': bindEmployees(); break;
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
              ? `<span class="chip draft">● BROUILLON — invisible pour les salariés</span>`
              : `<span class="chip warn">Non publié</span>`)}
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
function pageHours() {
  const actives = state.employees.filter(e => e.statut === 'Actif');
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth()+1, 0);

  // Heures par employé pour le mois courant
  const monthData = actives.map(emp => {
    let planned = 0, real = 0, leaves = {};
    for (let d = new Date(monthStart); d <= monthEnd; d = addDays(d, 1)) {
      const wk = weekKey(d);
      const dayIdx = (d.getDay() + 6) % 7;
      const shifts = (state.shifts[`${emp.id}_${dayIdx}_${wk}`] || []).map(normShift);
      shifts.forEach(s => {
        if (s.leaveType) {
          leaves[s.leaveType] = (leaves[s.leaveType] || 0) + 1;
        } else {
          planned += shiftHours(s);
        }
      });
      const punches = state.punches[`${emp.id}_${dateISO(d)}`] || [];
      punches.forEach(p => {
        if (p.in && p.out) {
          let dur = timeToMin(p.out) - timeToMin(p.in);
          if (dur < 0) dur += 24*60;
          real += dur / 60;
        }
      });
    }
    const monthlyContract = (emp.heures || 35) * 4.33;
    return { emp, planned, real, leaves, monthlyContract };
  });

  // Heures par semaine (8 dernières semaines)
  const weeks = [];
  for (let i = 7; i >= 0; i--) weeks.push(addDays(state.weekStart, -7 * i));

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Suivi des heures</div>
        <h1 class="h-1">Heures par salarié</h1>
      </div>
    </div>

    <div class="panel">
      <div class="panel-head">
        <h3>Mois en cours · ${MONTHS_FR[now.getMonth()]} ${now.getFullYear()}</h3>
      </div>
      <div class="panel-body nopad">
        <table class="tbl">
          <thead>
            <tr>
              <th>Salarié</th>
              <th>Contrat</th>
              <th>Heures planifiées</th>
              <th>Heures réelles</th>
              <th>Écart planning</th>
              <th>Absences / Congés</th>
            </tr>
          </thead>
          <tbody>
            ${monthData.map(({emp, planned, real, leaves, monthlyContract}) => {
              const gap = planned - monthlyContract;
              const leaveSummary = Object.entries(leaves).map(([k,v]) => `${v} ${LEAVE_TYPES[k]?.short || k}`).join(' · ');
              return `
                <tr>
                  <td><div class="emp-cell"><div class="av-emp sm">${initials(emp)}</div><div><div class="emp-cell-name">${esc(emp.prenom)} ${esc(emp.nom)}</div><div class="emp-cell-meta">${esc(emp.poste)}</div></div></div></td>
                  <td class="mono">${emp.heures}h/sem (~${monthlyContract.toFixed(0)}h/mois)</td>
                  <td class="mono tabular">${planned.toFixed(1)} h</td>
                  <td class="mono tabular">${real > 0 ? real.toFixed(1)+' h' : '<span class="text-dim">—</span>'}</td>
                  <td><span class="chip ${Math.abs(gap)<5?'':(gap>0?'warn':'alert')}">${gap>=0?'+':''}${gap.toFixed(1)} h</span></td>
                  <td>${leaveSummary || '<span class="text-dim">—</span>'}</td>
                </tr>
              `;
            }).join('')}
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
  `;
}

function bindHours() {}

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
function pageEmployees() {
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
          <thead><tr><th>Salarié</th><th>Poste</th><th>Contrat</th><th>Heures</th><th>Username</th><th>Code</th><th>Statut</th><th></th></tr></thead>
          <tbody>
            ${state.employees.map(e => `
              <tr>
                <td><div class="emp-cell"><div class="av-emp">${initials(e)}</div><div><div class="emp-cell-name">${esc(e.prenom)} ${esc(e.nom)}</div><div class="emp-cell-meta">${esc(e.email||'')}</div></div></div></td>
                <td>${esc(e.poste)}</td>
                <td><span class="chip">${esc(e.contrat)}</span></td>
                <td class="mono tabular">${e.heures}h</td>
                <td class="mono">${esc(e.username)}</td>
                <td class="mono">${esc(String(e.code))}</td>
                <td><span class="status-dot ${e.statut==='Actif'?'on':'off'}">${esc(e.statut)}</span></td>
                <td><button class="btn-ghost" data-edit-emp="${e.id}">Éditer</button></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function bindEmployees() {
  $('#addEmp').addEventListener('click', () => openEmployeeEditor(null));
  $$('[data-edit-emp]').forEach(b => b.addEventListener('click', e => {
    const id = parseInt(e.currentTarget.dataset.editEmp);
    openEmployeeEditor(id);
  }));
}

function openEmployeeEditor(id) {
  const isNew = id == null;
  const e = isNew
    ? { id: Math.max(0, ...state.employees.map(x=>x.id)) + 1, prenom:'', nom:'', poste:'Cuisinier', contrat:'CDI', heures:35, taux:12, statut:'Actif', cpAcquis:25, cpPris:0, username:'', code:'1234', email:'' }
    : { ...state.employees.find(x => x.id === id) };

  const body = `
    <div class="form-grid">
      <div class="field"><label class="field-label">Prénom</label><input class="input" id="empPrenom" value="${esc(e.prenom)}"></div>
      <div class="field"><label class="field-label">Nom</label><input class="input" id="empNom" value="${esc(e.nom)}"></div>
      <div class="field"><label class="field-label">Poste</label><input class="input" id="empPoste" value="${esc(e.poste)}"></div>
      <div class="field"><label class="field-label">Contrat</label>
        <select class="input" id="empContrat">
          ${['CDI','CDD','Extra','Apprenti','Stage'].map(c => `<option ${c===e.contrat?'selected':''}>${c}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label class="field-label">Heures hebdo</label><input class="input mono" id="empHeures" type="number" value="${e.heures}"></div>
      <div class="field"><label class="field-label">Taux horaire (€)</label><input class="input mono" id="empTaux" type="number" step="0.01" value="${e.taux}"></div>
      <div class="field"><label class="field-label">Username</label><input class="input mono" id="empUser" value="${esc(e.username)}" placeholder="prenom.n"></div>
      <div class="field"><label class="field-label">Code PIN</label><input class="input mono" id="empCode" value="${esc(String(e.code))}"></div>
      <div class="field full"><label class="field-label">Email</label><input class="input" id="empEmail" type="email" value="${esc(e.email||'')}"></div>
      <div class="field full"><label class="field-label">Statut</label>
        <div class="tab-switch" id="empStatut" data-active="${e.statut==='Actif'?'0':'1'}">
          <button data-s="Actif" class="${e.statut==='Actif'?'active':''}">Actif</button>
          <button data-s="Inactif" class="${e.statut==='Inactif'?'active':''}">Inactif</button>
        </div>
      </div>
    </div>
  `;
  const footer = `
    ${!isNew ? `<button class="btn-danger" id="empDel">Supprimer</button>` : ''}
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="empSave" style="width:auto;padding:10px 18px;">Enregistrer</button>
  `;
  const { close } = openModal({ title: isNew ? 'Nouveau salarié' : `${e.prenom} ${e.nom}`, body, footer });

  let chosenStatut = e.statut;
  $$('#empStatut [data-s]').forEach(b => b.addEventListener('click', ev => {
    chosenStatut = ev.target.dataset.s;
    $$('#empStatut [data-s]').forEach(x => x.classList.toggle('active', x === ev.target));
    $('#empStatut').setAttribute('data-active', chosenStatut === 'Actif' ? 0 : 1);
  }));

  $('#empSave').addEventListener('click', () => {
    const updated = {
      ...e,
      prenom: $('#empPrenom').value.trim(),
      nom: $('#empNom').value.trim(),
      poste: $('#empPoste').value.trim(),
      contrat: $('#empContrat').value,
      heures: parseInt($('#empHeures').value) || 35,
      taux: parseFloat($('#empTaux').value) || 12,
      username: $('#empUser').value.trim().toLowerCase(),
      code: $('#empCode').value.trim(),
      email: $('#empEmail').value.trim(),
      statut: chosenStatut
    };
    if (!updated.prenom || !updated.nom) { toast('Prénom et nom requis', 'error'); return; }
    if (isNew) state.employees.push(updated);
    else state.employees = state.employees.map(x => x.id === id ? updated : x);
    fbSave('employees', state.employees);
    toast(isNew ? 'Salarié créé' : 'Salarié modifié', 'good');
    close();
    render();
  });

  if (!isNew) {
    $('#empDel').addEventListener('click', () => {
      if (!confirm(`Supprimer ${e.prenom} ${e.nom} ? Cette action est irréversible.`)) return;
      state.employees = state.employees.filter(x => x.id !== id);
      fbSave('employees', state.employees);
      toast('Salarié supprimé', '');
      close();
      render();
    });
  }
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
        <button class="emp-tab ${state.page==='myhours'?'active':''}" data-page="myhours">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
          Mes heures
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
    case 'myhours': break;
    case 'profile': break;
  }
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
