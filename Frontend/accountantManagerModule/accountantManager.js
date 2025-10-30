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
                <button type="button" id="closeLogoutModal" class="modal-close-x">&times;</button>
                <h3>Confirm Logout</h3>
                <p>Are you sure you want to log out?</p>
                <div class="modal-actions">
                    <button id="confirmLogoutBtn" class="confirm-btn">Log Out</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#closeLogoutModal').addEventListener('click', () => { modal.style.display = 'none'; });
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
                <div class="modal-content" style="max-width:1200px; width:95%;">
                    <button type="button" id="closeEventModalX" class="modal-close-x">&times;</button>
                    <h3>Event Details</h3>
                    <div style="display:flex; gap:16px; align-items:flex-start;">
                        <div style="flex:1;">
                            <h4 style="margin-bottom:6px;">Before</h4>
                            <div id="eventBefore" style="background:#f7f7f7; padding:8px; border-radius:8px; max-height:60vh; overflow:auto;"></div>
                        </div>
                        <div style="flex:1;">
                            <h4 style="margin-bottom:6px;">After</h4>
                            <div id="eventAfter" style="background:#f7f7f7; padding:8px; border-radius:8px; max-height:60vh; overflow:auto;"></div>
                        </div>
                    </div>
                    <div style="display:flex; justify-content:center; margin-top:12px;">
                        <button id="closeEventModal" class="confirm-btn">Close</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#closeEventModal').addEventListener('click', () => { modal.style.display = 'none'; });
            modal.querySelector('#closeEventModalX').addEventListener('click', () => { modal.style.display = 'none'; });
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

        // Helper to render object as table
        function renderObjectAsTable(obj, changedPaths, isAfter = false) {
            if (!obj || typeof obj !== 'object') return `<p>${obj ? String(obj) : '(empty)'}</p>`;
            
            let tableHtml = '<table style="width:100%; border-collapse:collapse; font-size:0.9em;">';
            tableHtml += '<thead><tr><th style="border:1px solid #ddd; padding:6px; background:#f5f5f5;">Field</th><th style="border:1px solid #ddd; padding:6px; background:#f5f5f5;">Value</th></tr></thead><tbody>';
            
            Object.keys(obj).forEach(key => {
                const value = obj[key];
                const isChanged = changedPaths.has(key);
                const keyStyle = isChanged && isAfter ? 'background:#fff3cd; font-weight:bold;' : '';
                const valueStyle = isChanged && isAfter ? 'background:#ffe8a1;' : '';
                
                let displayValue = value;
                if (typeof value === 'object' && value !== null) {
                    displayValue = JSON.stringify(value, null, 1);
                } else if (typeof value === 'string' && value.length > 100) {
                    displayValue = value.substring(0, 100) + '...';
                }
                
                tableHtml += `<tr>
                    <td style="border:1px solid #ddd; padding:6px; font-weight:600; ${keyStyle}">${escapeHtml(key)}</td>
                    <td style="border:1px solid #ddd; padding:6px; ${valueStyle}">${escapeHtml(String(displayValue))}</td>
                </tr>`;
            });
            
            tableHtml += '</tbody></table>';
            return tableHtml;
        }

        try {
            // Render before as table (no highlight)
            beforeEl.innerHTML = renderObjectAsTable(before, changedPaths, false);
        } catch (e) { beforeEl.textContent = String(before); }
        try {
            // Render after as table with highlights for changed keys
            afterEl.innerHTML = renderObjectAsTable(after, changedPaths, true);
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
            <input id="accountsSearch" placeholder="Search accounts (all fields)" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
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
        if (term) {
            rows = rows.filter(a => {
                const searchableFields = [
                    a.account_number,
                    a.account_name,
                    a.category,
                    a.subcategory,
                    a.balance,
                    a.statement
                ];
                return searchableFields.some(field => 
                    (field !== null && field !== undefined) && 
                    String(field).toLowerCase().includes(term)
                );
            });
        }
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

// Journal tab: show role-specific journal entries view
async function loadJournal() {
    actionContent.innerHTML = `
        <h2>Journal Entries</h2>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
            <input id="journalSearch" placeholder="Search journal entries (account, amount, date)" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
            <select id="journalFilterStatus" style="padding:8px; border-radius:8px; border:1px solid #ccc;">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
            </select>
            <label style="display:flex;align-items:center;gap:6px">From: <input id="journalFilterFrom" type="date" style="padding:6px;border-radius:6px;border:1px solid #ccc"></label>
            <label style="display:flex;align-items:center;gap:6px">To: <input id="journalFilterTo" type="date" style="padding:6px;border-radius:6px;border:1px solid #ccc"></label>
            <button id="newJournalEntryBtn" class="confirm-btn primary-green">New Journal Entry</button>
        </div>
        <div id="journalTableContainer">Loading journal entries...</div>
    `;

    const container = document.getElementById('journalTableContainer');
    const searchEl = document.getElementById('journalSearch');
    const filterStatusEl = document.getElementById('journalFilterStatus');
    let entries = [];
    let searchTerm = '';
    let statusFilter = 'all';
    const sortState = { col: 'date', asc: false };

    async function fetchJournalEntries() {
        try {
            const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            
            if (!response.ok) throw new Error('Failed to fetch journal entries');
            let data = await response.json();
            if (data && typeof data.body === 'string') {
                try { data = JSON.parse(data.body); } catch (e) {}
            }
            entries = Array.isArray(data) ? data : 
                     Array.isArray(data.body) ? data.body :
                     Array.isArray(data.transactions) ? data.transactions : [];
            // normalize some fields to make client usage easier
            entries = entries.map(e => ({
                ...e,
                date: e.created_at || e.date || e.createdAt || e.created_at,
                credit_account_names: e.credit_account_names || e.credit_account_names || '',
                debit_account_names: e.debit_account_names || e.debit_account_names || '',
                credit_amounts_array: e.credit_amounts_array || e.credit_amounts_array || (e.credit ? String(e.credit).split(',').map(x=>parseFloat(x)) : []),
                debit_amounts_array: e.debit_amounts_array || e.debit_amounts_array || (e.debit ? String(e.debit).split(',').map(x=>parseFloat(x)) : []),
                status: (e.status || 'pending').toString().toLowerCase()
            }));
            render();
        } catch (err) {
            console.error('Error fetching journal entries:', err);
            container.innerHTML = 'Error loading journal entries. Please try again.';
        }
    }

    function buildTable(rows) {
        if (!rows.length) return '<p>No journal entries found.</p>';
        
        return `
        <table>
            <thead>
                <tr>
                    <th class="sortable" data-col="date">Date</th>
                    <th class="sortable" data-col="description">Description</th>
                    <th class="sortable" data-col="account">Account</th>
                    <th class="sortable" data-col="debit">Debit</th>
                    <th class="sortable" data-col="credit">Credit</th>
                    <th class="sortable" data-col="status">Status</th>
                    ${CURRENT_ROLE === 'manager' ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${rows.map(entry => `
                    <tr data-id="${entry.id}">
                        <td>${new Date(entry.date).toLocaleDateString()}</td>
                        <td>${entry.description || ''}</td>
                        <td>${(entry.debit_account_names || entry.debit_account_names) || ''} ${(entry.credit_account_names ? (' / ' + entry.credit_account_names) : '')}</td>
                        <td style="text-align:right">${(entry.debit_amounts_array && entry.debit_amounts_array.length) ? entry.debit_amounts_array.map(a=>formatAccounting(a)).join(', ') : ''}</td>
                        <td style="text-align:right">${(entry.credit_amounts_array && entry.credit_amounts_array.length) ? entry.credit_amounts_array.map(a=>formatAccounting(a)).join(', ') : ''}</td>
                        <td>${(entry.status || 'pending')}</td>
                        ${CURRENT_ROLE === 'manager' ? `
                            <td style="white-space:nowrap">
                                ${entry.status === 'pending' ? `
                                    <button onclick="editJournalEntry(${entry.id})" class="action-btn" style="background:#4CAF50;color:white;margin-right:4px;">Edit</button>
                                    <button onclick="approveJournalEntry(${entry.id})" class="approve-btn action-btn" style="background:#2e7d32;color:#fff;margin-right:4px">Approve</button>
                                    <button onclick="rejectJournalEntry(${entry.id})" class="reject-btn action-btn" style="background:#f44336;color:#fff">Reject</button>
                                ` : ''}
                            </td>
                        ` : ''}
                    </tr>
                `).join('')}
            </tbody>
        </table>
        `;
    }

    function showEditModal(entry) {
        let modal = document.getElementById('journalEditModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'journalEditModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="min-width:400px">
                    <button type="button" id="closeJournalEditModal" class="modal-close-x">&times;</button>
                    <h3>Edit Journal Entry</h3>
                    <form id="journalEditForm">
                        <input type="hidden" name="id" id="editJournalId">
                        <div style="margin-bottom:12px">
                            <label style="display:block;margin-bottom:4px">Description</label>
                            <textarea name="description" id="editJournalDescription" style="width:100%;min-height:60px" required></textarea>
                        </div>
                        <div style="margin-bottom:12px">
                            <label style="display:block;margin-bottom:4px">Account</label>
                            <input type="text" name="account" id="editJournalAccount" style="width:100%" readonly>
                        </div>
                        <div style="display:flex;gap:12px;margin-bottom:12px">
                            <div style="flex:1">
                                <label style="display:block;margin-bottom:4px">Debit</label>
                                <input type="number" name="debit" id="editJournalDebit" step="0.01" min="0">
                            </div>
                            <div style="flex:1">
                                <label style="display:block;margin-bottom:4px">Credit</label>
                                <input type="number" name="credit" id="editJournalCredit" step="0.01" min="0">
                            </div>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:20px">
                            <button type="button" class="cancel-btn" id="cancelJournalEdit">Cancel</button>
                            <button type="submit" class="confirm-btn">Save Changes</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            
            modal.querySelector('#closeJournalEditModal').addEventListener('click', () => modal.style.display = 'none');
            modal.querySelector('#cancelJournalEdit').addEventListener('click', () => modal.style.display = 'none');
            
            modal.querySelector('#journalEditForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = {
                    id: formData.get('id'),
                    description: formData.get('description'),
                    debit: parseFloat(formData.get('debit')) || 0,
                    credit: parseFloat(formData.get('credit')) || 0
                };
                
                try {
                    const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_edit_trans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            admin_id: ADMIN_ID,
                            ...data
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to update journal entry');
                    
                    modal.style.display = 'none';
                    await fetchJournalEntries(); // Refresh the table
                } catch (err) {
                    console.error('Error updating journal entry:', err);
                    alert('Failed to update journal entry. Please try again.');
                }
            });
        }

        // Populate form with entry data
        modal.querySelector('#editJournalId').value = entry.id;
        modal.querySelector('#editJournalDescription').value = entry.description || '';
        modal.querySelector('#editJournalAccount').value = `${entry.account_number} - ${entry.account_name || ''}`;
        modal.querySelector('#editJournalDebit').value = entry.debit || '';
        modal.querySelector('#editJournalCredit').value = entry.credit || '';
        
        modal.style.display = 'flex';
    }

    // Add global function for edit button click
    window.editJournalEntry = (id) => {
        const entry = entries.find(e => e.id === id);
        if (entry) showEditModal(entry);
    };

    // Approve helper (calls AA_approve_trans)
    window.approveJournalEntry = async (id) => {
        if (!confirm('Approve this journal entry? This will update account balances.')) return;
        try {
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_approve_trans', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ manager_id: ADMIN_ID, trans_id: id })
            });
            if (!res.ok) throw new Error('Approval failed');
            await fetchJournalEntries();
        } catch (err) {
            console.error('Error approving transaction', err);
            alert('Failed to approve transaction: ' + (err.message || ''));
        }
    };

    // Reject helper - show modal to collect comment and then try to call a reject endpoint
    window.rejectJournalEntry = (id) => {
        let modal = document.getElementById('transactionRejectModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'transactionRejectModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content" style="min-width:420px">
                    <button type="button" id="closeRejectModalX" class="modal-close-x">&times;</button>
                    <h3>Reject Transaction</h3>
                    <form id="rejectForm">
                        <input type="hidden" id="rejectTransId">
                        <div style="margin-bottom:12px">
                            <label style="display:block;margin-bottom:4px">Reason for rejection*</label>
                            <textarea id="rejectReason" required style="width:100%;min-height:80px"></textarea>
                        </div>
                        <div style="display:flex;justify-content:space-between;margin-top:12px">
                            <button type="button" class="cancel-btn" id="cancelRejectBtn">Cancel</button>
                            <button type="submit" class="confirm-btn">Reject</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('#closeRejectModalX').addEventListener('click', () => modal.style.display = 'none');
            modal.querySelector('#cancelRejectBtn').addEventListener('click', () => modal.style.display = 'none');
            modal.querySelector('#rejectForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const id = modal.querySelector('#rejectTransId').value;
                const reason = modal.querySelector('#rejectReason').value || '';
                try {
                    // Try to call a server-side reject endpoint if it exists
                    const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_reject_trans', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ manager_id: ADMIN_ID, trans_id: id, comment: reason })
                    });
                    if (res.ok) {
                        modal.style.display = 'none';
                        await fetchJournalEntries();
                        return;
                    }
                } catch (err) {
                    // endpoint might not exist; we'll fall back to updating Transactions.status via AA_edit_trans
                    console.warn('AA_reject_trans not available or failed, falling back', err);
                }

                try {
                    // Fallback: use AA_edit_trans to change status to rejected and append reason to description/comment
                    // Note: AA_edit_trans allows updating credit/debit/description. We'll prepend rejection reason to description.
                    const entry = entries.find(e => String(e.id) === String(id));
                    const newDesc = `[REJECTED: ${reason}] ` + (entry.description || '');
                    const res2 = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_edit_trans', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: ADMIN_ID, trans_id: id, credit: entry.credit, debit: entry.debit, description: newDesc })
                    });
                    if (!res2.ok) throw new Error('Fallback reject failed');
                    // Also mark status locally by calling AA_approve_trans? No - better to rely on server-side. We'll refresh.
                    modal.style.display = 'none';
                    await fetchJournalEntries();
                } catch (err) {
                    console.error('Reject transaction fallback failed', err);
                    alert('Failed to reject transaction.');
                }
            });
        }
        modal.querySelector('#rejectTransId').value = id;
        modal.querySelector('#rejectReason').value = '';
        modal.style.display = 'flex';
    };

    function showNewEntryModal() {
        let modal = document.getElementById('journalNewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'journalNewModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
        <div class="modal-content" style="min-width:500px;max-width:600px;background:#fff;border-radius:10px;padding:24px 32px;box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative;">
                <button type="button" id="closeJournalNewModal" class="modal-close-x" 
                    style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>

             <h3 style="text-align:center;margin-top:0;margin-bottom:20px;font-size:1.3rem;font-weight:600;">New Journal Entry</h3>

            <form id="journalNewForm">
                <div style="margin-bottom:14px">
                    <div id="dragDropArea" 
                        style="border:2px dashed #ccc;border-radius:8px;padding:18px;text-align:center;margin-bottom:15px;background:#f9f9f9;cursor:pointer;">
                        <div id="dragDropText" style="color:#666;">Drag and drop files here or click to upload</div>
                        <input type="file" id="fileInput" multiple style="display:none">
                        <div id="fileList" style="margin-top:10px;text-align:left;"></div>
                    </div>
                </div>

            <div style="margin-bottom:14px">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Date*</label>
                <input type="date" name="date" id="newJournalDate" required 
                    style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
            </div>

            <div style="margin-bottom:14px">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Description*</label>
                <textarea name="description" id="newJournalDescription" required 
                    style="width:100%;min-height:60px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;resize:vertical;"></textarea>
            </div>

            <!-- First row -->
            <div style="display:flex;gap:12px;margin-bottom:12px;">
                <div style="flex:1;">
                    <label style="display:block;margin-bottom:4px;font-weight:500;">Account</label>
                    <select name="account_type" id="newJournalAccountType" required 
                        style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                        <option value="">Select account</option>
                    </select>
                </div>
            <div style="flex:1;">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Debit Amount:</label>
                <input type="number" name="debit" id="newJournalDebit" min="0" 
                    style="width:150px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
            </div>
            <div style="flex:1;">
                <label style="display:block;margin-bottom:4px;font-weight:500;">Credit Amount:</label>
                <input type="number" name="credit" id="newJournalCredit" min="0" 
                    style="width:150px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
            </div>
        </div>

                <!-- Second row -->
                <div style="display:flex;gap:12px;margin-bottom:12px;">
                    <div style="flex:1;">
                        <select name="account_type_2" id="newJournalAccountType2" 
                            style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                            <option value="">Select account</option>
                        </select>
                    </div>
                    <div style="flex:1;">
                        <input type="number" name="debit_2" id="newJournalDebit2" min="0" 
                            style="width:150px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                    </div>
                    <div style="flex:1;">
                        <input type="number" name="credit_2" id="newJournalCredit2" min="0" 
                            style="width:150px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                    </div>
                </div>

                        <div style="text-align:right;margin-bottom:16px;">
                    <button type="button" id="addNewAccountBtn" 
                        style="background:#007bff;color:#fff;padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:500;">
                        + Add New Account
                    </button>
                </div>

                <div style="display:flex;justify-content:space-between;margin-top:20px;">
                    <button type="button" class="cancel-btn" id="cancelJournalNew" 
                        style="background:#f2f2f2;color:#555;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
                    <button type="submit" class="confirm-btn" 
                        style="background:#2ecc71;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Create Entry</button>
                </div>
            </form>
        </div>

            `;
            document.body.appendChild(modal);
            
            modal.querySelector('#closeJournalNewModal').addEventListener('click', () => modal.style.display = 'none');
            modal.querySelector('#cancelJournalNew').addEventListener('click', () => modal.style.display = 'none');
            
            // Set today's date as default
            const today = new Date().toISOString().split('T')[0];
            modal.querySelector('#newJournalDate').value = today;

            // Load accounts into select dropdown
                fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: ADMIN_ID })
                })
                .then(res => res.json())
                .then(data => {
                
                    let accounts = [];
                if (Array.isArray(data)) {
                    accounts = data;
                } 
                else if (data.body) {
                
                    try { accounts = JSON.parse(data.body); } 
                    catch { accounts = data.body; }
                }

                // Get both dropdowns
                const accountType1 = modal.querySelector('#newJournalAccountType');
                const accountType2 = modal.querySelector('#newJournalAccountType2');

                // Only include active accounts (if property exists)
                let filteredAccounts = accounts.filter(acc => acc.is_active === true || acc.is_active === 1 || acc.is_active === "1");

                function populateSelect(selectEl) {
                    selectEl.innerHTML = '<option value="">Select account</option>';
                    filteredAccounts
                    .sort((a, b) => a.account_number.localeCompare(b.account_number))
                    .forEach(acc => {
                    const option = document.createElement('option');
                    option.value = acc.account_number;
                    option.textContent = `${acc.account_number} - ${acc.account_name}`;
                    selectEl.appendChild(option);
                    });
                }

                populateSelect(accountType1);
                populateSelect(accountType2);
            })
            .catch(err => console.error('Error loading accounts:', err));


            // Form submission handler
            modal.querySelector('#journalNewForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = new FormData(e.target);
                const data = {
                    date: formData.get('date'),
                    description: formData.get('description'),
                    account_number: formData.get('account_number'),
                    debit: parseFloat(formData.get('debit')) || 0,
                    credit: parseFloat(formData.get('credit')) || 0,
                    status: 'pending' // New entries are always pending
                };

                // Validate that either debit or credit is filled, but not both
                if ((data.debit > 0 && data.credit > 0) || (data.debit === 0 && data.credit === 0)) {
                    alert('Please enter either a debit or credit amount, but not both.');
                    return;
                }

                try {
                    const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_create_trans', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            admin_id: ADMIN_ID,
                            ...data
                        })
                    });
                    
                    if (!response.ok) throw new Error('Failed to create journal entry');
                    
                    modal.style.display = 'none';
                    e.target.reset(); // Clear form
                    document.getElementById('fileList').innerHTML = ''; // Clear file list
                    await fetchJournalEntries(); // Refresh the table
                } catch (err) {
                    console.error('Error creating journal entry:', err);
                    alert('Failed to create journal entry. Please try again.');
                }
            });

            // Initialize drag and drop functionality
            const dragDropArea = modal.querySelector('#dragDropArea');
            const fileInput = modal.querySelector('#fileInput');
            const fileList = modal.querySelector('#fileList');
            let files = [];

            dragDropArea.addEventListener('click', () => fileInput.click());

            fileInput.addEventListener('change', (e) => {
                const newFiles = Array.from(e.target.files);
                handleFiles(newFiles);
            });

            dragDropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                dragDropArea.style.background = '#e9e9e9';
            });

            dragDropArea.addEventListener('dragleave', () => {
                dragDropArea.style.background = '#f9f9f9';
            });

            dragDropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                dragDropArea.style.background = '#f9f9f9';
                const newFiles = Array.from(e.dataTransfer.files);
                handleFiles(newFiles);
            });

            function handleFiles(newFiles) {
                files = [...files, ...newFiles];
                updateFileList();
            }

            function updateFileList() {
                fileList.innerHTML = files.map((file, index) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px; margin:2px 0; background:#fff; border-radius:4px;">
                        <span>${file.name}</span>
                        <button type="button" class="remove-file" data-index="${index}" style="border:none; background:none; color:red; cursor:pointer;">&times;</button>
                    </div>
                `).join('');

                fileList.querySelectorAll('.remove-file').forEach(button => {
                    button.addEventListener('click', (e) => {
                        const index = parseInt(e.target.getAttribute('data-index'));
                        files.splice(index, 1);
                        updateFileList();
                    });
                });
            }
        }
        
        modal.style.display = 'flex';
    }

    // Add click handler for new journal entry button
    document.getElementById('newJournalEntryBtn').addEventListener('click', showNewEntryModal);

    function render() {
        let filtered = [...entries];
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(e => (e.status || '').toLowerCase() === statusFilter);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                (e.description || '').toLowerCase().includes(term) ||
                (e.account_number || '').toString().includes(term) ||
                (e.account_name || '').toLowerCase().includes(term)
            );
        }

        if (sortState.col) {
            filtered.sort((a, b) => {
                let aVal = a[sortState.col];
                let bVal = b[sortState.col];
                
                // Special handling for numeric fields
                if (['debit', 'credit'].includes(sortState.col)) {
                    aVal = parseFloat(aVal) || 0;
                    bVal = parseFloat(bVal) || 0;
                }
                
                // Date comparison
                if (sortState.col === 'date') {
                    aVal = new Date(aVal).getTime();
                    bVal = new Date(bVal).getTime();
                }
                
                if (aVal < bVal) return sortState.asc ? -1 : 1;
                if (aVal > bVal) return sortState.asc ? 1 : -1;
                return 0;
            });
        }

        container.innerHTML = buildTable(filtered);

        // Add sort handlers
        container.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.onclick = () => {
                const col = th.getAttribute('data-col');
                if (sortState.col === col) sortState.asc = !sortState.asc;
                else {
                    sortState.col = col;
                    sortState.asc = true;
                }
                render();
            };
        });
    }

    searchEl.addEventListener('input', (e) => {
        searchTerm = e.target.value || '';
        render();
    });

    filterStatusEl.addEventListener('change', (e) => {
        statusFilter = e.target.value;
        render();
    });

    // Initial load
    fetchJournalEntries();
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
                <button type="button" id="closeAccountViewModal" class="modal-close-x">&times;</button>
                <h3>Account Details</h3>
                <div id="accountViewBody" style="min-width:320px;"></div>
                <div style="display:flex; justify-content:center; margin-top:12px;">
                    <button id="accountViewOk" class="confirm-btn">OK</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        modal.querySelector('#accountViewOk').addEventListener('click', () => { modal.style.display = 'none'; });
        modal.querySelector('#closeAccountViewModal').addEventListener('click', () => { modal.style.display = 'none'; });
    }

    const bodyDiv = modal.querySelector('#accountViewBody');
    bodyDiv.innerHTML = `
        <label style="font-size:1.2em; font-weight:700; margin-bottom:12px; display:block;">Account Name: ${acc.account_name || ''}</label>
        <label style="font-weight:600; margin-bottom:8px; display:block;">Account Number: ${acc.account_number || ''}</label>
        <table border:none; border-collapse:collapse; cellpadding="8" cellspacing="0" 
       style="width:100%; max-width:800px; margin-bottom:12px; border-collapse:collapse;">
        <tr>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:120px;">Date</th>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:14px;">Reference No.</th>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:300px;">Description</th>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:100px;">Debit</th>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:100px;">Credit</th>
            <th style="text-align:center; padding:12px; font-size:1.1em; min-width:120px;">Balance</th>
        </tr>
        <tr>
            <td style="text-align:center; padding:12px; font-size:1em;">loading... </td>
            <td style="padding:12px; font-size:1em;">loading...</td>
            <td style="padding:12px; font-size:1em;">loading...</td>
            <td style="text-align:right; padding:12px; font-size:1em;">loading...</td>
            <td style="text-align:right; padding:12px; font-size:1em;">loading...</td>
            <td style="text-align:right; padding:12px; font-size:1em;">loading...</td>
        </tr>
        </table>    
    `;

    modal.style.display = 'flex';
}
