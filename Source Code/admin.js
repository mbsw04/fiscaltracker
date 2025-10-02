const actionContent = document.getElementById('actionContent');
const tabs = document.querySelectorAll('.tab-btn');

// Tab click handler
tabs.forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelector('.tab-btn.active').classList.remove('active');
        tab.classList.add('active');
        const selectedTab = tab.getAttribute('data-tab');
        updateContent(selectedTab);
    });
});

// Initial load
updateContent('viewUsers');

function updateContent(tab) {
    switch(tab) {
        case 'viewUsers':
            loadViewUsers();
            break;
        case 'manageAccounts':
            loadManageAccounts();
            break;
        case 'generateReports':
            case 'generateReports':
                actionContent.innerHTML = `
                <h2>Generate Reports</h2>
                <button id="expiredPasswordsBtn">Expired Passwords</button>
                <div id="reportContent" style="margin-top: 20px;"></div>
    `;

    document.getElementById('expiredPasswordsBtn').addEventListener('click', loadExpiredPasswordsReport);
    break;
        case 'emailUser':
            actionContent.innerHTML = `
                <h2>Email User</h2>
                <form>
                    <label for="userEmail">User Email:</label>
                    <input type="email" id="userEmail" required>
                    <br><br>
                    <label for="message">Message:</label>
                    <textarea id="message" rows="10" cols="50"></textarea>
                    <br><br>
                    <button id="email-btn" class="sendEmailbtn">Send Email</button>
                </form>
            `;
            break;
        default:
            actionContent.innerHTML = '';
    }
}
//For testing without api calls
// --- MOCK USERS FOR TESTING ---
async function loadViewUsers() {
    actionContent.innerHTML = '<h2>View Users</h2><p>Loading users...</p>';

    const data = {
        users: [
            { id: 1, username: 'jdoe', first_name: 'John', last_name: 'Doe', email: 'jdoe@example.com', role: 'accountant', is_active: true },
            { id: 2, username: 'asmith', first_name: 'Alice', last_name: 'Smith', email: 'asmith@example.com', role: 'manager', is_active: false },
            { id: 3, username: 'bking', first_name: 'Bob', last_name: 'King', email: 'bking@example.com', role: 'analyst', is_active: true },
            { id: 4, username: 'clark', first_name: 'Clara', last_name: 'Johnson', email: 'clark@example.com', role: 'admin', is_active: false }
        ]
    };

    let tableHTML = `
        <table border="1" cellpadding="5" cellspacing="0">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.users.forEach(user => {
        const status = user.is_active ? 'Active' : 'Inactive';
        tableHTML += `
            <tr>
                <td>${user.username}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${status}</td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    actionContent.innerHTML = '<h2>View Users</h2>' + tableHTML;
}

async function loadManageAccounts() {
    actionContent.innerHTML = '<h2>Manage Accounts</h2><p>Loading accounts...</p>';

    const data = {
        users: [
            { id: 1, username: 'jdoe', first_name: 'John', last_name: 'Doe', email: 'jdoe@example.com', role: 'accountant', is_active: true },
            { id: 2, username: 'asmith', first_name: 'Alice', last_name: 'Smith', email: 'asmith@example.com', role: 'manager', is_active: false }
        ]
    };

    let tableHTML = `
        <table border="1" cellpadding="5" cellspacing="0">
            <thead>
                <tr>
                    <th>Username</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.users.forEach(user => {
        const status = user.is_active ? 'Active' : 'Inactive';
        tableHTML += `
            <tr data-user-id="${user.id}">
                <td>${user.username}</td>
                <td>${user.first_name} ${user.last_name}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td class="status">${status}</td>
                <td>
                    ${user.is_active 
                        ? `<button class="deactivate-btn">Deactivate</button>`
                        : `<button class="activate-btn">Activate</button>`}
                    <button class="suspend-btn">Suspend</button>
                </td>
            </tr>
        `;
    });

    tableHTML += '</tbody></table>';
    actionContent.innerHTML = '<h2>Manage Accounts</h2>' + tableHTML;

    attachUserActionListeners();
}
async function loadExpiredPasswordsReport() {
    const reportDiv = document.getElementById('reportContent');
    reportDiv.innerHTML = '<p>Loading report...</p>';

    try {
        // --- TEMP MOCK DATA FOR TESTING ---
        const data = {
            users: [
                { 
                    username: 'jdoe', first_name: 'John', last_name: 'Doe', 
                    email: 'jdoe@example.com', role: 'accountant', 
                    password_expires_at: '2025-10-01T00:00:00Z' 
                },
                { 
                    username: 'asmith', first_name: 'Alice', last_name: 'Smith', 
                    email: 'asmith@example.com', role: 'manager', 
                    password_expires_at: '2025-09-29T00:00:00Z' 
                }
            ]
        };
        const users = data.users;

        if (!users || users.length === 0) {
            reportDiv.innerHTML = '<p>No expired passwords found.</p>';
            return;
        }

        let tableHTML = `
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Password Expired On</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const expiredDate = new Date(user.password_expires_at).toLocaleDateString();
            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${expiredDate}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        reportDiv.innerHTML = tableHTML;

    } catch (err) {
        reportDiv.innerHTML = `<p>Error loading report: ${err.message}</p>`;
    }
}    




/*async function loadViewUsers() {
    actionContent.innerHTML = '<h2>View Users</h2><p>Loading users...</p>';

    try {
        const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: 1001 })
        });

        const data = await response.json();
        const users = data.users;

        if (!users || users.length === 0) {
            actionContent.innerHTML = '<h2>View Users</h2><p>No users found.</p>';
            return;
        }

        let tableHTML = `
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const status = user.is_active ? 'Active' : 'Inactive';
            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${status}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        actionContent.innerHTML = '<h2>View Users</h2>' + tableHTML;

    } catch (err) {
        actionContent.innerHTML = `<p>Error loading users: ${err.message}</p>`;
    }
}

/* -------------------------
   MANAGE ACCOUNTS
------------------------- */
/*async function loadManageAccounts() {
    actionContent.innerHTML = '<h2>Manage Accounts</h2><p>Loading accounts...</p>';

    try {
        const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: 1001 })
        });

        const data = await response.json();
        const users = data.users;

        if (!users || users.length === 0) {
            actionContent.innerHTML = '<h2>Manage Accounts</h2><p>No accounts found.</p>';
            return;
        }

        let tableHTML = `
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const status = user.is_active ? 'Active' : 'Inactive';
            tableHTML += `
                <tr data-user-id="${user.id}">
                    <td>${user.username}</td>
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td class="status">${status}</td>
                    <td>
                        ${user.is_active 
                            ? `<button class="deactivate-btn">Deactivate</button>`
                            : `<button class="activate-btn">Activate</button>`}
                        <button class="suspend-btn">Suspend</button>
                    </td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        actionContent.innerHTML = '<h2>Manage Accounts</h2>' + tableHTML;

        attachUserActionListeners();

    } catch (err) {
        actionContent.innerHTML = `<p>Error loading accounts: ${err.message}</p>`;
    }
}

/* -------------------------
   GENERATE REPORTS
------------------------- */    
/*async function loadExpiredPasswordsReport() {
    const reportDiv = document.getElementById('reportContent');
    reportDiv.innerHTML = '<p>Loading report...</p>';

    try {
        const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_expired_passwords', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ admin_id: 1001 })
        });

        const data = await response.json();
        const users = data.users;

        if (!users || users.length === 0) {
            reportDiv.innerHTML = '<p>No expired passwords found.</p>';
            return;
        }

        let tableHTML = `
            <table border="1" cellpadding="5" cellspacing="0">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Password Expired On</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const expiredDate = new Date(user.password_expires_at).toLocaleDateString();
            tableHTML += `
                <tr>
                    <td>${user.username}</td>
                    <td>${user.first_name} ${user.last_name}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${expiredDate}</td>
                </tr>
            `;
        });

        tableHTML += '</tbody></table>';
        reportDiv.innerHTML = tableHTML;

    } catch (err) {
        reportDiv.innerHTML = `<p>Error loading report: ${err.message}</p>`;
    }
}
*/
/* -------------------------
   BUTTON ACTIONS
------------------------- */
function attachUserActionListeners() {
    document.querySelectorAll('.activate-btn').forEach(btn => {
        btn.addEventListener('click', () => handleUserAction(btn, 'activate'));
    });

    document.querySelectorAll('.deactivate-btn').forEach(btn => {
        btn.addEventListener('click', () => handleUserAction(btn, 'deactivate'));
    });

    document.querySelectorAll('.suspend-btn').forEach(btn => {
        btn.addEventListener('click', () => showSuspendPrompt(btn));
    });
}

async function handleUserAction(button, action, from=null, to=null) {
    const tr = button.closest('tr');
    const userId = tr.getAttribute('data-user-id');

    const payload = { user_id: userId, action };
    if (action === 'suspend') {
        payload.suspended_from = from;
        payload.suspended_to = to;
    }

    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_action', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok) {
            alert(data.message);
            loadManageAccounts();
        } else {
            alert(data.error || 'Action failed');
        }

    } catch (err) {
        alert('Error: ' + err.message);
    }
}

function showSuspendPrompt(button) {
    const from = prompt('Enter suspension start date (YYYY-MM-DD):');
    const to = prompt('Enter suspension end date (YYYY-MM-DD):');
    if (from && to) handleUserAction(button, 'suspend', from, to);
}