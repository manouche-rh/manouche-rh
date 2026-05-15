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

// ─────────── STATE ───────────
const state = {
  user: null,        // null | {role:'admin'} | {role:'emp', empId, ...}
  employees: [],
  shifts: {},        // key `${empId}_${dayIdx}_${weekKey}` → [{type,start,end,...}]
  punches: {},       // key `${empId}_${dateISO}` → [{in:'08:32',out:'14:15',meta?}]
  weekStart: getMonday(new Date()),
  fbReady: false,
  page: null,        // current page id
  loading: true
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
  ['employees','shifts','punches'].forEach(k => {
    db.ref(k).on('value', snap => {
      const v = snap.val();
      if (k === 'employees' && v) {
        // Merge with defaults to preserve username/code if missing in DB
        if (Array.isArray(v)) {
          state.employees = v.filter(Boolean);
        } else {
          state.employees = Object.values(v).filter(Boolean);
        }
        // Ensure required fields
        state.employees.forEach(e => {
          if (!e.username) e.username = (e.prenom || '').toLowerCase();
          if (!e.code) e.code = '1234';
        });
      }
      if (k === 'shifts' && v) state.shifts = v;
      if (k === 'punches' && v) state.punches = v;
      render();
    });
  });
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
            <div style="font-size:11px;">${state.fbReady ? '● Connecté' : '○ Hors ligne'}</div>
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

  return `
    <div class="page-head">
      <div>
        <div class="uppercase-eyebrow">Planning</div>
        <h1 class="h-1">${fmtRange(state.weekStart, wkEnd)}</h1>
      </div>
      <div class="page-actions">
        <div class="week-nav">
          <button class="btn-icon" data-week="prev">←</button>
          <span class="week-label">Semaine du ${pad(state.weekStart.getDate())}/${pad(state.weekStart.getMonth()+1)}</span>
          <button class="btn-icon" data-week="next">→</button>
          <button class="btn-sec" data-week="today">Cette semaine</button>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-body nopad">
        <div class="plan-wrap">
          <div class="plan">
            <div class="plan-cell head"><div class="day">Salarié</div></div>
            ${[0,1,2,3,4,5,6].map(i => {
              const d = addDays(state.weekStart, i);
              const isToday = dateISO(d) === todayISO;
              return `<div class="plan-cell head"><div class="day">${DAYS_SHORT[i]}</div><div class="date ${isToday?'today':''}">${d.getDate()}</div></div>`;
            }).join('')}
            ${actives.map(e => `
              <div class="plan-cell emp">
                <div class="row" style="gap:10px;"><div class="av-emp sm">${initials(e)}</div><div><div class="nm">${esc(e.prenom)}</div><div class="ct">${e.heures}h ${e.contrat}</div></div></div>
              </div>
              ${[0,1,2,3,4,5,6].map(d => {
                const shifts = state.shifts[`${e.id}_${d}_${wk}`] || [];
                return `<div class="plan-cell cell ${shifts.length?'has':''}" data-edit="${e.id}_${d}">
                  ${shifts.map(s => `<div class="shift ${s.type}"><span class="t">${s.start}–${s.end}</span><span class="l">${esc(s.label || (s.type==='midi'?'Midi':s.type==='soir'?'Soir':'Journée'))}</span></div>`).join('')}
                </div>`;
              }).join('')}
            `).join('')}
          </div>
        </div>
      </div>
    </div>

    <div class="row" style="margin-top:12px; color:var(--c-ink-4); font-size:12px;">
      <span>Astuce :</span><span>cliquez sur une cellule pour ajouter ou modifier un shift.</span>
    </div>
  `;
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
}

function openShiftEditor(empId, dayIdx) {
  const wk = weekKey(state.weekStart);
  const key = `${empId}_${dayIdx}_${wk}`;
  const existing = state.shifts[key] || [];
  const e = state.employees.find(x => x.id === empId);
  const sh = existing[0] || { type: 'soir', start: '17:00', end: '23:00', pauseDuration: 0 };
  const d = addDays(state.weekStart, dayIdx);

  const body = `
    <div class="uppercase-eyebrow" style="margin-bottom:4px;">${esc(e.prenom)} ${esc(e.nom)}</div>
    <div style="font-family:var(--f-display);font-size:22px;letter-spacing:-0.01em;margin-bottom:18px;">${fmtDateLong(d)}</div>

    <div class="form-grid">
      <div class="field full">
        <label class="field-label">Type</label>
        <div class="tab-switch" id="shType" data-active="${sh.type==='midi'?'0':sh.type==='soir'?'1':'2'}" style="grid-template-columns:1fr 1fr 1fr;">
          <button data-t="midi" class="${sh.type==='midi'?'active':''}">Midi</button>
          <button data-t="soir" class="${sh.type==='soir'?'active':''}">Soir</button>
          <button data-t="ar" class="${sh.type==='ar'?'active':''}">Journée</button>
        </div>
      </div>
      <div class="field">
        <label class="field-label">Début</label>
        <input class="input mono" id="shStart" type="time" value="${sh.start}">
      </div>
      <div class="field">
        <label class="field-label">Fin</label>
        <input class="input mono" id="shEnd" type="time" value="${sh.end}">
      </div>
      <div class="field full">
        <label class="field-label">Pause (minutes)</label>
        <input class="input mono" id="shPause" type="number" min="0" step="15" value="${sh.pauseDuration || 0}">
      </div>
      <div class="field full">
        <label class="field-label">Libellé (optionnel)</label>
        <input class="input" id="shLabel" placeholder="ex: Patron, Renfort..." value="${esc(sh.label || '')}">
      </div>
    </div>
  `;

  const footer = `
    ${existing.length ? `<button class="btn-danger" id="shDel">Supprimer</button>` : ''}
    <div class="spacer"></div>
    <button class="btn-sec" data-close>Annuler</button>
    <button class="btn-pri" id="shSave" style="width:auto;padding:10px 18px;">Enregistrer</button>
  `;

  const { close } = openModal({ title: 'Shift', body, footer });

  let chosenType = sh.type;
  $$('#shType [data-t]').forEach(b => b.addEventListener('click', e => {
    chosenType = e.target.dataset.t;
    $$('#shType [data-t]').forEach(x => x.classList.toggle('active', x === e.target));
    const idx = chosenType === 'midi' ? 0 : chosenType === 'soir' ? 1 : 2;
    $('#shType').setAttribute('data-active', idx);
  }));

  $('#shSave').addEventListener('click', () => {
    const newSh = {
      type: chosenType,
      start: $('#shStart').value,
      end: $('#shEnd').value,
      pauseDuration: parseInt($('#shPause').value) || 0,
      label: $('#shLabel').value.trim()
    };
    state.shifts[key] = [newSh];
    fbSave(`shifts/${key}`, [newSh]);
    toast('Shift enregistré', 'good');
    close();
    render();
  });

  if (existing.length) {
    $('#shDel').addEventListener('click', () => {
      delete state.shifts[key];
      fbSave(`shifts/${key}`, null);
      toast('Shift supprimé', '');
      close();
      render();
    });
  }
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
  const today = state.shifts[`${empId}_${dayIdx}_${wk}`] || [];
  const punches = state.punches[`${empId}_${iso}`] || [];
  const last = punches[punches.length-1];
  const ongoing = last && last.in && !last.out;

  let statusText = '';
  if (today.length === 0) statusText = `Aucun shift prévu aujourd'hui.`;
  else if (ongoing) statusText = `Pointé à ${last.in} — en service.`;
  else if (last && last.out) statusText = `Dernier pointage : ${last.in} → ${last.out}.`;
  else statusText = `Shift prévu : ${today[0].start} → ${today[0].end}.`;

  return `
    <div class="punch-card">
      <div class="punch-time" id="punchClock">${pad(now.getHours())}:${pad(now.getMinutes())}</div>
      <div class="punch-date">${now.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
      <div class="punch-status">${statusText}</div>
      ${ongoing
        ? `<button class="punch-btn" id="btnPunchOut">Pointer la sortie</button>`
        : (today.length > 0 || punches.length > 0)
          ? `<button class="punch-btn" id="btnPunchIn">Pointer l'entrée</button>`
          : `<button class="punch-btn" id="btnPunchIn">Pointer l'arrivée (hors planning)</button>`
      }
      ${punches.length ? `<button class="punch-btn secondary" id="btnSignal">Signaler une modification</button>` : ''}
    </div>

    ${today.length ? `
      <div class="panel">
        <div class="panel-head"><h3>Shift d'aujourd'hui</h3></div>
        <div class="panel-body">
          ${today.map(s => `
            <div class="row" style="justify-content:space-between;">
              <div>
                <div style="font-family:var(--f-mono);font-size:16px;">${s.start} → ${s.end}</div>
                <div class="text-mute" style="font-size:12px;margin-top:2px;">${esc(s.label || (s.type==='midi'?'Service midi':s.type==='soir'?'Service soir':'Journée'))}</div>
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
  const todayISO = dateISO(new Date());
  const wkEnd = addDays(state.weekStart, 6);

  let totalH = 0;
  const cards = [0,1,2,3,4,5,6].map(i => {
    const d = addDays(state.weekStart, i);
    const iso = dateISO(d);
    const shifts = state.shifts[`${empId}_${i}_${wk}`] || [];
    const isToday = iso === todayISO;
    const hours = shifts.reduce((s, sh) => s + shiftHours(sh), 0);
    totalH += hours;
    if (!shifts.length) {
      return `<div class="day-card off ${isToday?'today':''}">
        <div><div class="day-num">${d.getDate()}</div><div class="day-name">${DAYS_SHORT[i]}</div></div>
        <div class="day-info"><div class="day-shift">Repos</div></div>
      </div>`;
    }
    return shifts.map(s => `
      <div class="day-card ${isToday?'today':''}">
        <div><div class="day-num">${d.getDate()}</div><div class="day-name">${DAYS_SHORT[i]}</div></div>
        <div class="day-info">
          <div class="day-shift">${s.start} → ${s.end}</div>
          <div class="day-meta">${esc(s.label || (s.type==='midi'?'Service midi':s.type==='soir'?'Service soir':'Journée'))} · ${shiftHours(s).toFixed(1)} h</div>
        </div>
      </div>`).join('');
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

    ${cards}
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
