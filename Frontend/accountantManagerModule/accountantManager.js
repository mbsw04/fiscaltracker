// Accountant/Manager panel JS - derived from adminModule/admin.js with role-specific simplifications

// Set profile name from localStorage user object
window.addEventListener('DOMContentLoaded', () => {
    try {
        const user = JSON.parse(localStorage.getItem('user'));
        if (user && user.first_name && user.last_name) {
            document.getElementById('profileName').textContent = user.first_name + ' ' + user.last_name;
        } else if (user && user.first_name) {
            document.getElementById('profileName').textContent = user.first_name;
        }
    } catch (e) {}
    // Attach logout handler to clear user and redirect to login
    try {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (ev) => {
                ev.preventDefault && ev.preventDefault();
                showLogoutModal();
            });
        }
        // logo button should also prompt logout confirmation (consistent with admin)
        const logoBtn = document.getElementById('logoBtn');
        if (logoBtn) {
            logoBtn.addEventListener('click', (ev) => {
                ev.preventDefault && ev.preventDefault();
                showLogoutModal();
            });
        }
    } catch (e) {}
});

function showLogoutModal() {
    let modal = document.getElementById('logoutConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'logoutConfirmModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to log out?</p>
                <div class="modal-actions">
                    <button id="confirmLogoutBtn" class="confirm-btn">Log Out</button>
                    <button id="cancelLogoutBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#cancelLogoutBtn').addEventListener('click', () => { modal.style.display = 'none'; });
        modal.querySelector('#confirmLogoutBtn').addEventListener('click', () => { try { localStorage.removeItem('user'); } catch (e) {}; window.location.href = '../LoginModule/index.html'; });
    }
    modal.style.display = 'flex';
}

const actionContent = document.getElementById('actionContent');
const tabs = document.querySelectorAll('.tab-btn');
let ADMIN_ID = 1; // fallback
let CURRENT_ROLE = 'accountant';
try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) ADMIN_ID = user.id;
    if (user && user.role) CURRENT_ROLE = (user.role || '').toString().toLowerCase();
} catch (e) {}

// Helper: format number in accounting style (commas, two decimals, parentheses for negative)
function formatAccounting(value) {
    let n = 0;
    if (value === null || value === undefined || value === '') return '0.00';
    if (typeof value === 'number') n = value;
    else {
        n = parseFloat(String(value).replace(/[,()\s]/g, ''));
    }
    if (isNaN(n)) return String(value);
    const isNeg = n < 0;
    const abs = Math.abs(n).toFixed(2);
    const parts = abs.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    const formatted = parts.join('.');
    return isNeg ? `(${formatted})` : formatted;
}

// delegated tab click handler (limited to original tabs container)
const tabsContainer = (tabs && tabs.length && tabs[0].parentElement) ? tabs[0].parentElement : document;
document.addEventListener('click', (ev) => {
    const tab = ev.target.closest && ev.target.closest('.tab-btn');
    if (!tab) return;
    if (tabsContainer && !tabsContainer.contains(tab)) return;
    const prev = document.querySelector('.tab-btn.active'); if (prev && prev !== tab) prev.classList.remove('active');
    tab.classList.add('active');
    try { if (actionContent) actionContent.innerHTML = ''; } catch (e) {}
    try { updateContent(tab.getAttribute('data-tab')); } catch (e) { console.error('Error updating tab content', e); if (actionContent) actionContent.innerHTML = `<p style="color:red;">Error loading tab: ${e.message}</p>`; }
});

// initial load
updateContent('chartOfAccounts');

function updateContent(tab) {
    switch(tab) {
        case 'chartOfAccounts': loadChartOfAccounts(); break;
        case 'journal': loadJournal(); break;
        case 'eventLog': loadEventLog(); break;
        default: actionContent.innerHTML = '';
    }
}

// Topbar date/time clock: update every second
function startTopbarClock() {
    try {
        const el = document.getElementById('topbarDateTime');
        if (!el) return;
        function tick() {
            // Use locale string for readability
            el.textContent = new Date().toLocaleString();
        }
        tick(); // immediate
        // store the interval id on the element so it can be cleared if needed
        const existing = el.__topbarClockId;
        if (existing) clearInterval(existing);
        el.__topbarClockId = setInterval(tick, 1000);
    } catch (err) {
        console.error('topbar clock init failed', err);
    }
}

// start the clock once DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    startTopbarClock();
    initButtonTooltips();
});

// Add informative tooltips to buttons that are missing a title attribute.
function initButtonTooltips() {
    try {
        const commonMap = new Map([
            ['logoBtn', 'Go to home / logout'],
            ['logoutBtn', 'Log out of the application'],
            ['accountViewOk', 'Close account view'],
            ['closeEventModal', 'Close event details']
        ]);

        function applyTooltipToButton(btn) {
            if (!btn || !(btn instanceof HTMLElement) || btn.tagName !== 'BUTTON') return;
            if (btn.title && btn.title.trim().length) return;
            if (btn.id && commonMap.has(btn.id)) { btn.title = commonMap.get(btn.id); return; }
            if (btn.dataset && Object.keys(btn.dataset).length) {
                const entries = Object.entries(btn.dataset).map(([k,v]) => `${k.replace(/([A-Z])/g,' $1')}: ${v}`).join('; ');
                btn.title = btn.textContent.trim() ? `${btn.textContent.trim()} — ${entries}` : entries;
                return;
            }
            const cls = btn.className || '';
            if (cls.includes('acc-link')) { btn.title = 'View account details'; return; }
            if (cls.includes('event-id-link')) { btn.title = 'View event details'; return; }
            if (cls.includes('tab-btn')) { btn.title = `Switch to ${btn.getAttribute('data-tab') || btn.textContent.trim()} tab`; return; }
            const text = btn.textContent && btn.textContent.trim();
            if (text) btn.title = text;
        }

        // initial pass
        Array.from(document.querySelectorAll('button')).forEach(applyTooltipToButton);

        // observe dynamic additions
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
                    m.addedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement)) return;
                        if (node.tagName === 'BUTTON') applyTooltipToButton(node);
                        node.querySelectorAll && node.querySelectorAll('button') && Array.from(node.querySelectorAll('button')).forEach(applyTooltipToButton);
                    });
                }
            }
        });
        const target = document.getElementById('actionContent') || document.body;
        observer.observe(target, { childList: true, subtree: true });
    } catch (err) {
        console.error('initButtonTooltips failed', err);
    }
}

// ----------------------
// EVENT LOG TAB (accountant/manager)
// ----------------------
async function loadEventLog() {
    actionContent.innerHTML = `
        <h2>Event Log</h2>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
            <input id="eventLogSearch" placeholder="Filter by table, record id, action, or user" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
            <select id="eventLogFilterColumn" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                <option value="all">All Columns</option>
                <option value="table_name">Table</option>
                <option value="record_id">Record ID</option>
                <option value="action">Action</option>
                <option value="changed_by">Changed By</option>
            </select>
        </div>
        <div id="eventLogContainer">Loading event logs...</div>
    `;

    const container = document.getElementById('eventLogContainer');
    const searchEl = document.getElementById('eventLogSearch');
    const filterColEl = document.getElementById('eventLogFilterColumn');

    let events = [];
    let filterTerm = '';
    let filterCol = 'all';
    const sortState = { col: 'changed_at', asc: false };

    function parseMaybeJson(v) {
        if (v === null || v === undefined) return null;
        if (typeof v === 'object') return v;
        if (typeof v === 'string') {
            v = v.trim();
            if (!v) return null;
            try { return JSON.parse(v); } catch (e) { return v; }
        }
        return v;
    }

    function buildTableHtml(rows) {
        if (!rows || !rows.length) return '<p>No events found.</p>';
        let html = `<table class="event-log-table"><thead><tr>`;
        const cols = [
            { key: 'event_id', label: 'Event ID' },
            { key: 'table_name', label: 'Table' },
            { key: 'record_id', label: 'Record ID' },
            { key: 'action', label: 'Action' },
            { key: 'changed_by', label: 'Changed By' },
            { key: 'changed_at', label: 'Changed At' }
        ];
        cols.forEach(c => { html += `<th ${c.key !== 'event_id' ? 'class="sortable"' : ''} data-col="${c.key}">${c.label}` + (c.key !== 'event_id' ? ' <span style="font-size:0.8em; color:#666;">↕</span>' : '') + `</th>`; });
        html += `</tr></thead><tbody>`;
        rows.forEach(r => {
            html += `<tr data-event-id="${r.event_id}">`;
            html += `<td><button class="event-id-link action-link" data-event-id="${r.event_id}" style="background:none;border:none;color:#007bff;cursor:pointer;padding:0;margin:0;text-decoration:underline;">${r.event_id}</button></td>`;
            html += `<td>${r.table_name || ''}</td>`;
            html += `<td>${r.record_id || ''}</td>`;
            html += `<td>${r.action || ''}</td>`;
            html += `<td>${r.changed_by || ''}</td>`;
            html += `<td>${r.changed_at ? new Date(r.changed_at).toLocaleString() : ''}</td>`;
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    function render() {
        const term = (filterTerm || '').toString().toLowerCase();
        let rows = events.slice();
        if (term) {
            rows = rows.filter(r => {
                if (filterCol === 'all') {
                    return ['table_name','record_id','action','changed_by','event_id'].some(k => (String(r[k]||'')).toLowerCase().includes(term));
                }
                return (String(r[filterCol]||'')).toLowerCase().includes(term);
            });
        }
        if (sortState.col) {
            rows.sort((a,b) => {
                let A = a[sortState.col];
                let B = b[sortState.col];
                if (A === undefined || A === null) A = '';
                if (B === undefined || B === null) B = '';
                if (sortState.col === 'changed_at') {
                    A = new Date(A).getTime() || 0;
                    B = new Date(B).getTime() || 0;
                    return sortState.asc ? A - B : B - A;
                }
                const sA = String(A).toLowerCase();
                const sB = String(B).toLowerCase();
                if (sA < sB) return sortState.asc ? -1 : 1;
                if (sA > sB) return sortState.asc ? 1 : -1;
                return 0;
            });
        }
        container.innerHTML = buildTableHtml(rows);

        container.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.onclick = () => { const col = th.getAttribute('data-col'); if (sortState.col === col) sortState.asc = !sortState.asc; else { sortState.col = col; sortState.asc = true; } render(); };
        });

        container.querySelectorAll('.event-id-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.getAttribute('data-event-id');
                const ev = events.find(x => String(x.event_id) === String(id));
                if (!ev) { alert('Event not found'); return; }
                showEventModal(ev);
            });
        });
    }

    function showEventModal(ev) {
        let modal = document.getElementById('eventDetailModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'eventDetailModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="max-width:900px; width:95%;">
                    <h3>Event Details</h3>
                    <div style="display:flex; gap:12px; align-items:flex-start;">
                        <div style="flex:1;">
                            <h4 style="margin-bottom:6px;">Before</h4>
                            <pre id="eventBefore" style="background:#f7f7f7; padding:12px; border-radius:8px; max-height:60vh; overflow:auto; white-space:pre-wrap;"></pre>
                        </div>
                        <div style="flex:1;">
                            <h4 style="margin-bottom:6px;">After</h4>
                            <pre id="eventAfter" style="background:#f7f7f7; padding:12px; border-radius:8px; max-height:60vh; overflow:auto; white-space:pre-wrap;"></pre>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:center; margin-top:12px;">
                        <button id="closeEventModal" class="confirm-btn">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#closeEventModal').addEventListener('click', () => { modal.style.display = 'none'; });
        }

        const beforeEl = modal.querySelector('#eventBefore');
        const afterEl = modal.querySelector('#eventAfter');
        const before = parseMaybeJson(ev.before_image);
        const after = parseMaybeJson(ev.after_image);

        function diffObjects(a, b, path = '') {
            const changes = new Set();
            if (a === null || a === undefined || typeof a !== 'object' || b === null || b === undefined || typeof b !== 'object') {
                if (JSON.stringify(a) !== JSON.stringify(b)) changes.add(path || '$');
                return changes;
            }
            const keys = new Set([...Object.keys(a || {}), ...Object.keys(b || {})]);
            keys.forEach(k => {
                const nk = path ? `${path}.${k}` : k;
                const va = a ? a[k] : undefined;
                const vb = b ? b[k] : undefined;
                if (typeof va === 'object' && va !== null && typeof vb === 'object' && vb !== null) {
                    const sub = diffObjects(va, vb, nk);
                    sub.forEach(s => changes.add(s));
                } else {
                    if (JSON.stringify(va) !== JSON.stringify(vb)) changes.add(nk);
                }
            });
            return changes;
        }

        const changedPaths = diffObjects(before, after);

        function renderJsonWithHighlights(obj, changedSet) {
            if (obj === null || obj === undefined) return '(empty)';
            if (typeof obj === 'string' && (obj.trim().startsWith('{') || obj.trim().startsWith('['))) {
                try { obj = JSON.parse(obj); } catch (e) { /* leave as-is */ }
            }
            function walk(o, prefix = '') {
                if (o === null) return '(null)';
                if (typeof o !== 'object') return escapeHtml(String(o));
                if (Array.isArray(o)) {
                    return '[' + o.map((v, i) => walk(v, `${prefix}[${i}]`)).join(', ') + ']';
                }
                let parts = [];
                Object.keys(o).forEach(k => {
                    const p = prefix ? `${prefix}.${k}` : k;
                    const val = o[k];
                    const keyHtml = escapeHtml(k);
                    const valueHtml = (typeof val === 'object' && val !== null) ? walk(val, p) : escapeHtml(JSON.stringify(val));
                    const isChanged = Array.from(changedSet).some(ch => ch === p || ch.startsWith(p + '.'));
                    if (isChanged) {
                        parts.push(`<div style="margin-left:6px;"><span class="json-key-changed">"${keyHtml}"</span>: <span class="json-val-changed">${valueHtml}</span></div>`);
                    } else {
                        parts.push(`<div style="margin-left:6px;"><span class="json-key">"${keyHtml}"</span>: <span class="json-val">${valueHtml}</span></div>`);
                    }
                });
                return `<div>{${parts.join('')}<div>}</div>`;
            }
            try { return walk(obj); } catch (e) { return escapeHtml(JSON.stringify(obj, null, 2)); }
        }

        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        if (!document.getElementById('event-json-diff-styles')) {
            const style = document.createElement('style');
            style.id = 'event-json-diff-styles';
            style.innerHTML = `
                .json-key-changed { background: #fff3cd; padding: 2px 4px; border-radius:3px; }
                .json-val-changed { background: #ffe8a1; padding: 2px 4px; border-radius:3px; }
                .json-key { color: #333; font-weight:600; }
                .json-val { color: #111; }
                #eventBefore, #eventAfter { font-family: monospace; font-size: 0.9em; }
            `;
            document.head.appendChild(style);
        }

        try {
            if (before && typeof before === 'object') beforeEl.innerHTML = `<div style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(before, null, 2))}</div>`;
            else beforeEl.textContent = before ? String(before) : '(empty)';
        } catch (e) { beforeEl.textContent = String(before); }
        try {
            if (after && typeof after === 'object') {
                afterEl.innerHTML = renderJsonWithHighlights(after, changedPaths);
            } else {
                afterEl.textContent = after ? String(after) : '(empty)';
            }
        } catch (e) { afterEl.textContent = String(after); }
        modal.style.display = 'flex';
    }

    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_event_log_list', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: ADMIN_ID })
        });
        let data = await res.json();
        if (data && typeof data.body === 'string') {
            try { data = JSON.parse(data.body); } catch (e) { /* leave as-is */ }
        }
        if (Array.isArray(data)) events = data;
        else if (Array.isArray(data.rows)) events = data.rows;
        else if (Array.isArray(data.events)) events = data.events;
        else if (Array.isArray(data.body)) events = data.body;
        else if (Array.isArray(data.result)) events = data.result;
        else events = [];
    } catch (err) {
        container.innerHTML = `<p style="color:red;">Error loading event logs: ${err.message}</p>`;
        return;
    }

    searchEl.addEventListener('input', (e) => { filterTerm = e.target.value || ''; render(); });
    filterColEl.addEventListener('change', (e) => { filterCol = e.target.value || 'all'; render(); });

    render();
}

// Chart of Accounts — accountant/manager view: only active accounts, no actions, no create button
async function loadChartOfAccounts() {
    actionContent.innerHTML = `
        <h2>Chart of Accounts</h2>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
            <input id="accountsSearch" placeholder="Search by account number or name" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
        </div>
        <div id="accountsTablesContainer" style="margin-top:18px;"></div>
    `;

    const accountsContainer = document.getElementById('accountsTablesContainer');
    let accounts = [];
    let searchTerm = '';
    const sortState = { col: null, asc: true };

    async function fetchAccounts() {
        accountsContainer.innerHTML = '<p>Loading accounts...</p>';
        try {
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let data = await res.json();
            if (data && typeof data.body === 'string') {
                try { data = JSON.parse(data.body); } catch (e) {}
            }
            let rows = [];
            if (Array.isArray(data)) rows = data;
            else if (Array.isArray(data.rows)) rows = data.rows;
            else if (Array.isArray(data.accounts)) rows = data.accounts;
            else if (Array.isArray(data.body)) rows = data.body;
            rows = (rows || []).map(r => ({ ...r, is_active: r.is_active === 1 || r.is_active === true || String(r.is_active) === 'true' }));
            accounts = rows.filter(a => a.is_active);
            render();
        } catch (err) {
            accountsContainer.innerHTML = `<p style="color:red;">Error loading accounts: ${err.message}</p>`;
        }
    }

    function buildTable(rows) {
        if (!rows.length) return '<p>No active accounts.</p>';
        let html = `<table class="accounts-table"><thead><tr>`;
        const cols = [
            { key: 'account_number', label: 'Account Number' },
            { key: 'account_name', label: 'Account Name' },
            { key: 'category', label: 'Category' },
            { key: 'subcategory', label: 'Subcategory' },
            { key: 'balance', label: 'Balance' },
            { key: 'statement', label: 'Statement' },
            { key: 'description', label: 'Description' }
        ];
        cols.forEach(c => { html += `<th class="sortable" data-col="${c.key}">${c.label} <span style="font-size:0.8em;color:#666;">↕</span></th>`; });
        html += `</tr></thead><tbody>`;
        rows.forEach(r => {
            html += `<tr data-account-number="${r.account_number}">`;
            // render account number and name as clickable links (reuse same data-account-number)
            const accNum = r.account_number || '';
            const accName = r.account_name || '';
            html += `<td><button class="acc-link action-link" data-account-number="${accNum}" style="background:none;border:none;color:#007bff;cursor:pointer;padding:0;margin:0;font-size:0.95em;text-decoration:underline;">${accNum}</button></td>`;
            html += `<td><button class="acc-link action-link" data-account-number="${accNum}" style="background:none;border:none;color:#007bff;cursor:pointer;padding:0;margin:0;font-size:0.95em;text-decoration:underline;">${accName}</button></td>`;
            html += `<td>${r.category || ''}</td>`;
            html += `<td>${r.subcategory || ''}</td>`;
            html += `<td>${(r.balance !== undefined && r.balance !== null) ? formatAccounting(r.balance) : '0.00'}</td>`;
            html += `<td>${r.statement || ''}</td>`;
            html += `<td>${r.description ? String(r.description).slice(0,120) : ''}</td>`;
            html += `</tr>`;
        });
        html += `</tbody></table>`;
        return html;
    }

    function render() {
        const term = (searchTerm || '').toLowerCase();
        let rows = accounts.slice();
        if (term) rows = rows.filter(a => ((a.account_number||'') + ' ' + (a.account_name||'')).toLowerCase().includes(term));
        if (sortState.col) {
            rows.sort((a,b) => {
                const A = (a[sortState.col] === null || a[sortState.col] === undefined) ? '' : String(a[sortState.col]).toLowerCase();
                const B = (b[sortState.col] === null || b[sortState.col] === undefined) ? '' : String(b[sortState.col]).toLowerCase();
                if (!isNaN(parseFloat(A)) && !isNaN(parseFloat(B))) return sortState.asc ? parseFloat(A)-parseFloat(B) : parseFloat(B)-parseFloat(A);
                if (A < B) return sortState.asc ? -1 : 1;
                if (A > B) return sortState.asc ? 1 : -1;
                return 0;
            });
        }
        accountsContainer.innerHTML = buildTable(rows);
        accountsContainer.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.onclick = () => { const col = th.getAttribute('data-col'); if (sortState.col === col) sortState.asc = !sortState.asc; else { sortState.col = col; sortState.asc = true; } render(); };
        });
        // attach click listeners for account number/name links to open account modal
        accountsContainer.querySelectorAll('.acc-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const acct = e.currentTarget.getAttribute('data-account-number');
                showAccountModal(acct);
            });
        });
    }

    const searchEl = document.getElementById('accountsSearch');
    if (searchEl) {
        searchEl.addEventListener('input', (e) => { searchTerm = (e.target.value || '').trim(); render(); });
    }

    await fetchAccounts();
}

// Journal tab: show role-specific placeholder for accountant vs manager
async function loadJournal() {
    if (CURRENT_ROLE === 'manager') {
        actionContent.innerHTML = `<h2>Journal - Manager View</h2><p>Manager-specific journal features go here (placeholder).</p>`;
    } else {
        actionContent.innerHTML = `<h2>Journal - Accountant View</h2><p>Accountant-specific journal features go here (placeholder).</p>`;
    }
}

// Simple account details modal (reuse behavior from admin module)
function showAccountModal(accountNumber) {
    // The accounts for this module live in the closure of loadChartOfAccounts (accounts variable) —
    // fall back to fetching a lightweight placeholder if not available here.
    // Try to find the account in any tables present on the page.
    let acc = null;
    try {
        // Search DOM rows for a matching data-account-number attribute
        const el = document.querySelector(`[data-account-number='${accountNumber}']`);
        if (el) {
            // gather fields from cells (best effort)
            const cells = el.querySelectorAll('td');
            acc = { account_number: accountNumber };
            if (cells && cells.length) {
                // cell positions: account_number (0), account_name (1), category (2), subcategory (3), balance (4), statement (5), description (6)
                acc.account_number = cells[0] ? cells[0].textContent.trim() : accountNumber;
                acc.account_name = cells[1] ? cells[1].textContent.trim() : '';
                acc.category = cells[2] ? cells[2].textContent.trim() : '';
                acc.subcategory = cells[3] ? cells[3].textContent.trim() : '';
                acc.balance = cells[4] ? cells[4].textContent.trim() : '';
                acc.statement = cells[5] ? cells[5].textContent.trim() : '';
                acc.description = cells[6] ? cells[6].textContent.trim() : '';
            }
        }
    } catch (e) { acc = null; }

    if (!acc) {
        // Best-effort fallback: show a minimal modal indicating the account number
        acc = { account_number: accountNumber, account_name: '', category: '', subcategory: '', balance: '', statement: '', description: '' };
    }

    let modal = document.getElementById('accountViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'accountViewModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Account Details</h3>
                <div id="accountViewBody" style="min-width:320px;"></div>
                <div style="display:flex; justify-content:center; margin-top:12px;">
                    <button id="accountViewOk" class="confirm-btn">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#accountViewOk').addEventListener('click', () => { modal.style.display = 'none'; });
    }

    const bodyDiv = modal.querySelector('#accountViewBody');
    bodyDiv.innerHTML = `
        <p><strong>Account Number:</strong> ${acc.account_number || ''}</p>
        <p><strong>Account Name:</strong> ${acc.account_name || ''}</p>
        <p><strong>Category:</strong> ${acc.category || ''}</p>
        <p><strong>Subcategory:</strong> ${acc.subcategory || ''}</p>
    <p><strong>Balance:</strong> ${acc.balance ? formatAccounting(acc.balance) : ''}</p>
        <p><strong>Statement:</strong> ${acc.statement || ''}</p>
        <p><strong>Description:</strong> ${acc.description ? String(acc.description).slice(0,400) : ''}</p>
    `;

    modal.style.display = 'flex';
}
