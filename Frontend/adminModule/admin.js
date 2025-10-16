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
    } catch (e) {}

    // Make the logo clickable to prompt logout confirmation (prevent accidental navigation)
    try {
        const logoEl = document.querySelector('.logo');
        if (logoEl) {
            logoEl.style.cursor = 'pointer';
            logoEl.addEventListener('click', (ev) => {
                ev.preventDefault && ev.preventDefault();
                showLogoutModal();
            });
        }
    } catch (e) {}
});

// Create and show logout confirmation modal
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

        // Attach handlers
        modal.querySelector('#cancelLogoutBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.querySelector('#confirmLogoutBtn').addEventListener('click', () => {
            try { localStorage.removeItem('user'); } catch (e) {}
            window.location.href = '../LoginModule/index.html';
        });
    }
    modal.style.display = 'flex';
}

// Show suspend modal with date pickers for suspension range
function showSuspendModal(userId) {
    let modal = document.getElementById('suspendModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'suspendModal';
        modal.className = 'modal-overlay';
        // default from = today, to = today + 7 days
        const today = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const format = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
        const defaultFrom = format(today);
        const defaultToDate = new Date(today.getTime() + 7*24*60*60*1000);
        const defaultTo = format(defaultToDate);
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Suspend User</h3>
                <p>Select suspension start and end dates:</p>
                <div style="display:flex; gap:10px; justify-content:center; margin-top:8px;">
                    <label style="display:flex; flex-direction:column; align-items:flex-start; font-weight:500; color:#222;">
                        From
                        <input id="suspendFrom" type="date" value="${defaultFrom}" style="margin-top:6px; padding:8px; border-radius:7px; border:1.5px solid #bbb;">
                    </label>
                    <label style="display:flex; flex-direction:column; align-items:flex-start; font-weight:500; color:#222;">
                        To
                        <input id="suspendTo" type="date" value="${defaultTo}" style="margin-top:6px; padding:8px; border-radius:7px; border:1.5px solid #bbb;">
                    </label>
                </div>
                <div id="suspendError" style="color:#c00; min-height:18px; margin-top:10px; text-align:center;"></div>
                <div class="modal-actions" style="margin-top:10px;">
                    <button id="confirmSuspendBtn" class="confirm-btn warn-yellow">Suspend</button>
                    <button id="cancelSuspendBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#cancelSuspendBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.querySelector('#confirmSuspendBtn').addEventListener('click', async () => {
            const from = modal.querySelector('#suspendFrom').value;
            const to = modal.querySelector('#suspendTo').value;
            const errDiv = modal.querySelector('#suspendError');
            errDiv.textContent = '';
            if (!from || !to) {
                errDiv.textContent = 'Both dates are required.';
                return;
            }
            // Basic validation: from <= to
            if (new Date(from) > new Date(to)) {
                errDiv.textContent = 'Start date must be before or equal to end date.';
                return;
            }
            try {
                await performUserAction(userId, 'suspend', from, to);
                modal.style.display = 'none';
            } catch (e) {
                errDiv.textContent = e.message || 'Failed to suspend user.';
            }
        });
    }
    modal.style.display = 'flex';
}
const actionContent = document.getElementById('actionContent');
const tabs = document.querySelectorAll('.tab-btn');
let ADMIN_ID = 1; // fallback default
try {
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.id) {
        ADMIN_ID = user.id;
    }
} catch (e) {}

// Tab click handler — use delegated listener so clicks work even if tabs are dynamic
// Determine the original tabs container (parent of the initial tabs NodeList), fall back to document
const tabsContainer = (tabs && tabs.length && tabs[0].parentElement) ? tabs[0].parentElement : document;
document.addEventListener('click', (ev) => {
    const tab = ev.target.closest && ev.target.closest('.tab-btn');
    if (!tab) return;
    // only handle clicks on elements that are inside the original tabs container
    if (tabsContainer && !tabsContainer.contains(tab)) {
        try { console.debug('[TAB CLICK] ignored tab-like element outside tabs container', tab); } catch (e) {}
        return;
    }
    try { console.debug('[TAB CLICK] clicked tab', tab.getAttribute('data-tab'), tab); } catch (e) {}
    const prev = document.querySelector('.tab-btn.active');
    if (prev && prev !== tab) prev.classList.remove('active');
    tab.classList.add('active');
    // clear current content to avoid stale DOM interfering with loaders
    try { if (actionContent) actionContent.innerHTML = ''; } catch (e) {}
    try { updateContent(tab.getAttribute('data-tab')); } catch (e) {
        console.error('Error updating tab content:', e);
        try { if (actionContent) actionContent.innerHTML = `<p style="color:red;">Error loading tab: ${e.message}</p>`; } catch (e2) {}
    }
});

// Initial load
updateContent('chartOfAccounts');

function updateContent(tab) {
    try { console.debug('[updateContent] tab=', tab); } catch (e) {}
    switch(tab) {
        case 'chartOfAccounts':
            loadChartOfAccounts();
            break;
        case 'journal':
            loadJournal();
            break;
        case 'eventLog':
            loadEventLog();
            break;
        case 'manageUsers':
            loadManageUsers();
            break;
        case 'userRequest':
            loadUserRequest();
            break;
        case 'generateReports':
            actionContent.innerHTML = `
                <h2>Generate Reports</h2>
                <button id="expiredPasswordsBtn">Expired Passwords</button>
                <div id="reportContent"></div>
            `;
            document.getElementById('expiredPasswordsBtn')
                .addEventListener('click', loadExpiredPasswordsReport);
            break;
        
        default:
            actionContent.innerHTML = '';
    }
}

// ----------------------
// Chart of Accounts TAB
// ----------------------

async function loadChartOfAccounts() {
    try { console.debug('[loadChartOfAccounts] called'); } catch (e) {}
    actionContent.innerHTML = `
    <h2>Chart of Accounts</h2>
    <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
        <button id="createAccBtn" style="font-size:1.1em; padding:10px 20px; border-radius:8px; background:#4CAF50; color:#fff; border:none; font-weight:bold; cursor:pointer;">Create New Account</button>
        <input id="accountsSearch" placeholder="Search by account number or name" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
    </div>
    `;

    actionContent.insertAdjacentHTML("beforeend", `
        <div id="createAccModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:#fff; padding:32px 28px 24px 28px; border-radius:16px; min-width:340px; max-width:95vw; margin:auto; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                <h2 style="margin-top:0; margin-bottom:18px; text-align:center; color:#333;">Create New Chart</h2>
                <form id="createAccForm" style="display:flex; flex-direction:column; gap:14px;">
                    <label style="font-weight:500; color:#222;">Account Name
                        <input type="text" id="accountName" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Account ID Number
                        <input type="text" id="accountIDNumber" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Initial Balance
                        <input type="text" id="initialBalance" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Account Category
                        <select id="accountCategory" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                            <option value="">Select</option>
                            <option value="assets">Asset</option>
                            <option value="liabilities">Liabilities</option>
                            <option value="ownerEquity">Owner Equity</option>
                            <option value="revenue">Revenue</option>
                            <option value="expenses">Expenses</option>
                        </select>
                    </label>
                    <label style="font-weight:500; color:#222;">Account Subcategory
                        <select id="accountSubcategory" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                            <option value="">Select</option>
                        </select>
                    </label>
                    <label style="font-weight:500; color:#222;">Statement
                        <select id="accountStatement" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                            <option value="">Select</option>
                            <option value="IS">Income Statement</option>
                            <option value="BS">Balance Sheet</option>
                            <option value="RE">Retained Earnings</option>
                        </select>
                    </label>
                    <label style="font-weight:500; color:#222; display:block;">
                    Account Description
                        <textarea id="accountDescription" required 
                        style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em; height: 100px; width:100%; display:block;">
                        </textarea>
                    </label>
                    <div id="createAccError" style="color:#c00; min-height:18px; font-size:0.98em;"></div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
                        <button type="submit" style="background:#4CAF50; color:#fff; border:none; border-radius:7px; padding:9px 22px; font-size:1em; font-weight:bold; cursor:pointer;">Create</button>
                        <button type="button" id="cancelCreateUser" style="background:#eee; color:#333; border:none; border-radius:7px; padding:9px 22px; font-size:1em; font-weight:bold; cursor:pointer;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    `);

    const modal = document.getElementById('createAccModal');
    document.getElementById('createAccBtn').onclick = () => { modal.style.display = 'flex'; };
    document.getElementById('cancelCreateUser').onclick = () => { modal.style.display = 'none'; };

    const accountCategory = document.getElementById("accountCategory");
    const accountSubcategory = document.getElementById("accountSubcategory");

    const subcategories = {
        assets: ["Current Assets", "Non-Current Assets"],
        liabilities: ["Current Liabilities", "Non-Current Liabilities"],
        ownerEquity: ["Common Stock", "Preferred Stock","Capital", "Drawings", "Retained Earnings"],
        revenue: ["Sales Revenue", "Service Revenue", "Interest Income", "Dividend Income", "Rental Income"],
        expenses: ["Operating Expenses", "Non-Operating Expenses", "Administrative Expenses", "Miscellaneous Expenses"]
    };

    accountCategory.addEventListener("change", () => {
        const selectedCategory = accountCategory.value;

        accountSubcategory.innerHTML = '<option id="subSelect">Select</option>';

        if (selectedCategory && subcategories[selectedCategory]) {
        subcategories[selectedCategory].forEach(sub => {
            const option = document.createElement("option");
            option.value = sub.toLowerCase().replace(/\s+/g, "-");
            option.textContent = sub;
            accountSubcategory.appendChild(option);
        });
        }
    });

    // Hook up the create account form (renamed to avoid id collisions elsewhere)
    const createForm = document.getElementById('createAccForm');
    if (createForm) {
        createForm.onsubmit = async (e) => {
            e.preventDefault();
            const account_name = document.getElementById('accountName').value.trim();
            const account_number = document.getElementById('accountIDNumber').value.trim();
            const initial_balance = parseFloat(document.getElementById('initialBalance').value) || 0;
            const categoryVal = document.getElementById('accountCategory').value;
            const subcategoryVal = document.getElementById('accountSubcategory').value;
            const description = document.getElementById('accountDescription').value.trim();
            const statementVal = document.getElementById('accountStatement') ? document.getElementById('accountStatement').value : null;
            const errorDiv = document.getElementById('createAccError');
            if (errorDiv) errorDiv.textContent = '';
            if (!account_name || !account_number) {
                if (errorDiv) errorDiv.textContent = 'Account name and ID are required.';
                return;
            }
            if (!statementVal) {
                if (errorDiv) errorDiv.textContent = 'Please select a statement (Income Statement, Balance Sheet or Retained Earnings).';
                return;
            }
            // collect client-side user info for diagnostics
            let clientUser = null;
            try { clientUser = JSON.parse(localStorage.getItem('user')); } catch (e) { clientUser = null; }

            try {
                console.log('Creating account request - admin id (ADMIN_ID):', ADMIN_ID, 'localStorage user:', clientUser);
                const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_create_account', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        admin_id: ADMIN_ID,
                        account_number,
                        account_name,
                        description,
                        normal_side: 'debit',
                        category: categoryVal,
                        subcategory: subcategoryVal,
                        initial_balance,
                        statement: statementVal,
                        comment: null
                    })
                });
                let data = await res.json();
                // Normalize Lambda proxy response: { statusCode, body: '...json...' }
                if (data && typeof data.body === 'string') {
                    try { const parsed = JSON.parse(data.body); data = { ...data, ...parsed, body: parsed }; } catch (e) {}
                }
                const statusCode = (data && data.statusCode) ? Number(data.statusCode) : res.status;
                if (statusCode >= 400) {
                    const errMsg = (data && (data.error || data.message)) || (data && data.body && data.body.error) || 'Failed to create account';
                    throw new Error(errMsg);
                }
                alert((data && (data.message || (data.body && data.body.message))) || 'Account created successfully.');
                document.getElementById('createAccModal').style.display = 'none';
                await loadAccounts();
            } catch (err) {
                // If server returns an authorization error, include client-side diagnostic info to help debug
                if (errorDiv) {
                    let msg = err.message || 'Failed to create account.';
                    if (/not authorized/i.test(msg) || /403/.test(msg)) {
                        msg += `\nClient-side admin id: ${ADMIN_ID}`;
                        try { msg += `\nlocalStorage user: ${JSON.stringify(clientUser)}`; } catch (e) {}
                    }
                    errorDiv.textContent = msg;
                }
                console.error('Create account error:', err, 'clientUser:', clientUser);
            }
        };
    }

    // Container for account tables
    let accountsContainer = document.getElementById('accountsTablesContainer');
    if (!accountsContainer) {
        accountsContainer = document.createElement('div');
        accountsContainer.id = 'accountsTablesContainer';
        accountsContainer.style.marginTop = '18px';
        actionContent.appendChild(accountsContainer);
    }

    // State
    let activeAccounts = [];
    let inactiveAccounts = [];
    let accountSearchTerm = '';
    const sortState = { active: { col: null, asc: true }, inactive: { col: null, asc: true } };

    async function loadAccounts() {
        accountsContainer.innerHTML = '<p>Loading accounts...</p>';
        try {
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let data = await res.json();
            if (typeof data.body === 'string') {
                try { data = JSON.parse(data.body); } catch (e) {}
            }

            let rows = [];
            if (Array.isArray(data)) rows = data;
            else if (Array.isArray(data.rows)) rows = data.rows;
            else if (Array.isArray(data.accounts)) rows = data.accounts;
            else if (Array.isArray(data.body)) rows = data.body;
            // otherwise, if data is an object that's actually the array string-parsed above will handle

            // normalize boolean-like values
            rows = (rows || []).map(r => ({ ...r, is_active: r.is_active === 1 || r.is_active === true || String(r.is_active) === 'true' }));

            activeAccounts = rows.filter(a => a.is_active);
            inactiveAccounts = rows.filter(a => !a.is_active);

            renderTables();
        } catch (err) {
            accountsContainer.innerHTML = `<p style="color:red;">Error loading accounts: ${err.message}</p>`;
        }
    }

    function buildTableHtml(accounts, which) {
        // which = 'active' | 'inactive'
        const cols = [
            { key: 'account_number', label: 'Account Number' },
            { key: 'account_name', label: 'Account Name' },
            { key: 'is_active', label: 'Active' },
            { key: 'category', label: 'Category' },
            { key: 'subcategory', label: 'Subcategory' },
            { key: 'balance', label: 'Balance' },
            { key: 'statement', label: 'Statement' },
            { key: 'description', label: 'Description' }
        ];

        let html = `<h3>${which === 'active' ? 'Active Accounts' : 'Inactive Accounts'}</h3>`;
        if (!accounts.length) {
            html += `<p>No ${which} accounts.</p>`;
            return html;
        }

        html += `<table class="accounts-table" data-which="${which}"><thead><tr>`;
        cols.forEach(c => {
            // description is not sortable and actions column will be added separately
            const sortable = c.key !== 'description';
            html += `<th ${sortable ? 'class="sortable"' : ''} data-col="${c.key}">${c.label}`;
            if (sortable) html += ' <span style="font-size:0.8em; color:#666;">↕</span>';
            html += `</th>`;
        });
        html += `<th>Actions</th></tr></thead><tbody>`;

        accounts.forEach(acc => {
            html += `<tr data-account-number="${acc.account_number}">`;
            // render account number and name as clickable links (buttons) that open the same modal
            const accNum = acc.account_number || '';
            const accName = acc.account_name || '';
            html += `<td><button class="acc-link action-link" data-account-number="${accNum}" style="background:none;border:none;color:#007bff;cursor:pointer;padding:0;margin:0;font-size:0.95em;text-decoration:underline;">${accNum}</button></td>`;
            html += `<td><button class="acc-link action-link" data-account-number="${accNum}" style="background:none;border:none;color:#007bff;cursor:pointer;padding:0;margin:0;font-size:0.95em;text-decoration:underline;">${accName}</button></td>`;
            html += `<td>${acc.is_active ? 'Yes' : 'No'}</td>`;
            html += `<td>${acc.category || ''}</td>`;
            html += `<td>${acc.subcategory || ''}</td>`;
            html += `<td>${(acc.balance !== undefined && acc.balance !== null) ? formatAccounting(acc.balance) : '0.00'}</td>`;
            html += `<td>${acc.statement || ''}</td>`;
            html += `<td>${acc.description ? String(acc.description).slice(0,120) : ''}</td>`;
            // actions
            if (which === 'active') {
                html += `<td><button class="edit-acc-btn action-btn" data-account-number="${acc.account_number}">Edit</button> <button class="deactivate-acc-btn action-btn" data-account-number="${acc.account_number}">Deactivate</button></td>`;
            } else {
                html += `<td><button class="activate-acc-btn action-btn" data-account-number="${acc.account_number}">Activate</button></td>`;
            }
            html += `</tr>`;
        });

        html += `</tbody></table>`;
        return html;
    }

    function renderTables() {
        accountsContainer.innerHTML = '';
        // Apply search filtering (live)
        const term = (accountSearchTerm || '').toString().toLowerCase();
        const filteredActive = !term ? activeAccounts : activeAccounts.filter(a => {
            const num = (a.account_number || '').toString().toLowerCase();
            const name = (a.account_name || '').toString().toLowerCase();
            return num.includes(term) || name.includes(term);
        });
        const filteredInactive = !term ? inactiveAccounts : inactiveAccounts.filter(a => {
            const num = (a.account_number || '').toString().toLowerCase();
            const name = (a.account_name || '').toString().toLowerCase();
            return num.includes(term) || name.includes(term);
        });

        accountsContainer.insertAdjacentHTML('beforeend', buildTableHtml(filteredActive, 'active'));
        accountsContainer.insertAdjacentHTML('beforeend', buildTableHtml(filteredInactive, 'inactive'));

        // attach sorting listeners
        accountsContainer.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.addEventListener('click', () => {
                const col = th.getAttribute('data-col');
                const table = th.closest('table');
                const which = table.getAttribute('data-which');
                const state = sortState[which];
                if (state.col === col) state.asc = !state.asc; else { state.col = col; state.asc = true; }
                const arr = which === 'active' ? activeAccounts : inactiveAccounts;
                arr.sort((a,b) => {
                    const A = (a[col] === null || a[col] === undefined) ? '' : String(a[col]).toLowerCase();
                    const B = (b[col] === null || b[col] === undefined) ? '' : String(b[col]).toLowerCase();
                    if (!isNaN(parseFloat(A)) && !isNaN(parseFloat(B))) {
                        return state.asc ? parseFloat(A) - parseFloat(B) : parseFloat(B) - parseFloat(A);
                    }
                    if (A < B) return state.asc ? -1 : 1;
                    if (A > B) return state.asc ? 1 : -1;
                    return 0;
                });
                renderTables();
            });
        });

        // attach action listeners
        accountsContainer.querySelectorAll('.edit-acc-btn').forEach(btn => {
            btn.addEventListener('click', (e) => showEditModal(e.target.getAttribute('data-account-number')));
        });
        accountsContainer.querySelectorAll('.deactivate-acc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const acct = e.target.getAttribute('data-account-number');
                if (!confirm(`Deactivate account ${acct}? Account balance must be zero to deactivate.`)) return;
                try {
                    const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_account_actions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ admin_id: ADMIN_ID, action: 'DEACTIVATE ACCOUNT', account_number: acct })
                    });
                    let data = await res.json();
                    if (data && typeof data.body === 'string') { try { const parsed = JSON.parse(data.body); data = { ...data, ...parsed, body: parsed }; } catch (e) {} }
                    const statusCode = (data && data.statusCode) ? Number(data.statusCode) : res.status;
                    if (statusCode >= 400) {
                        const errMsg = (data && (data.error || data.message)) || (data && data.body && data.body.error) || 'Failed';
                        throw new Error(errMsg);
                    }
                    alert((data && (data.message || (data.body && data.body.message))) || 'Account deactivated.');
                    await loadAccounts();
                } catch (err) { alert(`Error: ${err.message}`); }
            });
        });
        accountsContainer.querySelectorAll('.activate-acc-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const acct = e.target.getAttribute('data-account-number');
                if (!confirm(`Activate account ${acct}?`)) return;
                try {
                    const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_account_actions', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ admin_id: ADMIN_ID, action: 'ACTIVATE ACCOUNT', account_number: acct })
                    });
                    let data = await res.json();
                    if (data && typeof data.body === 'string') { try { const parsed = JSON.parse(data.body); data = { ...data, ...parsed, body: parsed }; } catch (e) {} }
                    const statusCode = (data && data.statusCode) ? Number(data.statusCode) : res.status;
                    if (statusCode >= 400) {
                        const errMsg = (data && (data.error || data.message)) || (data && data.body && data.body.error) || 'Failed';
                        throw new Error(errMsg);
                    }
                    alert((data && (data.message || (data.body && data.body.message))) || 'Account activated.');
                    await loadAccounts();
                } catch (err) { alert(`Error: ${err.message}`); }
            });
        });

        // wire up search input (live filter)
        const searchEl = document.getElementById('accountsSearch');
        if (searchEl) {
            searchEl.value = accountSearchTerm || '';
            searchEl.addEventListener('input', (e) => {
                accountSearchTerm = (e.target.value || '').trim();
                renderTables();
            });
        }

        // attach click listeners for account number/name links to open placeholder modal
        accountsContainer.querySelectorAll('.acc-link').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const acct = e.currentTarget.getAttribute('data-account-number');
                showAccountModal(acct);
            });
        });
    }

    // Edit modal (created on demand)
    function showEditModal(accountNumber) {
        const acc = [...activeAccounts, ...inactiveAccounts].find(a => a.account_number === accountNumber);
        if (!acc) { alert('Account data not found.'); return; }

        let modal = document.getElementById('editAccModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'editAccModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Edit Account</h3>
                    <form id="editAccForm" style="display:flex; flex-direction:column; gap:10px;">
                        <input type="hidden" id="originalAccountNumber">
                        <label>Account Number<input id="editAccountNumber" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"></label>
                        <label>Account Name<input id="editAccountName" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"></label>
                        <label>Initial Balance<input id="editInitialBalance" type="number" step="0.01" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"></label>
                        <label>Category<select id="editAccountCategory" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"></select></label>
                        <label>Subcategory<select id="editAccountSubcategory" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"></select></label>
                        <label>Statement<select id="editStatement" style="margin-top:4px;padding:8px;border-radius:6px;border:1px solid #ccc;"><option value="">Select</option><option value="IS">IS</option><option value="BS">BS</option><option value="RE">RE</option></select></label>
                        <label style="display:block; font-weight:500; color:#222;">Description
                            <textarea id="editDescription" placeholder="Enter account description (optional)" rows="5" 
                                style="margin-top:6px; padding:10px; border-radius:7px; border:1.5px solid #bbb; font-size:1em; width:100%; box-sizing:border-box; min-height:100px;">
                            </textarea>
                        </label>
                        <div id="editAccError" style="color:#c00; min-height:18px;"></div>
                        <div style="display:flex; gap:10px; justify-content:flex-end;">
                            <button type="submit" style="background:#4CAF50;color:#fff;border:none;border-radius:6px;padding:8px 14px;">Save</button>
                            <button type="button" id="cancelEditAcc" style="background:#eee;border:none;border-radius:6px;padding:8px 14px;">Cancel</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);

            modal.querySelector('#cancelEditAcc').addEventListener('click', () => { modal.style.display = 'none'; });
            modal.querySelector('#editAccForm').addEventListener('submit', async (ev) => {
                ev.preventDefault();
                const errorDiv = document.getElementById('editAccError'); if (errorDiv) errorDiv.textContent = '';
                const account_number = document.getElementById('editAccountNumber').value;
                const account_name = document.getElementById('editAccountName').value.trim();
                const initial_balance = parseFloat(document.getElementById('editInitialBalance').value) || 0;
                const category = document.getElementById('editAccountCategory').value;
                const subcategory = document.getElementById('editAccountSubcategory').value;
                const statement = document.getElementById('editStatement').value;
                const description = document.getElementById('editDescription').value.trim();
                try {
                    const original_account_number = document.getElementById('originalAccountNumber') ? document.getElementById('originalAccountNumber').value : account_number;
                    const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_edit_account', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ admin_id: ADMIN_ID, original_account_number, account_number, account_name, description, normal_side: 'debit', category, subcategory, initial_balance, statement, comment: null })
                        });
                    let data = await res.json();
                    if (data && typeof data.body === 'string') { try { const parsed = JSON.parse(data.body); data = { ...data, ...parsed, body: parsed }; } catch (e) {} }
                    const statusCode = (data && data.statusCode) ? Number(data.statusCode) : res.status;
                    if (statusCode >= 400) {
                        const errMsg = (data && (data.error || data.message)) || (data && data.body && data.body.error) || 'Failed to update account';
                        throw new Error(errMsg);
                    }
                    alert((data && (data.message || (data.body && data.body.message))) || 'Account updated.');
                    modal.style.display = 'none';
                    await loadAccounts();
                } catch (err) {
                    if (errorDiv) errorDiv.textContent = err.message || 'Failed to update account.';
                }
            });
        }

        // populate fields
        modal.style.display = 'flex';
        document.getElementById('editAccountNumber').value = acc.account_number || '';
    document.getElementById('originalAccountNumber').value = acc.account_number || '';
        document.getElementById('editAccountName').value = acc.account_name || '';
        document.getElementById('editInitialBalance').value = acc.initial_balance || acc.balance || 0;

        const catSelect = document.getElementById('editAccountCategory');
        catSelect.innerHTML = '<option value="">Select</option>';
        Object.keys(subcategories).forEach(k => {
            const opt = document.createElement('option'); opt.value = k; opt.textContent = k.charAt(0).toUpperCase() + k.slice(1);
            if (acc.category && acc.category.toLowerCase() === k) opt.selected = true;
            catSelect.appendChild(opt);
        });

        const subSel = document.getElementById('editAccountSubcategory');
        function populateEditSubcats() {
            const k = catSelect.value;
            subSel.innerHTML = '<option value="">Select</option>';
            if (k && subcategories[k]) subcategories[k].forEach(s => { const o = document.createElement('option'); o.value = s.toLowerCase().replace(/\s+/g,'-'); o.textContent = s; if (acc.subcategory && acc.subcategory.toLowerCase() === o.value) o.selected = true; subSel.appendChild(o); });
        }
        populateEditSubcats();
        catSelect.addEventListener('change', populateEditSubcats);

        document.getElementById('editStatement').value = acc.statement || '';
        document.getElementById('editDescription').value = acc.description || '';
    }

    // Simple placeholder modal for viewing account details (OK button only)
    function showAccountModal(accountNumber) {
        const acc = [...activeAccounts, ...inactiveAccounts].find(a => a.account_number === accountNumber);
        if (!acc) { alert('Account not found.'); return; }

        let modal = document.getElementById('accountViewModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'accountViewModal';
            modal.className = 'modal-overlay';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Account Details</h3>
                    <div id="accountViewBody" style="min-width:320px;">
                    </div>
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
            <p><strong>Balance:</strong> ${(acc.balance !== undefined && acc.balance !== null) ? formatAccounting(acc.balance) : '0.00'}</p>
            <p><strong>Statement:</strong> ${acc.statement || ''}</p>
            <p><strong>Description:</strong> ${acc.description ? String(acc.description).slice(0,400) : ''}</p>
        `;

        modal.style.display = 'flex';
    }

    // initial load
    await loadAccounts();

}

// ----------------------
// Journal TAB
// ----------------------

async function loadJournal() {
    actionContent.innerHTML = '<h2>Journal</h2><p>Journal features coming soon.</p>';
}

// ----------------------
// EVENT LOG TAB
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
        // apply filter
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
        // sort
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

        // attach sorting handlers
        container.querySelectorAll('th.sortable').forEach(th => {
            th.style.cursor = 'pointer';
            th.onclick = () => {
                const col = th.getAttribute('data-col');
                if (sortState.col === col) sortState.asc = !sortState.asc; else { sortState.col = col; sortState.asc = true; }
                render();
            };
        });

        // attach event id listeners
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

        // Lightweight JSON diff to find changed keys (shallow and nested)
        function diffObjects(a, b, path = '') {
            const changes = new Set();
            // if either is not object, compare directly
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

        // Helper to render JSON with highlighted keys that changed in 'after'
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
                    // If this path or any descendant path is in changedSet, mark the key
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

        // small helper to escape HTML
        function escapeHtml(str) {
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        }

        // Inject minimal styles for highlights (only once)
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
            // Render before as pretty JSON (no highlight)
            if (before && typeof before === 'object') beforeEl.innerHTML = `<div style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(before, null, 2))}</div>`;
            else beforeEl.textContent = before ? String(before) : '(empty)';
        } catch (e) { beforeEl.textContent = String(before); }
        try {
            // Render after with highlights for changed keys
            if (after && typeof after === 'object') {
                afterEl.innerHTML = renderJsonWithHighlights(after, changedPaths);
            } else {
                afterEl.textContent = after ? String(after) : '(empty)';
            }
        } catch (e) { afterEl.textContent = String(after); }
        modal.style.display = 'flex';
    }

    // initial fetch
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_event_log_list', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        });
        let data = await res.json();
        if (data && typeof data.body === 'string') {
            try { data = JSON.parse(data.body); } catch (e) { /* leave as-is */ }
        }
        // determine rows
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

    // wire search/filter
    searchEl.addEventListener('input', (e) => { filterTerm = e.target.value || ''; render(); });
    filterColEl.addEventListener('change', (e) => { filterCol = e.target.value || 'all'; render(); });

    render();
}


// ----------------------
// USER REQUEST TAB - working as intended
// ----------------------
async function loadUserRequest() {
    actionContent.innerHTML = '<h2>User Requests</h2><p>Loading requests...</p>';
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_req_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: ADMIN_ID })
        });
        let data = await res.json();
        // Parse double-encoded body if present
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error((data.error) || 'Failed to fetch user requests');

        // Split requests by status
        const pending = (data.requests || []).filter(r => r.status === 'pending');
        const approved = (data.requests || []).filter(r => r.status === 'approved');
        const rejected = (data.requests || []).filter(r => r.status === 'rejected');

        // Pending table
        let pendingHTML = `<h3>Pending Requests</h3>`;
        if (!pending.length) {
            pendingHTML += '<p>No pending user requests.</p>';
        } else {
            pendingHTML += `<table><thead><tr><th>Name</th><th>Email</th><th>Date of Birth</th><th>Requested On</th><th>Role</th><th>Actions</th></tr></thead><tbody>`;
            pending.forEach(u => {
                pendingHTML += `<tr data-user-id="${u.id}">
                    <td>${u.first_name} ${u.last_name}</td>
                    <td>${u.email}</td>
                    <td>${u.dob ? new Date(u.dob).toLocaleDateString() : ''}</td>
                    <td>${u.requested_at ? new Date(u.requested_at).toLocaleDateString() : ''}</td>
                    <td>
                        <select class="role-select">
                            <option value="">Pick a role</option>
                            <option value="administrator">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="accountant">Accountant</option>
                        </select>
                    </td>
                    <td>
                        <button class="approve-btn action-btn">Approve</button>
                        <button class="reject-btn action-btn">Reject</button>
                    </td>
                </tr>`;
            });
            pendingHTML += '</tbody></table>';
        }

        // Approved table
        let approvedHTML = `<h3>Approved Requests</h3>`;
        if (!approved.length) {
            approvedHTML += '<p>No approved requests.</p>';
        } else {
            approvedHTML += `<table><thead><tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Date of Birth</th><th>Status</th><th>Requested At</th><th>Resolved By</th><th>Resolved At</th></tr></thead><tbody>`;
            approved.forEach(u => {
                approvedHTML += `<tr>
                    <td>${u.first_name}</td>
                    <td>${u.last_name}</td>
                    <td>${u.email}</td>
                    <td>${u.dob ? new Date(u.dob).toLocaleDateString() : ''}</td>
                    <td>${u.status}</td>
                    <td>${u.requested_at ? new Date(u.requested_at).toLocaleDateString() : ''}</td>
                    <td>${u.resolved_by || ''}</td>
                    <td>${u.resolved_at ? new Date(u.resolved_at).toLocaleDateString() : ''}</td>
                </tr>`;
            });
            approvedHTML += '</tbody></table>';
        }

        // Rejected table
        let rejectedHTML = `<h3>Rejected Requests</h3>`;
        if (!rejected.length) {
            rejectedHTML += '<p>No rejected requests.</p>';
        } else {
            rejectedHTML += `<table><thead><tr><th>First Name</th><th>Last Name</th><th>Email</th><th>Date of Birth</th><th>Status</th><th>Requested At</th><th>Resolved By</th><th>Resolved At</th></tr></thead><tbody>`;
            rejected.forEach(u => {
                rejectedHTML += `<tr>
                    <td>${u.first_name}</td>
                    <td>${u.last_name}</td>
                    <td>${u.email}</td>
                    <td>${u.dob ? new Date(u.dob).toLocaleDateString() : ''}</td>
                    <td>${u.status}</td>
                    <td>${u.requested_at ? new Date(u.requested_at).toLocaleDateString() : ''}</td>
                    <td>${u.resolved_by || ''}</td>
                    <td>${u.resolved_at ? new Date(u.resolved_at).toLocaleDateString() : ''}</td>
                </tr>`;
            });
            rejectedHTML += '</tbody></table>';
        }

        actionContent.innerHTML = '<h2>User Requests</h2>' + pendingHTML + approvedHTML + rejectedHTML;
        attachUserRequestListeners();
    } catch (err) {
        actionContent.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

function attachUserRequestListeners() {
    document.querySelectorAll('.approve-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const row = btn.closest('tr');
            const reqId = row.dataset.userId;
            const select = row.querySelector('.role-select');
            const role = select.value;
            if (!['administrator', 'manager', 'accountant'].includes(role)) {
                alert('Pick a valid role before approving.');
                select.focus();
                return;
            }
            await approveUserRequest(reqId, role);
        });
    });
    document.querySelectorAll('.reject-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const reqId = btn.closest('tr').dataset.userId;
            await rejectUserRequest(reqId);
        });
    });
}

async function approveUserRequest(reqId, role) {
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_reg_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: ADMIN_ID, request_id: parseInt(reqId), role })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Approval failed');
        alert(data.message || 'User approved and registered.');
        loadUserRequest();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

async function rejectUserRequest(reqId) {
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_reject_req', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: ADMIN_ID, request_id: parseInt(reqId) })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Rejection failed');
        alert(data.message || 'User request rejected.');
        loadUserRequest();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

// ----------------------
// MANAGE USERS TAB - working as intended
// ----------------------
async function loadManageUsers() {
    actionContent.innerHTML = `
        <h2>Manage Users</h2>
        <button id="createUserBtn" style="margin-bottom:20px; font-size:1.1em; padding:10px 20px; border-radius:8px; background:#4CAF50; color:#fff; border:none; font-weight:bold; cursor:pointer;">Create New User</button>
        <div id="createUserModal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.4); z-index:1000; align-items:center; justify-content:center;">
            <div style="background:#fff; padding:32px 28px 24px 28px; border-radius:16px; min-width:340px; max-width:95vw; margin:auto; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                <h2 style="margin-top:0; margin-bottom:18px; text-align:center; color:#333;">Create New User</h2>
                <form id="createUserForm" style="display:flex; flex-direction:column; gap:14px;">
                    <label style="font-weight:500; color:#222;">First Name
                        <input type="text" id="newFirstName" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Last Name
                        <input type="text" id="newLastName" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Email
                        <input type="email" id="newEmail" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Date of Birth
                        <input type="date" id="newDob" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Role
                        <select id="newRole" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                            <option value="">Pick a role</option>
                            <option value="administrator">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="accountant">Accountant</option>
                        </select>
                    </label>
                    <div id="createUserError" style="color:#c00; min-height:18px; font-size:0.98em;"></div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
                        <button type="submit" style="background:#4CAF50; color:#fff; border:none; border-radius:7px; padding:9px 22px; font-size:1em; font-weight:bold; cursor:pointer;">Create</button>
                        <button type="button" id="cancelCreateUser" style="background:#eee; color:#333; border:none; border-radius:7px; padding:9px 22px; font-size:1em; font-weight:bold; cursor:pointer;">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
        <div id="userTables"><p>Loading users...</p></div>
    `;
    // Modal logic
    const modal = document.getElementById('createUserModal');
    document.getElementById('createUserBtn').onclick = () => { modal.style.display = 'flex'; };
    document.getElementById('cancelCreateUser').onclick = () => { modal.style.display = 'none'; };
    document.getElementById('createUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const first_name = document.getElementById('newFirstName').value.trim();
        const last_name = document.getElementById('newLastName').value.trim();
        const email = document.getElementById('newEmail').value.trim();
        const dob = document.getElementById('newDob').value;
        const role = document.getElementById('newRole').value;
        const errorDiv = document.getElementById('createUserError');
        errorDiv.textContent = '';
        if (!first_name || !last_name || !email || !dob || !role) {
            errorDiv.textContent = 'All fields are required.';
            return;
        }
        try {
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_admin_user_create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: ADMIN_ID,
                    first_name,
                    last_name,
                    email,
                    dob,
                    role
                })
            });
            let data = await res.json();
            if (typeof data.body === 'string') {
                try { data = { ...data, ...JSON.parse(data.body) }; } catch (e) {}
            }
            if (!res.ok) throw new Error(data.error || 'Failed to create user');
            alert(data.message || 'User created successfully.');
            modal.style.display = 'none';
            loadManageUsers();
        } catch (err) {
            errorDiv.textContent = err.message;
        }
    };
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: ADMIN_ID })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Failed to fetch users');

    // Split users by status (use is_suspended for accuracy)
    const users = data.users || [];
    console.log('All users:', users);
    // Only show as suspended if is_suspended is true AND suspended_from is not null/empty
    const suspended = users.filter(u => u.is_suspended && u.suspended_from && u.suspended_from !== 'null' && u.suspended_from !== '');
    console.log('Suspended users:', suspended);
    const active = users.filter(u => u.is_active && !u.is_suspended);
    const inactive = users.filter(u => !u.is_active && !u.is_suspended);

    // Build tables as HTML
    let tablesHTML = '';
    // Active users table
    let activeHTML = `<h3>Active Users</h3>`;
    if (!active.length) {
        activeHTML += '<p>No active users.</p>';
    } else {
        activeHTML += `<table><thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
        active.forEach(u => {
            activeHTML += `<tr data-user-id="${u.id}" data-user-username="${u.username}" data-user-fn="${u.first_name}" data-user-ln="${u.last_name}" data-user-email="${u.email}" data-user-role="${u.role}">
                <td>${u.username}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td class="status">Active</td>
                <td>
                    <button class="deactivate-btn action-btn">Deactivate</button>
                    <button class="suspend-btn action-btn">Suspend</button>
                    <button class="edit-info-btn action-btn">Edit Info</button>
                    <button class="email-user-btn action-btn">Email</button>
                </td>
            </tr>`;
        });
        activeHTML += '</tbody></table>';
    }
    tablesHTML += activeHTML;

    // Inactive users table
    let inactiveHTML = `<h3>Inactive Users</h3>`;
    if (!inactive.length) {
        inactiveHTML += '<p>No inactive users.</p>';
    } else {
        inactiveHTML += `<table><thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
        inactive.forEach(u => {
            inactiveHTML += `<tr data-user-id="${u.id}">
                <td>${u.username}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td class="status">Inactive</td>
                <td>
                    <button class="activate-btn action-btn">Activate</button>
                </td>
            </tr>`;
        });
        inactiveHTML += '</tbody></table>';
    }
    tablesHTML += inactiveHTML;

    // Suspended users table
    let suspendedHTML = `<h3>Suspended Users</h3>`;
    if (!suspended.length) {
        suspendedHTML += '<p>No suspended users.</p>';
    } else {
        suspendedHTML += `<table><thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Suspended From</th><th>Suspended To</th><th>Status</th><th>Actions</th></tr></thead><tbody>`;
        suspended.forEach(u => {
            suspendedHTML += `<tr data-user-id="${u.id}">
                <td>${u.username}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${u.suspended_from ? new Date(u.suspended_from).toLocaleDateString() : ''}</td>
                <td>${u.suspended_to ? new Date(u.suspended_to).toLocaleDateString() : ''}</td>
                <td class="status">Suspended</td>
                <td>
                    <button class="unsuspend-btn action-btn">Unsuspend</button>
                </td>
            </tr>`;
        });
        suspendedHTML += '</tbody></table>';
    }
    tablesHTML += suspendedHTML;

    // Insert tables into the userTables div
    document.getElementById('userTables').innerHTML = tablesHTML;
    attachUserActionListeners();
    attachEditInfoListeners();
    attachEmailUserListeners();
// Attach listeners for Email User buttons
function attachEmailUserListeners() {
    document.querySelectorAll('.email-user-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            showEmailUserModal({
                id: row.dataset.userId,
                first_name: row.dataset.userFn,
                last_name: row.dataset.userLn,
                email: row.dataset.userEmail
            });
        });
    });
}

// Show Email User modal
function showEmailUserModal(user) {
    // Get admin info from localStorage
    let admin = { first_name: '', last_name: '', email: '' };
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u) admin = { first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '' };
    } catch (e) {}
    // Create modal HTML if not present
    let modal = document.getElementById('emailUserModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'emailUserModal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '1002';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="background:#fff; padding:32px 28px 24px 28px; border-radius:16px; min-width:340px; max-width:95vw; margin:auto; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                <h2 style="margin-top:0; margin-bottom:18px; text-align:center; color:#333;">Send Email to User</h2>
                <form id="emailUserForm" style="display:flex; flex-direction:column; gap:14px;">
                    <label style="font-weight:500; color:#222;">To (User Email)
                        <input type="email" id="emailUserEmail" readonly style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em; background:#f5f5f5; color:#888;">
                    </label>
                    <label style="font-weight:500; color:#222;">Message
                        <textarea id="emailUserMessage" required rows="5" style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em; resize:vertical; min-height:80px;"></textarea>
                    </label>
                    <div id="emailUserError" style="color:#c00; min-height:18px; font-size:0.98em;"></div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
                        <button type="submit" class="confirm-btn primary-green action-btn">Send Email</button>
                        <button type="button" id="cancelEmailUser" class="cancel-btn action-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    // Prefill form
    modal.querySelector('#emailUserEmail').value = user.email || '';
    modal.querySelector('#emailUserMessage').value = '';
    // Show modal
    modal.style.display = 'flex';
    // Cancel button
    modal.querySelector('#cancelEmailUser').onclick = () => { modal.style.display = 'none'; };
    // Submit handler
    modal.querySelector('#emailUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const messageField = modal.querySelector('#emailUserMessage');
        const errorDiv = modal.querySelector('#emailUserError');
        errorDiv.textContent = '';
        let msg = messageField.value.trim();
        if (!msg) {
            errorDiv.textContent = 'Message is required.';
            return;
        }
        // Add admin info and disclaimer
        msg += `\n\n---\nThis message was sent by ${admin.first_name} ${admin.last_name} (${admin.email}).\nSend replies to ${admin.email}. This inbox is not monitored.`;
        // Compose a fake event for sendEmail
        const fakeEvent = {
            preventDefault: () => {},
            target: {
                elements: [
                    { id: 'userEmail', value: user.email },
                    { id: 'message', value: msg }
                ]
            }
        };
        // Call sendEmail with correct info
        await sendEmailToUser({
            user_email: user.email,
            message: msg,
            first_name: user.first_name,
            last_name: user.last_name,
            admin_email: admin.email,
            admin_first_name: admin.first_name,
            admin_last_name: admin.last_name,
            admin_id: ADMIN_ID,
            modal
        }, errorDiv);
    };
}

// Helper to call sendEmail with correct info
async function sendEmailToUser({ user_email, message, first_name, last_name, admin_email, admin_first_name, admin_last_name, admin_id, modal }, errorDiv) {
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_send_email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                admin_id: admin_id,
                admin_email: admin_email || 'admin@example.com',
                first_name: first_name || 'User',
                last_name: last_name || 'User',
                user_email,
                message
            })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Failed to send email');
        alert(data.message || 'Email sent');
        if (modal) modal.style.display = 'none';
    } catch (err) {
        errorDiv.textContent = err.message;
    }
}
    } catch (err) {
        actionContent.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
// Attach listeners for Edit Info buttons
function attachEditInfoListeners() {
    document.querySelectorAll('.edit-info-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const row = btn.closest('tr');
            showEditUserModal({
                id: row.dataset.userId,
                username: row.dataset.userUsername,
                first_name: row.dataset.userFn,
                last_name: row.dataset.userLn,
                email: row.dataset.userEmail,
                role: row.dataset.userRole
            });
        });
    });
}

// Show Edit User modal (reuses create user modal with prefill and update logic)
function showEditUserModal(user) {
    // Create modal HTML if not present
    let modal = document.getElementById('editUserModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'editUserModal';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '1001';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.innerHTML = `
            <div style="background:#fff; padding:32px 28px 24px 28px; border-radius:16px; min-width:340px; max-width:95vw; margin:auto; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                <h2 style="margin-top:0; margin-bottom:18px; text-align:center; color:#333;">Edit User Info</h2>
                <form id="editUserForm" style="display:flex; flex-direction:column; gap:14px;">
                    <label style="font-weight:500; color:#222;">First Name
                        <input type="text" id="editFirstName" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Last Name
                        <input type="text" id="editLastName" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Email
                        <input type="email" id="editEmail" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                    </label>
                    <label style="font-weight:500; color:#222;">Role
                        <select id="editRole" required style="margin-top:4px; padding:8px; border-radius:7px; border:1.5px solid #bbb; font-size:1em;">
                            <option value="">Pick a role</option>
                            <option value="administrator">Administrator</option>
                            <option value="manager">Manager</option>
                            <option value="accountant">Accountant</option>
                        </select>
                    </label>
                    <div id="editUserError" style="color:#c00; min-height:18px; font-size:0.98em;"></div>
                    <div style="display:flex; gap:12px; justify-content:flex-end; margin-top:8px;">
                        <button type="submit" class="confirm-btn primary-green action-btn">Update Info</button>
                        <button type="button" id="cancelEditUser" class="cancel-btn action-btn">Cancel</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);
    }
    // Prefill form
    modal.querySelector('#editFirstName').value = user.first_name || '';
    modal.querySelector('#editLastName').value = user.last_name || '';
    modal.querySelector('#editEmail').value = user.email || '';
    modal.querySelector('#editRole').value = user.role || '';
    // Show modal
    modal.style.display = 'flex';
    // Cancel button
    modal.querySelector('#cancelEditUser').onclick = () => { modal.style.display = 'none'; };
    // Submit handler
    modal.querySelector('#editUserForm').onsubmit = async (e) => {
        e.preventDefault();
        const first_name = modal.querySelector('#editFirstName').value.trim();
        const last_name = modal.querySelector('#editLastName').value.trim();
        const email = modal.querySelector('#editEmail').value.trim();
        const role = modal.querySelector('#editRole').value;
        const errorDiv = modal.querySelector('#editUserError');
        errorDiv.textContent = '';
        if (!first_name || !last_name || !email || !role) {
            errorDiv.textContent = 'All fields are required.';
            return;
        }
        try {
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_edit_user_info', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    admin_id: ADMIN_ID,
                    user_id: parseInt(user.id),
                    first_name,
                    last_name,
                    email,
                    role
                })
            });
            let data = await res.json();
            if (typeof data.body === 'string') {
                try { data = { ...data, ...JSON.parse(data.body) }; } catch (e) {}
            }
            if (!res.ok) throw new Error(data.error || 'Failed to update user info');
            alert(data.message || 'User info updated.');
            modal.style.display = 'none';
            loadManageUsers();
        } catch (err) {
            errorDiv.textContent = err.message;
        }
    };
}
}

function attachUserActionListeners() {
    document.querySelectorAll('.activate-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.closest('tr').dataset.userId;
            showActivateModal(userId);
        });
    });
    document.querySelectorAll('.deactivate-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.closest('tr').dataset.userId;
            showDeactivateModal(userId);
        });
    });
    document.querySelectorAll('.suspend-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.closest('tr').dataset.userId;
            showSuspendModal(userId);
        });
    });
    document.querySelectorAll('.unsuspend-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const userId = btn.closest('tr').dataset.userId;
            showUnsuspendModal(userId);
        });
    });
}

async function performUserAction(userId, action, suspended_from = null, suspended_to = null) {
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_actions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: parseInt(userId), action, suspended_from, suspended_to })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Action failed');
        // Show a default message if none is provided
        let msg = data.message;
        if (!msg) {
            if (action === 'unsuspend') {
                msg = 'User unsuspended.';
            } else if (action === 'suspend') {
                msg = 'User suspended.';
            } else if (action === 'activate') {
                msg = 'User activated.';
            } else if (action === 'deactivate') {
                msg = 'User deactivated.';
            } else {
                msg = 'Action completed.';
            }
        }
        alert(msg);
        loadManageUsers();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
}

// ----------------------
// EXPIRED PASSWORDS REPORT - working as intended
// ----------------------
async function loadExpiredPasswordsReport() {
    const reportDiv = document.getElementById('reportContent');
    reportDiv.innerHTML = '<p>Loading report...</p>';
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: ADMIN_ID })
        });
        let data = await res.json();
        if (typeof data.body === 'string') {
            try {
                data = { ...data, ...JSON.parse(data.body) };
            } catch (e) {}
        }
        if (!res.ok) throw new Error(data.error || 'Failed to fetch users');

        const expiredUsers = data.users.filter(u => u.password_expires_at && new Date(u.password_expires_at) <= new Date());
        if (!expiredUsers.length) return reportDiv.innerHTML = '<p>No expired passwords.</p>';

        let tableHTML = `<table>
            <thead><tr><th>Username</th><th>Name</th><th>Email</th><th>Role</th><th>Password Expired On</th></tr></thead><tbody>`;
        expiredUsers.forEach(u => {
            tableHTML += `<tr>
                <td>${u.username}</td>
                <td>${u.first_name} ${u.last_name}</td>
                <td>${u.email}</td>
                <td>${u.role}</td>
                <td>${new Date(u.password_expires_at).toLocaleDateString()}</td>
            </tr>`;
        });
        tableHTML += '</tbody></table>';
        reportDiv.innerHTML = tableHTML;
    } catch (err) {
        reportDiv.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
    }
}

// Create and show deactivate confirmation modal
function showDeactivateModal(userId) {
    let modal = document.getElementById('deactivateConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'deactivateConfirmModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Deactivation</h3>
                <p>Are you sure you want to deactivate this user?</p>
                <p>They will lose access until reactivated.</p>
                <div class="modal-actions">
                    <button id="confirmDeactivateBtn" class="confirm-btn">Deactivate</button>
                    <button id="cancelDeactivateBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#cancelDeactivateBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.querySelector('#confirmDeactivateBtn').addEventListener('click', async () => {
            try {
                await performUserAction(userId, 'deactivate');
                modal.style.display = 'none';
            } catch (e) {
                alert(e.message || 'Failed to deactivate user.');
            }
        });
    }
    modal.style.display = 'flex';
}

// Create and show activate confirmation modal
function showActivateModal(userId) {
    let modal = document.getElementById('activateConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'activateConfirmModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Activation</h3>
                <p>Are you sure you want to activate this user? They will regain access.</p>
                <div class="modal-actions">
                    <button id="confirmActivateBtn" class="confirm-btn primary-green">Activate</button>
                    <button id="cancelActivateBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#cancelActivateBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.querySelector('#confirmActivateBtn').addEventListener('click', async () => {
            try {
                await performUserAction(userId, 'activate');
                modal.style.display = 'none';
            } catch (e) {
                alert(e.message || 'Failed to activate user.');
            }
        });
    }
    modal.style.display = 'flex';
}

// Create and show unsuspend confirmation modal
function showUnsuspendModal(userId) {
    let modal = document.getElementById('unsuspendConfirmModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'unsuspendConfirmModal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Confirm Unsuspend</h3>
                <p>Are you sure you want to unsuspend this user? They will regain access immediately.</p>
                <div class="modal-actions">
                    <button id="confirmUnsuspendBtn" class="confirm-btn primary-green">Unsuspend</button>
                    <button id="cancelUnsuspendBtn" class="cancel-btn">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        modal.querySelector('#cancelUnsuspendBtn').addEventListener('click', () => {
            modal.style.display = 'none';
        });
        modal.querySelector('#confirmUnsuspendBtn').addEventListener('click', async () => {
            try {
                await performUserAction(userId, 'unsuspend', null, null);
                modal.style.display = 'none';
            } catch (e) {
                alert(e.message || 'Failed to unsuspend user.');
            }
        });
    }
    modal.style.display = 'flex';
}

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

// Topbar date/time clock: update every second
function startTopbarClock() {
    try {
        const el = document.getElementById('topbarDateTime');
        if (!el) return;
        function tick() {
            el.textContent = new Date().toLocaleString();
        }
        tick();
        const existing = el.__topbarClockId;
        if (existing) clearInterval(existing);
        el.__topbarClockId = setInterval(tick, 1000);
    } catch (err) {
        console.error('topbar clock init failed', err);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    startTopbarClock();
    initButtonTooltips();
});

// Add informative tooltips to buttons that are missing a title attribute.
function initButtonTooltips() {
    try {
        const commonMap = new Map([
            ['createAccBtn', 'Create a new account'],
            ['createUserBtn', 'Create a new user account'],
            ['confirmLogoutBtn', 'Confirm logout'],
            ['cancelLogoutBtn', 'Cancel logout'],
            ['confirmDeactivateBtn', 'Confirm deactivation'],
            ['cancelDeactivateBtn', 'Cancel deactivation'],
            ['confirmActivateBtn', 'Confirm activation'],
            ['cancelActivateBtn', 'Cancel activation'],
            ['confirmSuspendBtn', 'Confirm suspend'],
            ['cancelSuspendBtn', 'Cancel suspend'],
            ['confirmUnsuspendBtn', 'Confirm unsuspend'],
            ['cancelUnsuspendBtn', 'Cancel unsuspend'],
            ['accountViewOk', 'Close account view'],
            ['closeEventModal', 'Close event details'],
        ]);

        function applyTooltipToButton(btn) {
            if (!btn || !(btn instanceof HTMLElement) || btn.tagName !== 'BUTTON') return;
            if (btn.title && btn.title.trim().length) return; // already has tooltip
            // explicit id-based mapping
            if (btn.id && commonMap.has(btn.id)) { btn.title = commonMap.get(btn.id); return; }
            // data attributes (like data-account-number, data-event-id) give context
            if (btn.dataset && Object.keys(btn.dataset).length) {
                const entries = Object.entries(btn.dataset).map(([k,v]) => `${k.replace(/([A-Z])/g,' $1')}: ${v}`).join('; ');
                btn.title = btn.textContent.trim() ? `${btn.textContent.trim()} — ${entries}` : entries;
                return;
            }
            // class-based hints
            const cls = btn.className || '';
            if (cls.includes('edit-acc-btn')) { btn.title = 'Edit this account'; return; }
            if (cls.includes('deactivate-acc-btn') || cls.includes('deactivate-btn')) { btn.title = 'Deactivate this account'; return; }
            if (cls.includes('activate-acc-btn') || cls.includes('activate-btn')) { btn.title = 'Activate this account'; return; }
            if (cls.includes('approve-btn')) { btn.title = 'Approve the selected item'; return; }
            if (cls.includes('reject-btn')) { btn.title = 'Reject the selected item'; return; }
            if (cls.includes('tab-btn')) { btn.title = `Switch to ${btn.getAttribute('data-tab') || btn.textContent.trim()} tab`; return; }
            // fallback: use visible text
            const text = btn.textContent && btn.textContent.trim();
            if (text) btn.title = text;
        }

        // initial pass
        Array.from(document.querySelectorAll('button')).forEach(applyTooltipToButton);

        // observe dynamic additions (e.g., action column buttons added when tabs change)
        const observer = new MutationObserver(mutations => {
            for (const m of mutations) {
                if (m.type === 'childList' && m.addedNodes && m.addedNodes.length) {
                    m.addedNodes.forEach(node => {
                        if (!(node instanceof HTMLElement)) return;
                        if (node.tagName === 'BUTTON') applyTooltipToButton(node);
                        // also scan within the added subtree
                        node.querySelectorAll && node.querySelectorAll('button') && Array.from(node.querySelectorAll('button')).forEach(applyTooltipToButton);
                    });
                }
            }
        });
        // watch the main content area if present, otherwise body
        const target = document.getElementById('actionContent') || document.body;
        observer.observe(target, { childList: true, subtree: true });
    } catch (err) {
        console.error('initButtonTooltips failed', err);
    }
}