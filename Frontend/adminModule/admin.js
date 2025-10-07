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

// Tab click handler
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.tab-btn.active').classList.remove('active');
        tab.classList.add('active');
        updateContent(tab.getAttribute('data-tab'));
    });
});

// Initial load
updateContent('chartOfAccounts');

function updateContent(tab) {
    switch(tab) {
        case 'chartOfAccounts':
            loadChartOfAccounts();
            break;
        case 'journal':
            loadJournal();
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
    actionContent.innerHTML = '<h2>Chart of Accounts</h2><p>Chart of accounts features coming soon.</p>';
}

// ----------------------
// Journal TAB
// ----------------------

async function loadJournal() {
    actionContent.innerHTML = '<h2>Journal</h2><p>Journal features coming soon.</p>';
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