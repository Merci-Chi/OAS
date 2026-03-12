
// ============================================================
// OASENSE DEV PANEL — DEV.js
// Targets: https://merci-chi.github.io/OAS/DEV
// ============================================================

// ── Auth ────────────────────────────────────────────────────
const USERS = {
  DEV:   { code: 'test23', role: 'admin' },
  KIARA: { code: 'duke23', role: 'user'  },
  SOL:   { code: 'sol23',  role: 'user'  }
};
const OVERRIDE = { user: 'DEV', code: 'mems01' };
let currentUser = null;

// ── Storage helpers ─────────────────────────────────────────
const store = {
  get: (k, def = []) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } },
  set: (k, v)        => localStorage.setItem(k, JSON.stringify(v)),
  obj: (k, def = {}) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } }
};

// ── LIVE DATABASE SYNC ─────────────────────────────────────
async function syncToDatabase(key, data) {
  try {
    await fetch('https://merci-chi.github.io/OAS/database.json', {
      method: 'POST', // or 'PUT' depending on your backend
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: data })
    });
    console.log(`Synced ${key} to database.json`);
  } catch (e) {
    console.error(`Failed to sync ${key}:`, e);
  }
}

// ── USER ROLE + BADGE SYSTEM ─────────────────────────────
function getUserBadge(name){
  if(!name) return 'USER';
  const n = name.toLowerCase();

  if(n.includes('kiara')) return 'DEV';
  if(n.includes('sol')) return 'OWNER';
  if(n.includes('swift agent')) return 'HACKER';

  return 'USER';
}

// ── CRM LINK ─────────────────────────────────────────────
function getOrCreateCRM(name,email=''){
  const crm = store.get(K.crm);

  let user = crm.find(c=>c.email===email || c.name===name);

  if(!user){
    user={
      id:'CRM'+Math.floor(Math.random()*100000),
      name,
      email,
      badge:getUserBadge(name),
      createdAt:new Date().toISOString(),
      lastSeen:null,
      logs:[]
    };

    crm.unshift(user);
    store.set(K.crm,crm);
  }

  return user;
}

// ── AUDIT LOGGER ─────────────────────────────────────────
function logAction(userName,action,ref=''){
  const crm = store.get(K.crm);
  const user = crm.find(c=>c.name===userName);

  if(!user) return;

  const now = new Date();

  const log={
    time:now.toLocaleString(),
    action,
    ref
  };

  if(!user.logs) user.logs=[];
  user.logs.unshift(log);

  user.lastSeen = now.toISOString();

  store.set(K.crm,crm);
}

// ── Keys ────────────────────────────────────────────────────
const K = {
  bookings:    'oas_bookings',
  crm:         'oas_crm',
  shop:        'oas_shop',
  orders:      'oas_orders',
  invoices:    'oas_invoices',
  testimonials:'oas_testimonials',
  blog:        'oas_blog',
  users:       'oas_users',
  sol:         'oas_sol_config',
  donations:   'oas_donations',
  newsletter:  'oas_newsletter',
  portfolio:   'oas_portfolio',
  about:       'oas_about'
};

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const saved = sessionStorage.getItem('oas_session');
  if (saved) { currentUser = JSON.parse(saved); showPanel(); }
  else        { showLogin(); }
});

// ══════════════════════════════════════════════════════════
// LOGIN
// ══════════════════════════════════════════════════════════
function showLogin() {
  document.body.innerHTML = `
  <div id="login-wrap">
    <div id="login-box">
      <div class="login-logo">OAS</div>
      <h2>DEV PANEL</h2>
      <input id="l-user" placeholder="USERNAME" autocomplete="off">
      <input id="l-code" type="password" placeholder="ACCESS CODE">
      <button onclick="doLogin()">ENTER</button>
      <p id="l-err"></p>
    </div>
  </div>`;
  document.getElementById('l-code').addEventListener('keydown', e => e.key === 'Enter' && doLogin());
}

function doLogin() {
  const u = document.getElementById('l-user').value.trim().toUpperCase();
  const c = document.getElementById('l-code').value.trim();
  const err = document.getElementById('l-err');
  if ((u === OVERRIDE.user && c === OVERRIDE.code) ||
      (USERS[u] && USERS[u].code === c)) {
    currentUser = { username: u, role: USERS[u]?.role || 'admin' };
    sessionStorage.setItem('oas_session', JSON.stringify(currentUser));
      // CRM logging
  const user = getOrCreateCRM(currentUser.username);
  logAction(currentUser.username, 'Login / Logout');

    showPanel();
  } else {
    err.textContent = 'Invalid credentials.';
  }
}
function logout() {
  sessionStorage.removeItem('oas_session');
  currentUser = null;
  showLogin();
}

// ══════════════════════════════════════════════════════════
// PANEL SHELL
// ══════════════════════════════════════════════════════════
const SECTIONS = [
  { id:'bookings',     label:'Bookings',     icon:'📅', group:'Operations' },
  { id:'crm',          label:'CRM',          icon:'👥', group:'Operations' },
  { id:'shop',         label:'Shop',         icon:'🛍️', group:'Operations' },
  { id:'orders',       label:'Orders',       icon:'📦', group:'Operations' },
  { id:'invoices',     label:'Invoices',     icon:'🧾', group:'Operations' },
  { id:'testimonials', label:'Testimonials', icon:'⭐', group:'Operations' },
  { id:'blog',         label:'Blog',         icon:'✍️', group:'Content'    },
  { id:'portfolio',    label:'Portfolio',    icon:'🖼️', group:'Content'    },
  { id:'about',        label:'About',        icon:'ℹ️', group:'Content'    },
  { id:'ai_prompts',   label:'AI Prompts',   icon:'🤖', group:'Tools'      },
  { id:'donations',    label:'Donations',    icon:'💝', group:'Revenue'    },
  { id:'newsletter',   label:'Newsletter',   icon:'📧', group:'Revenue'    },
  { id:'users',        label:'Users',        icon:'🔒', group:'Admin'      }
];

function showPanel() {
  const groups = [...new Set(SECTIONS.map(s => s.group))];
  const nav = groups.map(g => `
    <div class="nav-group">
      <div class="nav-group-label">${g}</div>
      ${SECTIONS.filter(s => s.group === g).map(s => `
        <div class="nav-item" id="nav-${s.id}" onclick="navigate('${s.id}')">
          <span class="nav-icon">${s.icon}</span>${s.label}
        </div>`).join('')}
    </div>`).join('');

  document.body.innerHTML = `
  <div id="panel-wrap">
    <aside id="sidebar">
      <div class="sidebar-logo">OAS</div>
      <div class="sidebar-user">${currentUser.username}</div>
      <nav>${nav}</nav>
      <button class="logout-btn" onclick="logout()">LOG OUT</button>
    </aside>
    <main id="main-content"><div class="loading">Select a section</div></main>
  </div>
  <div id="modal-overlay" onclick="closeModal()" style="display:none"></div>
  <div id="modal-box" style="display:none"></div>`;

  navigate('bookings');
}

function navigate(id) {
  document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
  const nav = document.getElementById('nav-' + id);
  if (nav) nav.classList.add('active');
  const fn = window['render_' + id];
  if (fn) fn();
  else document.getElementById('main-content').innerHTML = `<div class="section-header"><h1>${id.toUpperCase()}</h1></div><p style="padding:1rem;opacity:.5">Coming soon</p>`;
}

function openModal(html) {
  document.getElementById('modal-overlay').style.display = 'block';
  const box = document.getElementById('modal-box');
  box.style.display = 'block';
  box.innerHTML = html;
}
function closeModal() {
  document.getElementById('modal-overlay').style.display = 'none';
  document.getElementById('modal-box').style.display = 'none';
}

// ── Helpers ──────────────────────────────────────────────────
const uid    = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const fmtDate= d  => new Date(d).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
const fmtAmt = n  => '$' + parseFloat(n || 0).toFixed(2);

function toast(msg, type = 'success') {
  const t = document.createElement('div');
  t.className = 'toast toast-' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function confirmDel(msg, cb) {
  if (confirm(msg)) cb();
}

// ══════════════════════════════════════════════════════════
// BOOKINGS
// ══════════════════════════════════════════════════════════
function render_bookings() {
  const items = store.get(K.bookings);
  const mc    = document.getElementById('main-content');
  mc.innerHTML = `
  <div class="section-header">
    <h1>📅 BOOKINGS</h1>
    <button class="btn-primary" onclick="openBookingForm()">+ NEW BOOKING</button>
  </div>
  <div class="card-grid" id="bookings-grid"></div>`;
  renderBookingCards(items);
}

function renderBookingCards(items) {
  const grid = document.getElementById('bookings-grid');
  if (!grid) return;
  if (!items.length) { grid.innerHTML = '<p class="empty">No bookings yet.</p>'; return; }
  grid.innerHTML = items.map(b => `
  <div class="card">
    <div class="card-header">
      <span class="badge badge-${b.status?.toLowerCase() || 'pending'}">${b.status || 'Pending'}</span>
      <span class="card-date">${fmtDate(b.date)}</span>
    </div>
    <h3>${b.name}</h3>
    <p>${b.email || ''} ${b.phone ? '· ' + b.phone : ''}</p>
    <p><strong>Type:</strong> ${b.type || '—'}</p>
    <p><strong>Notes:</strong> ${b.notes || '—'}</p>
    <div class="card-actions">
      <button class="btn-sm" onclick="editBooking('${b.id}')">Edit</button>
      <button class="btn-sm btn-danger" onclick="deleteBooking('${b.id}')">Delete</button>
    </div>
  </div>`).join('');
}

function openBookingForm(id) {
  const items = store.get(K.bookings);
  const b = id ? items.find(x => x.id === id) : {};
  openModal(`
  <h2>${id ? 'Edit' : 'New'} Booking</h2>
  <label>Name<input id="bf-name" value="${b.name||''}"></label>
  <label>Email<input id="bf-email" value="${b.email||''}"></label>
  <label>Phone<input id="bf-phone" value="${b.phone||''}"></label>
  <label>Type<input id="bf-type" value="${b.type||''}"></label>
  <label>Date<input type="date" id="bf-date" value="${b.date||''}"></label>
  <label>Status
    <select id="bf-status">
      ${['Pending','Confirmed','Completed','Cancelled'].map(s=>`<option ${b.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
  </label>
  <label>Notes<textarea id="bf-notes">${b.notes||''}</textarea></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveBooking('${id||''}')">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveBooking(id) {
  const items = store.get(K.bookings);
  const data  = {
    id:    id || uid(),
    name:  document.getElementById('bf-name').value,
    email: document.getElementById('bf-email').value,
    phone: document.getElementById('bf-phone').value,
    type:  document.getElementById('bf-type').value,
    date:  document.getElementById('bf-date').value,
    status:document.getElementById('bf-status').value,
    notes: document.getElementById('bf-notes').value
  };
  logAction(currentUser.username,'Scheduled Photoshoot',data.id);
  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.bookings, items);
  closeModal(); render_bookings(); toast('Booking saved');
}

function editBooking(id) { openBookingForm(id); }
function deleteBooking(id) {
  confirmDel('Delete this booking?', () => {
    store.set(K.bookings, store.get(K.bookings).filter(x=>x.id!==id));
    render_bookings(); toast('Deleted', 'error');
  });
}

// ══════════════════════════════════════════════════════════
// CRM
// ══════════════════════════════════════════════════════════
function render_crm() {
  const items = store.get(K.crm);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>👥 CRM</h1>
    <button class="btn-primary" onclick="openCRMForm()">+ NEW CONTACT</button>
  </div>
  <input id="crm-search" class="search-input" placeholder="Search contacts…" oninput="filterCRM(this.value)">
  <div class="card-grid" id="crm-grid"></div>`;
  renderCRMCards(items);
}

function renderCRMCards(items) {
  const grid = document.getElementById('crm-grid');
  if (!grid) return;
  if (!items.length) { grid.innerHTML = '<p class="empty">No contacts yet.</p>'; return; }
  grid.innerHTML = items.map(c => `
  <div class="card">
    <h3>${c.name}</h3>
    <p>${c.email || ''}</p>
    <p>${c.phone || ''}</p>
    <p><strong>Tags:</strong> ${(c.tags||[]).join(', ') || '—'}</p>
    <p class="crm-notes">${c.notes || ''}</p>
    <div class="card-actions">
      <button class="btn-sm" onclick="openCRMForm('${c.id}')">Edit</button>
      <button class="btn-sm btn-danger" onclick="deleteCRM('${c.id}')">Delete</button>
    </div>
  </div>`).join('');
}

function filterCRM(q) {
  const items = store.get(K.crm).filter(c =>
    (c.name+c.email+c.phone+(c.tags||[]).join('')).toLowerCase().includes(q.toLowerCase()));
  renderCRMCards(items);
}

function openCRMForm(id) {
  const items = store.get(K.crm);
  const c = id ? items.find(x=>x.id===id) : {};
  openModal(`
  <h2>${id?'Edit':'New'} Contact</h2>
  <label>Name<input id="cf-name" value="${c.name||''}"></label>
  <label>Email<input id="cf-email" value="${c.email||''}"></label>
  <label>Phone<input id="cf-phone" value="${c.phone||''}"></label>
  <label>Tags (comma separated)<input id="cf-tags" value="${(c.tags||[]).join(', ')}"></label>
  <label>Notes<textarea id="cf-notes">${c.notes||''}</textarea></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveCRM('${id||''}')">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveCRM(id) {
  const items = store.get(K.crm);
  const data  = {
    id:    id || uid(),
    name:  document.getElementById('cf-name').value,
    email: document.getElementById('cf-email').value.toLowerCase().trim(),
    phone: document.getElementById('cf-phone').value,
    tags:  document.getElementById('cf-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    notes: document.getElementById('cf-notes').value,
    createdAt: id ? items.find(x=>x.id===id)?.createdAt : new Date().toISOString()
  };
  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.crm, items);
  closeModal(); render_crm(); toast('Contact saved');
}

function deleteCRM(id) {
  confirmDel('Delete this contact?', () => {
    store.set(K.crm, store.get(K.crm).filter(x=>x.id!==id));
    render_crm(); toast('Deleted', 'error');
  });
}

function openCRMByEmail(email) {
  const crm = store.get(K.crm);
  const c = crm.find(x => x.email?.toLowerCase() === email?.toLowerCase());
  if (!c) return toast('Not in CRM', 'error');
  openModal(`
  <h2>CRM — ${c.name}</h2>
  <p><strong>Email:</strong> ${c.email}</p>
  <p><strong>Phone:</strong> ${c.phone||'—'}</p>
  <p><strong>Tags:</strong> ${(c.tags||[]).join(', ')||'—'}</p>
  <p><strong>Notes:</strong> ${c.notes||'—'}</p>
  <div class="modal-actions">
    <button class="btn-primary" onclick="openCRMForm('${c.id}');closeModal()">Edit</button>
    <button onclick="closeModal()">Close</button>
  </div>`);
}

// ══════════════════════════════════════════════════════════
// SHOP
// ══════════════════════════════════════════════════════════
let shopTab = 'ALL';

function render_shop() {
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>🛍️ SHOP</h1>
    <button class="btn-primary" onclick="openShopForm()">+ ADD ITEM</button>
  </div>
  <div class="promo-slots-preview" id="promo-preview"></div>
  <div class="tab-row">
    ${['ALL','PROMO','LIVE','DRAFT'].map(t=>`
      <button class="tab-btn ${shopTab===t?'active':''}" onclick="setShopTab('${t}')">${t}</button>`).join('')}
  </div>
  <div class="card-grid" id="shop-grid"></div>`;
  renderPromoSlots();
  renderShopCards();
}

function setShopTab(t) { shopTab = t; render_shop(); }

function renderPromoSlots() {
  const all   = store.get(K.shop);
  const promos= all.filter(x=>x.status==='Promo').slice(0,4);
  const slots = [...promos, ...Array(4-promos.length).fill(null)];
  const el    = document.getElementById('promo-preview');
  if (!el) return;
  el.innerHTML = `<div class="promo-label">LIVE SITE PROMO SLOTS (4 max)</div><div class="promo-slots">${
    slots.map((p,i) => p
      ? `<div class="promo-slot filled"><span>${p.name}</span><small>${fmtAmt(p.price)}</small></div>`
      : `<div class="promo-slot empty"><span>SLOT ${i+1}</span><small>Empty</small></div>`
    ).join('')}</div>`;
}

function renderShopCards() {
  const grid = document.getElementById('shop-grid');
  if (!grid) return;
  let items = store.get(K.shop).sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt));
  if (shopTab === 'PROMO') items = items.filter(x=>x.status==='Promo').slice(0,4);
  else if (shopTab === 'LIVE')  items = items.filter(x=>x.status==='Live');
  else if (shopTab === 'DRAFT') items = items.filter(x=>x.status==='Draft');
  if (!items.length) { grid.innerHTML = '<p class="empty">No items here.</p>'; return; }
  grid.innerHTML = items.map(item => `
  <div class="card">
    ${item.image ? `<img src="${item.image}" class="card-img" alt="${item.name}">` : '<div class="card-img-placeholder">No image</div>'}
    <div class="card-header">
      <span class="badge badge-${(item.status||'draft').toLowerCase()}">${item.status||'Draft'}</span>
      <span>${fmtAmt(item.price)}</span>
    </div>
    <h3>${item.name}</h3>
    <p>${item.description||''}</p>
    <p><strong>Badge:</strong> ${item.badge||'—'}</p>
    <div class="card-actions">
      <button class="btn-sm" onclick="openShopForm('${item.id}')">Edit</button>
      <button class="btn-sm btn-danger" onclick="deleteShopItem('${item.id}')">Delete</button>
    </div>
  </div>`).join('');
}

function openShopForm(id) {
  const items = store.get(K.shop);
  const s = id ? items.find(x=>x.id===id) : {};
  openModal(`
  <h2>${id?'Edit':'Add'} Shop Item</h2>
  <label>Name<input id="sf-name" value="${s.name||''}"></label>
  <label>Price<input id="sf-price" type="number" step="0.01" value="${s.price||''}"></label>
  <label>Description<textarea id="sf-desc">${s.description||''}</textarea></label>
  <label>Badge
    <select id="sf-badge">
      ${['','NEW','SALE','BESTSELLER','LIMITED'].map(b=>`<option ${s.badge===b?'selected':''}>${b}</option>`).join('')}
    </select>
  </label>
  <label>Status
    <select id="sf-status">
      ${['Live','Draft','Promo'].map(st=>`<option ${s.status===st?'selected':''}>${st}</option>`).join('')}
    </select>
  </label>
  <label>Image URL<input id="sf-image" value="${s.image||''}"></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveShopItem('${id||''}')">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveShopItem(id) {
  const items = store.get(K.shop);
  const data = {
  id: id || uid(),
  name: document.getElementById('sf-name').value,
  price: document.getElementById('sf-price').value,
  description: document.getElementById('sf-desc').value,
  badge: document.getElementById('sf-badge').value,
  status: document.getElementById('sf-status').value,
  image: document.getElementById('sf-image').value,
  createdAt: id ? items.find(x => x.id === id)?.createdAt : new Date().toISOString()
};

// Optional audit logs for admin actions
if (id) {
  logAction(currentUser.username, 'Admin Action - Updated Item Price', data.id);
  logAction(currentUser.username, 'Admin Action - Modified Inventory Quantity', data.id);
} else {
  logAction(currentUser.username, 'Admin Action - Added New Item to Store', data.id);
}

  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);

  store.set(K.shop, items);

  // AUDIT LOG
  if (id) logAction(currentUser.username, 'Admin Action - Updated Item Price', data.id);
  else logAction(currentUser.username, 'Admin Action - Added New Item to Store', data.id);

  closeModal(); 
  render_shop(); 
  toast('Item saved');
}
  
function deleteShopItem(id) {
  confirmDel('Delete this item?', () => {
    store.set(K.shop, store.get(K.shop).filter(x=>x.id!==id));
    render_shop(); toast('Deleted', 'error');
  });
}

// ══════════════════════════════════════════════════════════
// ORDERS
// ══════════════════════════════════════════════════════════
function render_orders() {
  const items = store.get(K.orders);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header"><h1>📦 ORDERS</h1></div>
  <div class="card-grid">
    ${!items.length ? '<p class="empty">No orders yet.</p>' : items.map(o=>`
    <div class="card">
      <div class="card-header">
        <span class="badge badge-${(o.status||'pending').toLowerCase()}">${o.status||'Pending'}</span>
        <span class="card-date">${fmtDate(o.date)}</span>
      </div>
      <h3>#${o.id?.slice(-6).toUpperCase()}</h3>
      <p>${o.customer}</p>
      <p>${o.items?.map(i=>`${i.name} x${i.qty}`).join(', ')||'—'}</p>
      <p><strong>Total:</strong> ${fmtAmt(o.total)}</p>
    </div>`).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════════
// INVOICES
// ══════════════════════════════════════════════════════════
function render_invoices() {
  const items = store.get(K.invoices);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>🧾 INVOICES</h1>
    <button class="btn-primary" onclick="openInvoiceForm()">+ NEW INVOICE</button>
  </div>
  <div class="card-grid" id="inv-grid"></div>`;
  const grid = document.getElementById('inv-grid');
  if (!items.length) { grid.innerHTML='<p class="empty">No invoices yet.</p>'; return; }
  grid.innerHTML = items.map(inv=>`
  <div class="card">
    <div class="card-header">
      <span class="badge badge-${(inv.status||'unpaid').toLowerCase()}">${inv.status||'Unpaid'}</span>
      <span class="card-date">${fmtDate(inv.date)}</span>
    </div>
    <h3>${inv.client}</h3>
    <p>${fmtAmt(inv.amount)}</p>
    <p>${inv.description||''}</p>
    <div class="card-actions">
      <button class="btn-sm" onclick="toggleInvoicePaid('${inv.id}')">
        ${inv.status==='Paid'?'Mark Unpaid':'Mark Paid'}
      </button>
      <button class="btn-sm btn-danger" onclick="deleteInvoice('${inv.id}')">Delete</button>
    </div>
  </div>`).join('');
}

function openInvoiceForm() {
  openModal(`
  <h2>New Invoice</h2>
  <label>Client<input id="if-client"></label>
  <label>Amount<input id="if-amount" type="number" step="0.01"></label>
  <label>Description<textarea id="if-desc"></textarea></label>
  <label>Date<input type="date" id="if-date" value="${new Date().toISOString().split('T')[0]}"></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveInvoice()">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveInvoice() {
  const items = store.get(K.invoices);
  items.unshift({
    id: uid(),
    client: document.getElementById('if-client').value,
    amount: document.getElementById('if-amount').value,
    description: document.getElementById('if-desc').value,
    date: document.getElementById('if-date').value,
    status: 'Unpaid'
  });
  store.set(K.invoices, items);
  closeModal(); render_invoices(); toast('Invoice created');
}

function toggleInvoicePaid(id) {
  const items = store.get(K.invoices);
  const inv   = items.find(x=>x.id===id);
  if (inv) inv.status = inv.status==='Paid' ? 'Unpaid' : 'Paid';
  store.set(K.invoices, items);
  render_invoices();
}

function deleteInvoice(id) {
  confirmDel('Delete invoice?', () => {
    store.set(K.invoices, store.get(K.invoices).filter(x=>x.id!==id));
    render_invoices(); toast('Deleted','error');
  });
}

// ══════════════════════════════════════════════════════════
// TESTIMONIALS
// ══════════════════════════════════════════════════════════
function render_testimonials() {
  const items = store.get(K.testimonials);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>⭐ TESTIMONIALS</h1>
    <button class="btn-primary" onclick="openTestForm()">+ ADD</button>
  </div>
  <div class="card-grid">
    ${!items.length ? '<p class="empty">No testimonials yet.</p>' : items.map(t=>`
    <div class="card">
      <div class="stars">${'★'.repeat(t.rating||5)}</div>
      <p>"${t.quote}"</p>
      <h4>— ${t.name}</h4>
      <p class="card-date">${fmtDate(t.date)}</p>
      <div class="card-actions">
        <button class="btn-sm btn-danger" onclick="deleteTesti('${t.id}')">Delete</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function openTestForm() {
  openModal(`
  <h2>New Testimonial</h2>
  <label>Name<input id="tf-name"></label>
  <label>Rating (1-5)<input id="tf-rating" type="number" min="1" max="5" value="5"></label>
  <label>Quote<textarea id="tf-quote"></textarea></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveTesti()">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveTesti() {
  const items = store.get(K.testimonials);
  items.unshift({ id:uid(), name:document.getElementById('tf-name').value, rating:document.getElementById('tf-rating').value, quote:document.getElementById('tf-quote').value, date:new Date().toISOString() });
  store.set(K.testimonials, items);
  closeModal(); render_testimonials(); toast('Testimonial saved');
}

function deleteTesti(id) {
  confirmDel('Delete testimonial?', () => {
    store.set(K.testimonials, store.get(K.testimonials).filter(x=>x.id!==id));
    render_testimonials(); toast('Deleted','error');
  });
}

// ══════════════════════════════════════════════════════════
// BLOG
// ══════════════════════════════════════════════════════════
const BLOG_CATS = ['MINDSET','PHOTOGRAPHY','CREATIVE LIFE','MUSIC','BUSINESS'];

function render_blog() {
  const items = store.get(K.blog);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>✍️ BLOG</h1>
    <button class="btn-primary" onclick="openBlogForm()">+ NEW POST</button>
  </div>
  <div class="card-grid" id="blog-grid"></div>`;
  renderBlogCards(items);
}

function renderBlogCards(items) {
  const grid = document.getElementById('blog-grid');
  if (!grid) return;
  if (!items.length) { grid.innerHTML='<p class="empty">No posts yet.</p>'; return; }
  grid.innerHTML = items.map(p=>`
  <div class="card">
    ${p.coverImage ? `<img src="${p.coverImage}" class="card-img" alt="${p.title}">` : ''}
    <div class="card-header">
      <span class="badge badge-cat">${p.category||'UNCATEGORIZED'}</span>
      <span class="badge badge-${p.status==='Live'?'live':'draft'}">${p.status||'Draft'}</span>
    </div>
    <h3>${p.title}</h3>
    <p class="card-date">${fmtDate(p.date)}</p>
    <p>${(p.excerpt||p.content||'').slice(0,100)}…</p>
    <div class="card-actions">
      <button class="btn-sm" onclick="openBlogForm('${p.id}')">Edit</button>
      <button class="btn-sm btn-danger" onclick="deleteBlog('${p.id}')">Delete</button>
    </div>
  </div>`).join('');
}

function openBlogForm(id) {
  const items = store.get(K.blog);
  const p = id ? items.find(x=>x.id===id) : {};
  const savedCats = store.get('oas_blog_cats', BLOG_CATS);
  const allCats = [...new Set([...BLOG_CATS, ...savedCats])];
  openModal(`
  <h2>${id?'Edit':'New'} Post</h2>
  <label>Title<input id="bg-title" value="${p.title||''}"></label>
  <label>Category</label>
  <div class="cat-chips" id="cat-chips">
    ${allCats.map(c=>`<span class="cat-chip ${p.category===c?'selected':''}" onclick="selectBlogCat('${c}', event)">${c}</span>`).join('')}
  </div>
  <input id="bg-cat-input" placeholder="Custom category…" oninput="this.value=this.value.toUpperCase()">
  <button class="btn-sm" onclick="addCustomCat()">+ Add</button>
  <input type="hidden" id="bg-category" value="${p.category||''}">
  <label>Status
    <select id="bg-status">
      ${['Draft','Live'].map(s=>`<option ${p.status===s?'selected':''}>${s}</option>`).join('')}
    </select>
  </label>
  <label>Cover Image URL<input id="bg-image" value="${p.coverImage||''}"></label>
  <label>Excerpt<input id="bg-excerpt" value="${p.excerpt||''}"></label>
  <label>Content<textarea id="bg-content" rows="8">${p.content||''}</textarea></label>
  <button class="btn-sm" onclick="aiEnhanceBlog()">✨ AI Enhance</button>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveBlog('${id||''}')">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function selectBlogCat(c, e) {
  e.stopPropagation();
  document.querySelectorAll('.cat-chip').forEach(el => el.classList.remove('selected'));
  e.currentTarget.classList.add('selected');
  document.getElementById('bg-category').value = c;
}

function addCustomCat() {
  const input = document.getElementById('bg-cat-input');
  const cat   = input.value.trim().toUpperCase();
  if (!cat) return;
  const chips = document.getElementById('cat-chips');
  const chip  = document.createElement('span');
  chip.className = 'cat-chip selected';
  chip.textContent = cat;
  chip.onclick = () => selectBlogCat(cat);
  chips.querySelectorAll('.cat-chip').forEach(el=>el.classList.remove('selected'));
  chips.appendChild(chip);
  document.getElementById('bg-category').value = cat;
  input.value = '';
  const saved = store.get('oas_blog_cats', BLOG_CATS);
  if (!saved.includes(cat)) { saved.push(cat); store.set('oas_blog_cats', saved); }
}

async function aiEnhanceBlog() {
  const content = document.getElementById('bg-content').value;
  const title   = document.getElementById('bg-title').value;
  const cat     = document.getElementById('bg-category').value;
  if (!content) { toast('Add some content first','error'); return; }
  const btn = event.target;
  btn.textContent = '⏳ Enhancing…'; btn.disabled = true;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role:'user', content:`Enhance this blog post for OASENSE creative studio. Category: ${cat||'general'}. Title: "${title}". Make it engaging, polished, and on-brand for a creative professional. Return only the improved content text:\n\n${content}` }]
      })
    });
    const data = await res.json();
    document.getElementById('bg-content').value = data.content?.[0]?.text || content;
    toast('AI enhanced!');
  } catch(e) { toast('AI error','error'); }
  btn.textContent = '✨ AI Enhance'; btn.disabled = false;
}

function saveBlog(id) {
  const items = store.get(K.blog);
  const data  = {
    id:         id || uid(),
    title:      document.getElementById('bg-title').value,
    category:   document.getElementById('bg-category').value || 'UNCATEGORIZED',
    status:     document.getElementById('bg-status').value,
    coverImage: document.getElementById('bg-image').value,
    excerpt:    document.getElementById('bg-excerpt').value,
    content:    document.getElementById('bg-content').value,
    date:       id ? items.find(x=>x.id===id)?.date : new Date().toISOString()
  };
  if (id) { const i=items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.blog, items);
  closeModal(); render_blog(); toast('Post saved');
}

function deleteBlog(id) {
  confirmDel('Delete post?', () => {
    store.set(K.blog, store.get(K.blog).filter(x=>x.id!==id));
    render_blog(); toast('Deleted','error');
  });
}

// ══════════════════════════════════════════════════════════
// PORTFOLIO
// ══════════════════════════════════════════════════════════
function render_portfolio() {
  const p = store.obj(K.portfolio);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header"><h1>🖼️ PORTFOLIO</h1></div>
  <p class="section-note">Media set here powers the live site portfolio section.</p>
  <div class="portfolio-sections">
    ${renderPortfolioSection('portraits', 'Cinematic Portraits', p.portraits||[], 'photo', true)}
    ${renderPortfolioSection('digitalart', 'Digital Art Originals', p.digitalart||[], 'photo', true)}
    ${renderPortfolioSection('video', 'Video Content', p.video||[], 'video', false)}
    ${renderPortfolioSection('branding', 'Branding Identity', p.branding||[], 'photo', false)}
    ${renderPortfolioSection('editorial', 'Lifestyle Editorial', p.editorial||[], 'both', false)}
  </div>`;
}

function renderPortfolioSection(key, label, items, type, arrows) {
  const urls = items.map((url,i)=>`
    <div class="port-item">
      ${type==='video'||url?.match(/\.(mp4|webm|mov)$/i) 
        ? `<video src="${url}" class="port-media" loop muted onmouseenter="this.play()" onmouseleave="this.pause()"></video>`
        : `<img src="${url}" class="port-media" alt="${label}">`}
      <button class="btn-sm btn-danger port-del" onclick="removePortfolioItem('${key}',${i})">✕</button>
    </div>`).join('');
  return `
  <div class="port-section">
    <h3>${label}</h3>
    <div class="port-grid" id="port-${key}">${urls || '<p class="empty">No media</p>'}</div>
    <div class="port-add">
      <input id="port-url-${key}" placeholder="${type==='video'?'Video':'Image'} URL…">
      <button class="btn-sm btn-primary" onclick="addPortfolioItem('${key}','${type}')">+ Add</button>
    </div>
  </div>`;
}

function addPortfolioItem(key, type) {
  const url = document.getElementById(`port-url-${key}`).value.trim();
  if (!url) { toast('Enter a URL','error'); return; }
  const p = store.obj(K.portfolio);
  if (!p[key]) p[key] = [];
  p[key].push(url);
  store.set(K.portfolio, p);
  render_portfolio();
}

function removePortfolioItem(key, idx) {
  const p = store.obj(K.portfolio);
  p[key].splice(idx, 1);
  store.set(K.portfolio, p);
  render_portfolio();
}

// ══════════════════════════════════════════════════════════
// ABOUT
// ══════════════════════════════════════════════════════════
function render_about() {
  const a = store.obj(K.about);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header"><h1>ℹ️ ABOUT OASENSE</h1></div>
  <p class="section-note">This data feeds the "About Oasense" section on the live site.</p>
  <div class="about-form">
    <label>Photo / Video URL
      <input id="ab-media" value="${a.media||''}" placeholder="https://…">
    </label>
    <label>Quote
      <input id="ab-quote" value="${a.quote||''}" placeholder="Inspirational quote…">
    </label>
    <label>Description
      <textarea id="ab-desc" rows="6">${a.description||''}</textarea>
    </label>
    <button class="btn-primary" onclick="saveAbout()">Save</button>
  </div>`;
}

function saveAbout() {
  store.set(K.about, {
    media:       document.getElementById('ab-media').value,
    quote:       document.getElementById('ab-quote').value,
    description: document.getElementById('ab-desc').value
  });
  toast('About saved');
}

// ══════════════════════════════════════════════════════════
// AI PROMPTS
// ══════════════════════════════════════════════════════════
function render_ai_prompts() {
  const items = store.get('oas_ai_prompts');
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>🤖 AI PROMPTS</h1>
    <button class="btn-primary" onclick="openPromptForm()">+ NEW PROMPT</button>
  </div>
  <div class="card-grid">
    ${!items.length ? '<p class="empty">No prompts saved.</p>' : items.map(pr=>`
    <div class="card">
      <h3>${pr.name}</h3>
      <p>${pr.prompt.slice(0,120)}…</p>
      <div class="card-actions">
        <button class="btn-sm" onclick="usePrompt('${pr.id}')">Use</button>
        <button class="btn-sm btn-danger" onclick="deletePrompt('${pr.id}')">Delete</button>
      </div>
    </div>`).join('')}
  </div>`;
}

function openPromptForm() {
  openModal(`
  <h2>New AI Prompt</h2>
  <label>Name<input id="pf-name"></label>
  <label>Prompt<textarea id="pf-prompt" rows="6"></textarea></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="savePrompt()">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function savePrompt() {
  const items = store.get('oas_ai_prompts');
  items.unshift({ id:uid(), name:document.getElementById('pf-name').value, prompt:document.getElementById('pf-prompt').value });
  store.set('oas_ai_prompts', items);
  closeModal(); render_ai_prompts(); toast('Prompt saved');
}

function deletePrompt(id) {
  confirmDel('Delete prompt?', () => {
    store.set('oas_ai_prompts', store.get('oas_ai_prompts').filter(x=>x.id!==id));
    render_ai_prompts(); toast('Deleted','error');
  });
}

function usePrompt(id) {
  const pr = store.get('oas_ai_prompts').find(x=>x.id===id);
  if (!pr) return;
  openModal(`
  <h2>${pr.name}</h2>
  <textarea id="use-prompt-text" rows="6" style="width:100%">${pr.prompt}</textarea>
  <label>Your Input<textarea id="use-prompt-input" rows="4" style="width:100%" placeholder="Add context here…"></textarea></label>
  <div id="use-prompt-result" style="margin-top:1rem;padding:1rem;background:#111;border-radius:8px;min-height:60px;white-space:pre-wrap"></div>
  <div class="modal-actions">
    <button class="btn-primary" onclick="runPrompt()">▶ Run</button>
    <button onclick="closeModal()">Close</button>
  </div>`);
}

async function runPrompt() {
  const prompt = document.getElementById('use-prompt-text').value;
  const input  = document.getElementById('use-prompt-input').value;
  const result = document.getElementById('use-prompt-result');
  result.textContent = '⏳ Running…';
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ model:'claude-sonnet-4-20250514', max_tokens:1000, messages:[{role:'user',content:`${prompt}\n\n${input}`}] })
    });
    const data = await res.json();
    result.textContent = data.content?.[0]?.text || 'No response';
  } catch(e) { result.textContent = 'Error: ' + e.message; }
}

// ══════════════════════════════════════════════════════════
// DONATIONS
// ══════════════════════════════════════════════════════════
function render_donations() {
  const items = store.get(K.donations);
  const total = items.reduce((s,d)=>s+parseFloat(d.amount||0),0);
  const avg   = items.length ? (total/items.length) : 0;
  document.getElementById('main-content').innerHTML = `
  <div class="section-header">
    <h1>💝 DONATIONS</h1>
    <button class="btn-primary" onclick="openDonationForm()">+ ADD MANUALLY</button>
  </div>
  <div class="stats-row">
    <div class="stat-card"><div class="stat-num">${fmtAmt(total)}</div><div class="stat-label">Total Raised</div></div>
    <div class="stat-card"><div class="stat-num">${items.length}</div><div class="stat-label">Total Donations</div></div>
    <div class="stat-card"><div class="stat-num">${fmtAmt(avg)}</div><div class="stat-label">Avg Donation</div></div>
  </div>
  <div class="card-grid" id="donations-grid"></div>`;
  renderDonationCards(items);
}

function renderDonationCards(items) {
  const grid = document.getElementById('donations-grid');
  if (!grid) return;
  if (!items.length) { grid.innerHTML='<p class="empty">No donations yet.</p>'; return; }
  const crm = store.get(K.crm);
  grid.innerHTML = [...items].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(d=>{
    const inCRM = d.email && crm.find(c=>c.email?.toLowerCase()===d.email?.toLowerCase());
    const pts   = Math.floor(parseFloat(d.amount||0)*10);
    return `
    <div class="card">
      <div class="card-header">
        <span class="badge badge-live">${fmtAmt(d.amount)}</span>
        <span class="card-date">${fmtDate(d.date)}</span>
      </div>
      <h3>${d.anonymous ? 'Anonymous' : (d.name||'Unknown')}</h3>
      ${d.email ? `<p>${d.email} ${inCRM?`<button class="btn-sm" onclick="openCRMByEmail('${d.email}')">CRM</button>`:''}</p>` : ''}
      <p><strong>Points earned:</strong> ${pts} pts</p>
      ${d.comment ? `<p class="card-note">"${d.comment}"</p>` : ''}
      <div class="card-actions">
        <button class="btn-sm btn-danger" onclick="deleteDonation('${d.id}')">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function openDonationForm() {
  openModal(`
  <h2>Add Donation</h2>
  <label>Amount ($)<input id="df-amount" type="number" min="10" step="1" value="10"></label>
  <label>Name<input id="df-name" placeholder="Optional"></label>
  <label>Email<input id="df-email" placeholder="Optional"></label>
  <label><input type="checkbox" id="df-anon"> Anonymous</label>
  <label>Comment<textarea id="df-comment"></textarea></label>
  <div class="modal-actions">
    <button class="btn-primary" onclick="saveDonation()">Save</button>
    <button onclick="closeModal()">Cancel</button>
  </div>`);
}

function saveDonation() {
  const items = store.get(K.donations);
  const email = document.getElementById('df-email').value.trim().toLowerCase();
  items.unshift({
    id:        uid(),
    amount:    document.getElementById('df-amount').value,
    name:      document.getElementById('df-name').value,
    email,
    anonymous: document.getElementById('df-anon').checked,
    comment:   document.getElementById('df-comment').value,
    date:      new Date().toISOString()
  });
  store.set(K.donations, items);
// Auto-add to CRM if email provided and not already in CRM
if (email) {
  const crm = store.get(K.crm);
  const exists = crm.some(c => c.email?.toLowerCase() === email);
  if (!exists) {
    crm.unshift({
      id: uid(),
      name: document.getElementById('df-name').value || 'Donor',
      email: email,
      phone: '',
      tags: ['DONOR'],
      notes: document.getElementById('df-comment').value,
      createdAt: new Date().toISOString()
    });
    store.set(K.crm, crm);
  }
}
render_donations();
closeModal();
toast('Donation saved');

// Public function called from live site donation form
window.submitDonation = function(data) {
  const items = store.get(K.donations);
  items.unshift({ id:uid(), ...data, date:new Date().toISOString() });
  store.set(K.donations, items);
  if (data.email && !data.anonymous) autoAddToCRM(data.email, data.name);
};

// ══════════════════════════════════════════════════════════
// NEWSLETTER
// ══════════════════════════════════════════════════════════
function render_newsletter() {
  const subs    = store.get(K.newsletter);
  const crm     = store.get(K.crm);
  document.getElementById('main-content').innerHTML = `
  <div class="section-header"><h1>📧 NEWSLETTER</h1></div>
  <div class="newsletter-layout">
    <div class="newsletter-compose">
      <h3>Draft Email</h3>
      <label>Subject<input id="nl-subject" placeholder="Subject…"></label>
      <label>Content<textarea id="nl-content" rows="8" placeholder="Write your email…"></textarea></label>
      <div class="nl-actions">
        <button class="btn-sm" onclick="aiEnhanceNewsletter()">✨ AI Enhance</button>
        <button class="btn-primary" onclick="sendNewsletter()">📤 Send to All Subscribers</button>
      </div>
    </div>
    <div class="newsletter-subs">
      <h3>Subscribers (${subs.length})</h3>
      <div id="subs-list">
        ${!subs.length ? '<p class="empty">No subscribers yet.</p>' : [...subs].sort((a,b)=>new Date(b.date)-new Date(a.date)).map(s=>{
          const inCRM = crm.find(c=>c.email?.toLowerCase()===s.email?.toLowerCase());
          return `<div class="sub-row">
            <div>
              <strong>${s.email}</strong>
              <small>${fmtDate(s.date)}</small>
            </div>
            <div class="sub-actions">
              ${inCRM?`<button class="btn-sm" onclick="openCRMByEmail('${s.email}')">CRM</button>`:''}
              <button class="btn-sm btn-danger" onclick="deleteSub('${s.id}')">✕</button>
            </div>
          </div>`;
        }).join('')}
      </div>
    </div>
  </div>`;
}

async function aiEnhanceNewsletter() {
  const content = document.getElementById('nl-content').value;
  if (!content) { toast('Add content first','error'); return; }
  const btn = event.target;
  btn.textContent = '⏳ Enhancing…'; btn.disabled = true;
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens:1000,
        messages:[{role:'user',content:`Enhance this newsletter email for OASENSE creative studio. Make it engaging, warm, and on-brand. Return only the improved email body:\n\n${content}`}]
      })
    });
    const data = await res.json();
    document.getElementById('nl-content').value = data.content?.[0]?.text || content;
    toast('AI enhanced!');
  } catch(e) { toast('AI error','error'); }
  btn.textContent = '✨ AI Enhance'; btn.disabled = false;
}

function sendNewsletter() {
  const subs    = store.get(K.newsletter);
  const subject = document.getElementById('nl-subject').value;
  const body    = document.getElementById('nl-content').value;
  if (!subs.length) { toast('No subscribers','error'); return; }
  if (!subject)     { toast('Add a subject','error'); return; }
  const emails = subs.map(s=>s.email).join(',');
  window.location.href = `mailto:${emails}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function deleteSub(id) {
  confirmDel('Remove subscriber?', () => {
    store.set(K.newsletter, store.get(K.newsletter).filter(x=>x.id!==id));
    render_newsletter(); toast('Removed','error');
  });
}

// Public function called from live site newsletter form
window.subscribeEmail = function(email) {
  const subs = store.get(K.newsletter);
  if (subs.find(s=>s.email?.toLowerCase()===email?.toLowerCase())) return;
  subs.unshift({ id:uid(), email:email.toLowerCase().trim(), date:new Date().toISOString() });
  store.set(K.newsletter, subs);
  autoAddToCRM(email, '');
};

// ══════════════════════════════════════════════════════════
// USERS
// ══════════════════════════════════════════════════════════
function render_users() {
  if (currentUser.role !== 'admin') {
    document.getElementById('main-content').innerHTML = '<p style="padding:2rem;opacity:.5">Admin only.</p>';
    return;
  }
  const items = store.get(K.users, Object.entries(USERS).map(([u,v])=>({id:uid(),username:u,role:v.role})));
  document.getElementById('main-content').innerHTML = `
  <div class="section-header"><h1>🔒 USERS</h1></div>
  <div class="card-grid">
    ${items.map(u=>`
    <div class="card">
      <h3>${u.username}</h3>
      <p><strong>Role:</strong> ${u.role}</p>
    </div>`).join('')}
  </div>`;
}

// ══════════════════════════════════════════════════════════
// EXPOSE to live site (cross-origin localStorage sharing)
// ══════════════════════════════════════════════════════════
window.OAS_DEV = {
  getShopPromo:     () => store.get(K.shop).filter(x=>x.status==='Promo').slice(0,4),
  getShopLive:      () => store.get(K.shop).filter(x=>x.status==='Live'),
  getBlogLive:      () => store.get(K.blog).filter(x=>x.status==='Live').sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,3),
  getPortfolio:     () => store.obj(K.portfolio),
  getAbout:         () => store.obj(K.about),
  submitDonation:   window.submitDonation,
  subscribeEmail:   window.subscribeEmail
};

// ── LIVE DATABASE SYNC ─────────────────────────────────────
async function syncToDatabase(key, data) {
  try {
    // Replace with your actual backend endpoint or path
    // e.g., '/database.json' if using a server endpoint
    await fetch('https://merci-chi.github.io/OAS/database.json', {
      method: 'POST', // or 'PUT' depending on your server setup
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: data })
    });
    console.log(`Synced ${key} to database.json`);
  } catch (e) {
    console.error(`Failed to sync ${key}:`, e);
  }
}

function saveBooking(id) {
  const items = store.get(K.bookings);
  const data  = {
    id:    id || uid(),
    name:  document.getElementById('bf-name').value,
    email: document.getElementById('bf-email').value,
    phone: document.getElementById('bf-phone').value,
    type:  document.getElementById('bf-type').value,
    date:  document.getElementById('bf-date').value,
    status:document.getElementById('bf-status').value,
    notes: document.getElementById('bf-notes').value
  };
  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.bookings, items);
  syncToDatabase(K.bookings, items); // <-- SYNC
  closeModal(); render_bookings(); toast('Booking saved');
}

function saveShopItem(id) {
  const items = store.get(K.shop);
  const status= document.getElementById('sf-status').value;
  if (status === 'Promo') {
    const promoCount = items.filter(x=>x.status==='Promo' && x.id!==id).length;
    if (promoCount >= 4) { toast('Max 4 PROMO slots!', 'error'); return; }
  }
  const data = {
    id: id || uid(),
    name: document.getElementById('sf-name').value,
    price: document.getElementById('sf-price').value,
    description: document.getElementById('sf-desc').value,
    badge: document.getElementById('sf-badge').value,
    status,
    image: document.getElementById('sf-image').value,
    createdAt: id ? items.find(x=>x.id===id)?.createdAt : new Date().toISOString()
  };
  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.shop, items);
  syncToDatabase(K.shop, items); // <-- SYNC
  closeModal(); render_shop(); toast('Item saved');
}

function saveCRM(id) {
  const items = store.get(K.crm);
  const data  = {
    id:    id || uid(),
    name:  document.getElementById('cf-name').value,
    email: document.getElementById('cf-email').value.toLowerCase().trim(),
    phone: document.getElementById('cf-phone').value,
    tags:  document.getElementById('cf-tags').value.split(',').map(t=>t.trim()).filter(Boolean),
    notes: document.getElementById('cf-notes').value,
    createdAt: id ? items.find(x=>x.id===id)?.createdAt : new Date().toISOString()
  };
  if (id) { const i = items.findIndex(x=>x.id===id); items[i]=data; }
  else items.unshift(data);
  store.set(K.crm, items);
  syncToDatabase(K.crm, items); // <-- SYNC
  closeModal(); render_crm(); toast('Contact saved');
}

function saveDonation() {
  const items = store.get(K.donations);
  const donation = {
    id: uid(),
    amount: parseFloat(document.getElementById('df-amount').value) || 0,
    name: document.getElementById('df-name').value,
    email: document.getElementById('df-email').value,
    anonymous: document.getElementById('df-anon').checked,
    comment: document.getElementById('df-comment').value,
    date: new Date().toISOString()
  };
  items.unshift(donation);
  store.set(K.donations, items);
  closeModal();
  render_donations();
  toast('Donation saved');
}
  items.unshift({
    id:        uid(),
    amount:    document.getElementById('df-amount').value,
    name:      document.getElementById('df-name').value,
    email,
    anonymous: document.getElementById('df-anon').checked,
    comment:   document.getElementById('df-comment').value,
    date:      new Date().toISOString()
  });
  store.set(K.donations, items);
  syncToDatabase(K.donations, items); // <-- SYNC
  render_donations(); toast('Donation added');
}

store.set(KEY, DATA);
syncToDatabase(KEY, DATA);
