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
        
        // Set dashboard title based on role
        const role = (user && user.role) ? user.role.toString().toLowerCase() : 'accountant';
        const dashboardTitle = document.getElementById('dashboardTitle');
        if (dashboardTitle) {
            if (role === 'manager') {
                dashboardTitle.textContent = 'Manager Dashboard';
            } else if (role === 'accountant') {
                dashboardTitle.textContent = 'Accountant Dashboard';
            } else {
                dashboardTitle.textContent = 'Dashboard';
            }
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
            <div class="modal-content" style="position: relative;">
                <button type="button" id="closeLogoutModal" class="modal-close-x" style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>
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

// Global variables for email functionality
let allUsers = [];

// Global user fetching function
async function fetchUsers() {
  try {
    const res = await fetch(
      'https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_user_list',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_id: ADMIN_ID }),
      }
    );

    let data = await res.json();
    if (data.body) {
      data = JSON.parse(data.body);
    }

    if (!res.ok) throw new Error(data.error || 'Failed to fetch users');

    const filtered = data.users.filter(u => {
      const role = (u.role || '').toLowerCase();
      return role === 'manager' || role === 'accountant';
    });

    console.log('Fetched + filtered users:', filtered);
    return filtered;

  } catch (err) {
    console.error('fetchUsers error:', err);
    return [];
  }
}

// Fetch users immediately when the script loads
(async () => {
    try {
        allUsers = await fetchUsers();
        console.log('Global allUsers populated:', allUsers);
    } catch (err) {
        console.error('Failed to populate global users:', err);
    }
})();

// Global email modal function
async function openEmailModal() {
    // Fetch admin info from localStorage
    let admin = { first_name: '', last_name: '', email: '' };
    try {
        const u = JSON.parse(localStorage.getItem('user'));
        if (u) admin = { first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '' };
    } catch (e) {}

    // Create modal if not exists
    let modal = document.getElementById('emailModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'emailModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'none';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100vw';
        modal.style.height = '100vh';
        modal.style.background = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '1002';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';

        modal.innerHTML = `
            <div class="modal-content" style="background:#fff; padding:32px 28px; border-radius:16px; max-width:500px; width:90%; position:relative; box-shadow:0 8px 32px rgba(0,0,0,0.25);">
                <button type="button" id="closeEmailUserModal" class="modal-close-x" style="position:absolute; top:12px; right:12px; font-size:1.5em; background:none; border:none; cursor:pointer;">&times;</button>
                <h3 style="text-align:center; margin-bottom:18px;">Send Email</h3>
                <form id="emailForm" style="display:flex; flex-direction:column; gap:12px;">
                    <label>Recipient Email
                        <input type="email" id="emailRecipient" required placeholder="user@example.com" style="width:100%; padding:8px; border-radius:7px; border:1px solid #ccc;">
                    </label>
                    <label>Subject
                        <input type="text" id="emailSubject" required placeholder="Subject" style="width:100%; padding:8px; border-radius:7px; border:1px solid #ccc;">
                    </label>
                    <label>Message
                        <textarea id="emailMessage" required style="width:100%; padding:8px; border-radius:7px; border:1px solid #ccc; height:120px;"></textarea>
                    </label>
                    <div id="emailError" style="color:red; min-height:18px;"></div>
                    <div style="display:flex; justify-content:flex-end; gap:12px;">
                        <button type="submit" class="email-user-btn" style="background-color:#9e9e9e; border-color:#757575; color:#fff; padding:8px 16px; border-radius:7px;">Send Email</button>
                        <button type="button" id="clearEmailForm" style="padding:8px 16px; border-radius:7px; border:1px solid #ccc; background:#f8f9fa; color:#333;">Clear</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal
        modal.querySelector('#closeEmailUserModal').onclick = () => { modal.style.display = 'none'; };

        // Clear form
        modal.querySelector('#clearEmailForm').onclick = () => {
            modal.querySelector('#emailForm').reset();
            modal.querySelector('#emailError').textContent = '';
        };

        // Handle form submission
        const emailForm = modal.querySelector('#emailForm');
        emailForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            modal.querySelector('#emailError').textContent = '';

            const userEmail = modal.querySelector('#emailRecipient').value.trim();
            const subject = modal.querySelector('#emailSubject').value.trim();
            const message = modal.querySelector('#emailMessage').value.trim();
            
            if (!userEmail || !subject || !message) { 
                modal.querySelector('#emailError').textContent = 'Please fill all fields';
                return;
            }

            try {
                const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_send_email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        admin_id: ADMIN_ID,
                        admin_email: admin.email,
                        user_email: userEmail,
                        first_name: '',
                        last_name: '',
                        message: `Subject: ${subject}\n\n${message}`
                    })
                });

                let data = await res.json();
                if (data.body && typeof data.body === 'string') {
                    try { data = { ...data, ...JSON.parse(data.body) }; } catch(e) {}
                }

                if (!res.ok) throw new Error(data.error || 'Failed to send email');

                alert(data.message || 'Email sent successfully');
                emailForm.reset();
                modal.style.display = 'none';

            } catch (err) {
                modal.querySelector('#emailError').textContent = err.message;
            }
        });
    }

    // Show modal
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
updateContent('dashboard');

function updateContent(tab) {
    switch(tab) {
        case 'dashboard': loadDashboard(); break;
        case 'chartOfAccounts': loadChartOfAccounts(); break;
        case 'reports': loadReports(); break;
        case 'journal': loadJournal(); break;
        case 'eventLog': loadEventLog(); break;
        default: actionContent.innerHTML = '';
    }
}

// Function to fetch and update pending journal entries badge
async function updatePendingJournalBadge() {
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        });
        
        let data = await res.json();
        
        // Parse the body if it's a string
        if (data.body && typeof data.body === 'string') {
            try {
                data = JSON.parse(data.body);
            } catch (e) {
                console.error('Error parsing trans_list response:', e);
                return;
            }
        }
        
        // Handle if data is directly an array or wrapped
        const transactions = Array.isArray(data) ? data : (data.transactions || []);
        
        // Count pending transactions
        const pendingCount = transactions.filter(t => 
            (t.status || '').toLowerCase() === 'pending'
        ).length;
        
        // Find or create the journal tab
        const journalTab = document.querySelector('button[data-tab="journal"]');
        if (journalTab) {
            // Remove existing badge if present
            const existingBadge = journalTab.querySelector('.pending-badge');
            if (existingBadge) {
                existingBadge.remove();
            }
            
            // Add badge if there are pending entries
            if (pendingCount > 0) {
                const badge = document.createElement('span');
                badge.className = 'pending-badge';
                badge.textContent = pendingCount;
                badge.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background: #f44336;
                    color: white;
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 12px;
                    font-weight: bold;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
                `;
                
                // Make journal tab position relative if not already
                if (getComputedStyle(journalTab).position === 'static') {
                    journalTab.style.position = 'relative';
                }
                
                journalTab.appendChild(badge);
            }
        }
    } catch (err) {
        console.error('Error fetching pending journal count:', err);
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
    // Fetch pending journal count for managers
    if (CURRENT_ROLE === 'manager') {
        updatePendingJournalBadge();
    }
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
// DASHBOARD TAB (accountant/manager)
// ----------------------
async function loadDashboard() {
    actionContent.innerHTML = `
        <h2>Dashboard</h2>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 20px;">
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Current Ratio</h3>
                <div id="currentRatioContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
            
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Return on Assets</h3>
                <div id="roaContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
            
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Return on Equity</h3>
                <div id="roeContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
            
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Net Profit Margin</h3>
                <div id="npmContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
            
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Asset Turnover</h3>
                <div id="assetTurnoverContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
            
            <div style="background: #fff; border-radius: 8px; padding: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);">
                <h3 style="margin-top: 0; color: #333;">Quick Ratio</h3>
                <div id="quickRatioContent" style="color: #666; min-height: 150px;">
                    <p style="text-align: center; padding-top: 40px;">Loading...</p>
                </div>
            </div>
        </div>
    `;
    
    // Fetch accounts and calculate ratios
    await calculateAndDisplayRatios();
}

async function calculateAndDisplayRatios() {
    try {
        // Fetch all accounts
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        });
        
        let data = await res.json();
        if (data.body && typeof data.body === 'string') {
            data = JSON.parse(data.body);
        }
        
        const accounts = Array.isArray(data) ? data : (data.accounts || []);
        const activeAccounts = accounts.filter(acc => acc.is_active);
        
        // Calculate account totals by category and subcategory
        let currentAssets = 0;
        let totalAssets = 0;
        let currentLiabilities = 0;
        let totalLiabilities = 0;
        let totalEquity = 0;
        let totalRevenue = 0;
        let netIncome = 0;
        let inventory = 0;
        
        activeAccounts.forEach(acc => {
            const balance = parseFloat(acc.balance) || 0;
            const category = (acc.category || '').toLowerCase();
            const subcategory = (acc.subcategory || '').toLowerCase();
            
            // Assets
            if (category === 'assets' || category === 'asset') {
                totalAssets += Math.abs(balance);
                if (subcategory.includes('current')) {
                    currentAssets += Math.abs(balance);
                    // Identify inventory accounts (typically named with 'inventory' or 'stock')
                    if (acc.account_name.toLowerCase().includes('inventory') || 
                        acc.account_name.toLowerCase().includes('stock')) {
                        inventory += Math.abs(balance);
                    }
                }
            }
            
            // Liabilities
            if (category === 'liabilities' || category === 'liability') {
                totalLiabilities += Math.abs(balance);
                if (subcategory.includes('current')) {
                    currentLiabilities += Math.abs(balance);
                }
            }
            
            // Equity
            if (category === 'ownerequity' || category === 'owner equity' || category === 'equity') {
                totalEquity += Math.abs(balance);
            }
            
            // Revenue
            if (category === 'revenue' || category === 'income') {
                totalRevenue += Math.abs(balance);
            }
        });
        
        // Calculate net income (revenue - expenses)
        let totalExpenses = 0;
        activeAccounts.forEach(acc => {
            const category = (acc.category || '').toLowerCase();
            if (category === 'expenses' || category === 'expense') {
                totalExpenses += Math.abs(parseFloat(acc.balance) || 0);
            }
        });
        netIncome = totalRevenue - totalExpenses;
        
        // Helper function to get color based on ratio value and thresholds
        function getRatioColor(value, goodMin, warningMin) {
            if (value >= goodMin) return '#4CAF50'; // Green
            if (value >= warningMin) return '#FFC107'; // Yellow
            return '#f44336'; // Red
        }
        
        // Helper function to format ratio display
        function formatRatioDisplay(title, value, formula, goodMin, warningMin, isPercentage = false) {
            const displayValue = isPercentage ? (value * 100).toFixed(2) + '%' : value.toFixed(2);
            const color = getRatioColor(value, goodMin, warningMin);
            
            return `
                <div style="text-align: center; padding: 20px 0;">
                    <div style="font-size: 48px; font-weight: bold; color: ${color}; margin-bottom: 10px;">
                        ${displayValue}
                    </div>
                    <div style="font-size: 14px; color: #666; margin-bottom: 15px;">
                        ${formula}
                    </div>
                    <div style="font-size: 12px; color: #999;">
                        <div>Good: ≥${isPercentage ? (goodMin * 100).toFixed(0) + '%' : goodMin}</div>
                        <div>Warning: ≥${isPercentage ? (warningMin * 100).toFixed(0) + '%' : warningMin}</div>
                    </div>
                </div>
            `;
        }
        
        // 1. Current Ratio = Current Assets / Current Liabilities
        // Good: ≥2.0, Warning: ≥1.0, Poor: <1.0
        const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
        document.getElementById('currentRatioContent').innerHTML = 
            formatRatioDisplay('Current Ratio', currentRatio, 
                `$${formatAccounting(currentAssets)} / $${formatAccounting(currentLiabilities)}`, 
                2.0, 1.0);
        
        // 2. Return on Assets = Net Income / Total Assets
        // Good: ≥5%, Warning: ≥2%, Poor: <2%
        const roa = totalAssets > 0 ? netIncome / totalAssets : 0;
        document.getElementById('roaContent').innerHTML = 
            formatRatioDisplay('Return on Assets', roa, 
                `$${formatAccounting(netIncome)} / $${formatAccounting(totalAssets)}`, 
                0.05, 0.02, true);
        
        // 3. Return on Equity = Net Income / Total Equity
        // Good: ≥15%, Warning: ≥10%, Poor: <10%
        const roe = totalEquity > 0 ? netIncome / totalEquity : 0;
        document.getElementById('roeContent').innerHTML = 
            formatRatioDisplay('Return on Equity', roe, 
                `$${formatAccounting(netIncome)} / $${formatAccounting(totalEquity)}`, 
                0.15, 0.10, true);
        
        // 4. Net Profit Margin = Net Income / Revenue
        // Good: ≥10%, Warning: ≥5%, Poor: <5%
        const npm = totalRevenue > 0 ? netIncome / totalRevenue : 0;
        document.getElementById('npmContent').innerHTML = 
            formatRatioDisplay('Net Profit Margin', npm, 
                `$${formatAccounting(netIncome)} / $${formatAccounting(totalRevenue)}`, 
                0.10, 0.05, true);
        
        // 5. Asset Turnover = Revenue / Total Assets
        // Good: ≥1.0, Warning: ≥0.5, Poor: <0.5
        const assetTurnover = totalAssets > 0 ? totalRevenue / totalAssets : 0;
        document.getElementById('assetTurnoverContent').innerHTML = 
            formatRatioDisplay('Asset Turnover', assetTurnover, 
                `$${formatAccounting(totalRevenue)} / $${formatAccounting(totalAssets)}`, 
                1.0, 0.5);
        
        // 6. Quick Ratio = (Current Assets - Inventory) / Current Liabilities
        // Good: ≥1.0, Warning: ≥0.5, Poor: <0.5
        const quickRatio = currentLiabilities > 0 ? (currentAssets - inventory) / currentLiabilities : 0;
        document.getElementById('quickRatioContent').innerHTML = 
            formatRatioDisplay('Quick Ratio', quickRatio, 
                `($${formatAccounting(currentAssets)} - $${formatAccounting(inventory)}) / $${formatAccounting(currentLiabilities)}`, 
                1.0, 0.5);
        
    } catch (err) {
        console.error('Error calculating ratios:', err);
        ['currentRatioContent', 'roaContent', 'roeContent', 'npmContent', 'assetTurnoverContent', 'quickRatioContent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<p style="color: #d32f2f; text-align: center; padding-top: 40px;">Error loading ratio</p>';
        });
    }
}

async function loadRecentActivity() {
    const container = document.getElementById('dashboardRecentActivity');
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_event_log_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        });
        let data = await res.json();
        if (data && typeof data.body === 'string') {
            try { data = JSON.parse(data.body); } catch (e) {}
        }
        const events = Array.isArray(data) ? data : (Array.isArray(data.rows) ? data.rows : []);
        
        // Get the 5 most recent events
        const recentEvents = events.slice(0, 5);
        
        if (recentEvents.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">No recent activity</p>';
            return;
        }
        
        let html = '<div style="display: flex; flex-direction: column; gap: 8px;">';
        recentEvents.forEach(event => {
            const date = new Date(event.changed_at).toLocaleString();
            html += `
                <div style="padding: 8px; background: #f8f9fa; border-radius: 4px; font-size: 0.9em;">
                    <div style="font-weight: 600; color: #333;">${event.action} - ${event.table_name}</div>
                    <div style="color: #666; font-size: 0.85em;">${date}</div>
                </div>
            `;
        });
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<p style="color: #d32f2f;">Error loading recent activity</p>';
    }
}

async function loadPendingItems() {
    const container = document.getElementById('dashboardPendingItems');
    try {
        const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        });
        let data = await res.json();
        if (data && typeof data.body === 'string') {
            try { data = JSON.parse(data.body); } catch (e) {}
        }
        let entries = Array.isArray(data) ? data : (Array.isArray(data.body) ? data.body : (Array.isArray(data.transactions) ? data.transactions : []));
        
        // Filter pending transactions
        const pendingEntries = entries.filter(e => (e.status || '').toLowerCase() === 'pending');
        
        if (pendingEntries.length === 0) {
            container.innerHTML = '<p style="color: #999; font-style: italic;">No pending items</p>';
            return;
        }
        
        let html = `<div style="display: flex; flex-direction: column; gap: 8px;">`;
        html += `<div style="font-weight: 600; margin-bottom: 8px; color: #333;">${pendingEntries.length} pending transaction(s)</div>`;
        pendingEntries.slice(0, 5).forEach(entry => {
            const date = new Date(entry.created_at || entry.date).toLocaleDateString();
            html += `
                <div style="padding: 8px; background: #fff3cd; border-radius: 4px; font-size: 0.9em; border-left: 3px solid #856404;">
                    <div style="font-weight: 600; color: #333;">#${entry.id} - ${entry.description || 'No description'}</div>
                    <div style="color: #666; font-size: 0.85em;">${date}</div>
                </div>
            `;
        });
        if (pendingEntries.length > 5) {
            html += `<div style="text-align: center; margin-top: 8px;"><button onclick="document.querySelector('[data-tab=journal]').click()" class="action-btn" style="font-size: 0.9em;">View All</button></div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        container.innerHTML = '<p style="color: #d32f2f;">Error loading pending items</p>';
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
                <div class="modal-content" style="max-width:1200px; width:95%; position:relative;">
                    <button type="button" id="closeEventModalX" class="modal-close-x" style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>
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
            <button id="sendEmailBtn" class="email-user-btn" style="font-size:1.05em; padding:8px 18px; border-radius:8px; border:2px solid #757575; font-weight:bold; cursor:pointer;">Send Email</button>
        </div>
        <div id="accountsTablesContainer" style="margin-top:18px;"></div>
    `;

    const accountsContainer = document.getElementById('accountsTablesContainer');
    let accounts = [];
    let searchTerm = '';
    const sortState = { col: null, asc: true };

    // Attach to button
    document.getElementById('sendEmailBtn').addEventListener('click', () => openEmailModal());

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
            
            // Store accounts globally for modal access
            window.availableAccounts = accounts.slice();
            
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

// Reports tab — full page view (for managers)
async function loadReports() {
    actionContent.innerHTML = `
        <h2>Reports</h2>
        <div style="display:flex; gap:12px; align-items:end; margin-bottom:12px; flex-wrap:wrap;">
            <label style="display:flex; flex-direction:column; margin-bottom:0;">Choose Report Type
                <select id="reportType" style="padding:8px; border-radius:6px; border:1px solid #ccc; font-size:inherit; font-family:inherit; margin-top:auto;">
                    <option value="">Select Report Type</option>
                    <option value="trialBalance">Trial Balance</option>
                    <option value="incomeStatement">Income Statement</option>
                    <option value="balanceSheet">Balance Sheet</option>
                    <option value="retainedEarnings">Retained Earnings</option>
                </select>
            </label>
            <label style="display:flex; flex-direction:column;">As of Date
                <input type="date" id="tbAsOf_page" style="padding:8px; border-radius:6px; border:1px solid #ccc;">
            </label>
            <label style="display:flex; flex-direction:column;">From:
                <input type="date" id="tbFrom_page" style="padding:8px; border-radius:6px; border:1px solid #ccc;">
            </label>
            <label style="display:flex; flex-direction:column;">To:
                <input type="date" id="tbTo_page" style="padding:8px; border-radius:6px; border:1px solid #ccc;">
            </label>
            <div style="display:flex; gap:8px; margin-left:auto;">
                <button id="generateTB_page" class="confirm-btn primary-green">Generate</button>
                <button id="clearTB_page" class="cancel-btn">Clear</button>
            </div>
        </div>
        <div id="tbMsg_page" style="color:#c00; margin-bottom:8px;"></div>
        <div id="tbResults_page" style=""></div>
        <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
            <button id="saveTB_page" class="action-btn">Save CSV</button>
            <button id="emailTB_page" class="action-btn">Email</button>
            <button id="printTB_page" class="action-btn">Print</button>
        </div>
    `;

    const resultsEl = document.getElementById('tbResults_page');
    const msgEl = document.getElementById('tbMsg_page');
    let lastTB = null;

    async function fetchAccountsForTB() {
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
            rows = (rows || []).map(r => ({ ...r, balance: Number(r.balance || 0) }));
            return rows;
        } catch (err) {
            throw err;
        }
    }

    async function generateTBPage() {
        const reportType = document.getElementById('reportType').value;
        
        if (reportType === 'incomeStatement') {
            return generateIncomeStatement();
        }
        
        if (reportType === 'balanceSheet') {
            return generateBalanceSheet();
        }

        if (reportType === 'retainedEarnings') {
            return generateRetainedEarnings();
        }
        
        resultsEl.innerHTML = '<p>Generating trial balance...</p>';
        msgEl.textContent = '';
        try {
            const asOfDate = document.getElementById('tbAsOf_page').value;
            const fromDate = document.getElementById('tbFrom_page').value;
            const toDate = document.getElementById('tbTo_page').value;
            
            // Fetch accounts and transactions
            const accounts = await fetchAccountsForTB();
            
            // Fetch all transactions to calculate cumulative balances
            const transResponse = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let transData = await transResponse.json();
            if (transData && typeof transData.body === 'string') {
                try { transData = JSON.parse(transData.body); } catch (e) {}
            }
            let allTransactions = Array.isArray(transData) ? transData :
                                 Array.isArray(transData.body) ? transData.body :
                                 Array.isArray(transData.transactions) ? transData.transactions : [];
            
            // Filter transactions for cumulative calculation
            let transactionsToInclude = allTransactions;
            
            if (asOfDate) {
                // For "As of" date, include all transactions up to and including that date
                transactionsToInclude = allTransactions.filter(t => {
                    const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                    return transDate <= asOfDate;
                });
            } else if (fromDate || toDate) {
                // For period reporting, we need opening balances + period transactions
                let openingBalanceTransactions = [];
                let periodTransactions = [];
                
                if (fromDate) {
                    // Get all transactions before the "from" date for opening balances
                    openingBalanceTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate < fromDate;
                    });
                    
                    // Get transactions within the period
                    periodTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        const withinPeriod = transDate >= fromDate && (!toDate || transDate <= toDate);
                        return withinPeriod;
                    });
                    
                    // Combine opening + period for cumulative effect
                    transactionsToInclude = [...openingBalanceTransactions, ...periodTransactions];
                } else if (toDate) {
                    // Just "to" date specified - cumulative up to that date
                    transactionsToInclude = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate <= toDate;
                    });
                }
            }
            // If no dates specified, use all transactions (default behavior)
            
            // Use final account balances directly from the database
            const rows = accounts.map(a => ({
                account_number: a.account_number || '',
                account_name: a.account_name || '',
                category: (a.category || '').toLowerCase(),
                balance: Number(a.balance || 0)
            }));
            
            // Only include approved transactions in trial balance (for counting purposes)
            const approvedTransactions = transactionsToInclude.filter(t => 
                (t.status || '').toLowerCase() === 'approved'
            );
            
            const tbRows = rows
                .map(r => {
                    const bal = Number(r.balance) || 0;
                    let debit = 0, credit = 0;
                    // Assets (including non-current) and Expenses go to debit side
                    // Liabilities (including non-current), Owner's Equity, and Revenue go to credit side
                    if (r.category === 'assets' || r.category === 'expenses' || r.category === 'non-current assets' || r.category === 'noncurrentassets') {
                        debit = bal;
                    } else if (r.category === 'liabilities' || r.category === 'ownerequity' || r.category === 'owner equity' || r.category === 'owners equity' || r.category === "owner's equity" || r.category === 'revenue' || r.category === 'non-current liabilities' || r.category === 'noncurrentliabilities') {
                        credit = Math.abs(bal);
                    } else {
                        // Default behavior for other categories
                        if (bal >= 0) { debit = bal; } else { credit = Math.abs(bal); }
                    }
                    return { account_number: r.account_number, account_name: r.account_name, debit, credit, balance: bal };
                });
            
            // Recalculate totals after filtering
            let totalDebit = 0, totalCredit = 0;
            tbRows.forEach(r => {
                totalDebit += r.debit;
                totalCredit += r.credit;
            });

            // Add date range info to the header
            let dateInfo = '';
            if (asOfDate) {
                dateInfo += `Trial Balance as of ${asOfDate}`;
            } else if (fromDate || toDate) {
                dateInfo += `Trial Balance for period ${fromDate || 'Beginning'} to ${toDate || 'Current'}`;
            } else {
                dateInfo += 'Trial Balance - All Time';
            }

            let html = `<div style="display:flex; justify-content:center;">`;
            html += `<div style="width:55%;">`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.44em;">Addams & Family Inc</p>`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.368em;">Trial Balance</p>`;
            const todayDate = new Date().toISOString().split('T')[0];
            html += `<p style="text-align:center; margin-bottom:16px; color:#666; font-size:1.224em;">As of ${todayDate} - All Accounts</p>`;
            html += `<table style="width:100%; border-collapse:collapse; font-size:1.08em; border:none;"><thead><tr><th style="text-align:left; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Account Number</th><th style="text-align:left; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Account Name</th><th style="text-align:right; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Debit</th><th style="text-align:right; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Credit</th></tr></thead><tbody>`;
            tbRows.forEach(r => { 
                const debitDisplay = r.debit > 0 ? (String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(r.debit)}` : formatAccounting(r.debit)) : '';
                const creditDisplay = r.credit > 0 ? (String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(r.credit)}` : formatAccounting(r.credit)) : '';
                html += `<tr style="border:none;"><td style="padding:6px; border:none;">${r.account_number}</td><td style="padding:6px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${debitDisplay}</td><td style="padding:6px; text-align:right; border:none;">${creditDisplay}</td></tr>`; 
            });
            const totalDebitDisplay = tbRows.some(r => String(r.account_number).endsWith('01')) ? `$&nbsp;&nbsp;${formatAccounting(totalDebit)}` : formatAccounting(totalDebit);
            const totalCreditDisplay = tbRows.some(r => String(r.account_number).endsWith('01')) ? `$&nbsp;&nbsp;${formatAccounting(totalCredit)}` : formatAccounting(totalCredit);
            html += `<tr style="font-weight:bold; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;"><td colspan="2" style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Totals</td><td style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">${totalDebitDisplay}</td><td style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">${totalCreditDisplay}</td></tr>`;
            html += `</tbody></table></div></div>`;
            resultsEl.innerHTML = html;
            lastTB = { rows: tbRows, totalDebit, totalCredit, generatedAt: new Date().toISOString(), dateInfo };
        } catch (err) {
            resultsEl.innerHTML = `<p style="color:red;">Error generating trial balance: ${err.message}</p>`;
        }
    }

    function downloadTBPageCSV() {
        if (!lastTB) { alert('No trial balance generated yet.'); return; }
        const tb = lastTB;
        const lines = [];
        lines.push(['Account Number','Account Name','Debit','Credit'].join(','));
        tb.rows.forEach(r => { lines.push([`"${r.account_number}"`,`"${r.account_name}"`,r.debit.toFixed(2),r.credit.toFixed(2)].join(',')); });
        lines.push(["","Totals",tb.totalDebit.toFixed(2),tb.totalCredit.toFixed(2)].join(','));
        const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `trial-balance-${(new Date()).toISOString().slice(0,19).replace(/[:T]/g,'-')}.csv`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    }

    async function emailTBPage() {
        if (!lastTB) { alert('No trial balance generated yet.'); return; }
        const to = prompt('Enter recipient email:');
        if (!to) return;
        const message = prompt('Optional message to include:', `Trial Balance generated on ${new Date(lastTB.generatedAt).toLocaleString()}`) || '';
        let body = message + '\n\n';
        body += 'Account Number,Account Name,Debit,Credit\n';
        lastTB.rows.forEach(r => { body += `${r.account_number},${r.account_name},${r.debit.toFixed(2)},${r.credit.toFixed(2)}\n`; });
        body += `\nTotals,,${lastTB.totalDebit.toFixed(2)},${lastTB.totalCredit.toFixed(2)}`;
        try {
            const user = JSON.parse(localStorage.getItem('user') || '{}');
            const res = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_send_email', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ admin_id: ADMIN_ID, admin_email: user.email || '', user_email: to, first_name: 'Recipient', last_name: '', message: body })
            });
            let data = await res.json(); if (typeof data.body === 'string') { try { data = { ...data, ...JSON.parse(data.body) }; } catch (e) {} }
            if (!res.ok) throw new Error(data.error || 'Failed to send email');
            alert('Email queued/sent (backend dependent).');
        } catch (err) { alert('Email failed: ' + (err.message || err)); }
    }

    function printTBPage() {
        if (!lastTB) { alert('No trial balance to print.'); return; }
        const content = resultsEl.innerHTML;
        const w = window.open('', '_blank'); if (!w) { alert('Popup blocked. Allow popups to print.'); return; }
        w.document.write(`<html><head><title>Trial Balance</title><style>body{margin:0.5in;font-family:Arial,sans-serif}table{width:100%;border-collapse:collapse}th,td{padding:6px;border:none;text-align:left;font-size:0.9em}th{border-bottom:2px solid #333}td.right{text-align:right}@media print{body{margin:0.25in}table{font-size:0.85em}}</style></head><body>${content}</body></html>`);
        w.document.close(); w.focus(); setTimeout(()=> w.print(), 300);
    }

    async function generateIncomeStatement() {
        resultsEl.innerHTML = '<p>Generating income statement...</p>';
        msgEl.textContent = '';
        try {
            const asOfDate = document.getElementById('tbAsOf_page').value;
            const fromDate = document.getElementById('tbFrom_page').value;
            const toDate = document.getElementById('tbTo_page').value;
            
            // Fetch accounts
            const accounts = await fetchAccountsForTB();
            
            // Fetch all transactions
            const transResponse = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let transData = await transResponse.json();
            if (transData && typeof transData.body === 'string') {
                try { transData = JSON.parse(transData.body); } catch (e) {}
            }
            let allTransactions = Array.isArray(transData) ? transData :
                                 Array.isArray(transData.body) ? transData.body :
                                 Array.isArray(transData.transactions) ? transData.transactions : [];
            
            // Filter transactions for the period
            let transactionsToInclude = allTransactions;
            if (asOfDate) {
                transactionsToInclude = allTransactions.filter(t => {
                    const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                    return transDate <= asOfDate;
                });
            } else if (fromDate || toDate) {
                let openingBalanceTransactions = [];
                let periodTransactions = [];
                
                if (fromDate) {
                    openingBalanceTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate < fromDate;
                    });
                    
                    periodTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        const withinPeriod = transDate >= fromDate && (!toDate || transDate <= toDate);
                        return withinPeriod;
                    });
                    
                    transactionsToInclude = [...openingBalanceTransactions, ...periodTransactions];
                } else if (toDate) {
                    transactionsToInclude = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate <= toDate;
                    });
                }
            }
            
            // Map accounts with their balances
            const rows = accounts.map(a => ({
                account_number: a.account_number || '',
                account_name: a.account_name || '',
                category: (a.category || '').toLowerCase(),
                balance: Number(a.balance || 0)
            }));
            
            // Only include approved transactions
            const approvedTransactions = transactionsToInclude.filter(t => 
                (t.status || '').toLowerCase() === 'approved'
            );
            
            // Separate revenue and expense accounts
            const revenueAccounts = rows.filter(r => r.category === 'revenue' && (r.balance > 0 || r.balance < 0));
            const expenseAccounts = rows.filter(r => r.category === 'expenses' && (r.balance > 0 || r.balance < 0));
            
            // Calculate totals (Revenue and Expenses are typically credit accounts, so use absolute value)
            let totalRevenue = 0;
            revenueAccounts.forEach(r => {
                totalRevenue += Math.abs(r.balance);
            });
            
            let totalExpenses = 0;
            expenseAccounts.forEach(r => {
                totalExpenses += Math.abs(r.balance);
            });
            
            let netIncome = totalRevenue - totalExpenses;
            
            // Add date range info
            let dateInfo = '';
            if (asOfDate) {
                dateInfo += `Income Statement as of ${asOfDate}`;
            } else if (fromDate || toDate) {
                dateInfo += `Income Statement for period ${fromDate || 'Beginning'} to ${toDate || 'Current'}`;
            } else {
                dateInfo += 'Income Statement - All Time';
            }
            
            // Build HTML - Single Table
            let html = `<div style="display:flex; justify-content:center;">`;
            html += `<div style="width:55%;">`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.44em;">Addams & Family Inc</p>`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.368em;">Income Statement</p>`;
            const todayDate = new Date().toISOString().split('T')[0];
            html += `<p style="text-align:center; margin-bottom:16px; color:#666; font-size:1.224em;">As of ${todayDate} - All Accounts</p>`;
            
            html += `<table style="width:100%; border-collapse:collapse; font-size:1.08em; border:none;"><thead><tr><th style="text-align:left; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Description</th><th style="text-align:right; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Amount</th></tr></thead><tbody>`;
            
            // Revenues Section
            html += `<tr style="font-weight:bold; background-color:#f9f9f9;"><td colspan="2" style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Revenues</td></tr>`;
            revenueAccounts.forEach(r => {
                const displayAmount = String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(Math.abs(r.balance))}` : formatAccounting(Math.abs(r.balance));
                html += `<tr style="border:none;"><td style="padding:6px; padding-left:24px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${displayAmount}</td></tr>`;
            });
            const totalRevenueDisplay = `$&nbsp;&nbsp;${formatAccounting(totalRevenue)}`;
            html += `<tr style="font-weight:bold; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; padding-left:24px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Revenue Total</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${totalRevenueDisplay}</td></tr>`;
            
            // Expenses Section
            html += `<tr style="font-weight:bold; background-color:#f9f9f9;"><td colspan="2" style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Expenses</td></tr>`;
            expenseAccounts.forEach(r => {
                const displayAmount = String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(Math.abs(r.balance))}` : formatAccounting(Math.abs(r.balance));
                html += `<tr style="border:none;"><td style="padding:6px; padding-left:24px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${displayAmount}</td></tr>`;
            });
            const totalExpensesDisplay = `$&nbsp;&nbsp;${formatAccounting(totalExpenses)}`;
            html += `<tr style="font-weight:bold; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; padding-left:24px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Expenses Total</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${totalExpensesDisplay}</td></tr>`;
            
            // Net Income Row
            const netIncomeDisplay = `$&nbsp;&nbsp;${formatAccounting(netIncome)}`;
            html += `<tr style="font-weight:bold; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Net Income</td><td style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">${netIncomeDisplay}</td></tr>`;
            
            html += `</tbody></table>`;
            html += `</div></div>`;
            resultsEl.innerHTML = html;
            lastTB = { 
                type: 'incomeStatement',
                revenues: revenueAccounts, 
                expenses: expenseAccounts, 
                totalRevenue, 
                totalExpenses, 
                netIncome,
                generatedAt: new Date().toISOString(), 
                dateInfo 
            };
        } catch (err) {
            resultsEl.innerHTML = `<p style="color:red;">Error generating income statement: ${err.message}</p>`;
        }
    }

    async function generateBalanceSheet() {
        resultsEl.innerHTML = '<p>Generating balance sheet...</p>';
        msgEl.textContent = '';
        try {
            const asOfDate = document.getElementById('tbAsOf_page').value;
            const fromDate = document.getElementById('tbFrom_page').value;
            const toDate = document.getElementById('tbTo_page').value;
            
            // Fetch accounts
            const accounts = await fetchAccountsForTB();
            
            // Fetch all transactions
            const transResponse = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let transData = await transResponse.json();
            if (transData && typeof transData.body === 'string') {
                try { transData = JSON.parse(transData.body); } catch (e) {}
            }
            let allTransactions = Array.isArray(transData) ? transData :
                                 Array.isArray(transData.body) ? transData.body :
                                 Array.isArray(transData.transactions) ? transData.transactions : [];
            
            // Filter transactions for the period
            let transactionsToInclude = allTransactions;
            if (asOfDate) {
                transactionsToInclude = allTransactions.filter(t => {
                    const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                    return transDate <= asOfDate;
                });
            } else if (fromDate || toDate) {
                let openingBalanceTransactions = [];
                let periodTransactions = [];
                
                if (fromDate) {
                    openingBalanceTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate < fromDate;
                    });
                    
                    periodTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        const withinPeriod = transDate >= fromDate && (!toDate || transDate <= toDate);
                        return withinPeriod;
                    });
                    
                    transactionsToInclude = [...openingBalanceTransactions, ...periodTransactions];
                } else if (toDate) {
                    transactionsToInclude = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate <= toDate;
                    });
                }
            }
            
            // Map accounts with their balances
            const rows = accounts.map(a => ({
                account_number: a.account_number || '',
                account_name: a.account_name || '',
                category: (a.category || '').toLowerCase(),
                balance: Number(a.balance || 0)
            }));
            
            // Only include approved transactions
            const approvedTransactions = transactionsToInclude.filter(t => 
                (t.status || '').toLowerCase() === 'approved'
            );
            
            // Separate asset, liability, and owner equity accounts
            const assetAccounts = rows.filter(r => r.category === 'assets' && (r.balance > 0 || r.balance < 0));
            const liabilityAccounts = rows.filter(r => r.category === 'liabilities' && (r.balance > 0 || r.balance < 0));
            const equityAccounts = rows.filter(r => (r.category === 'ownerequity' || r.category === 'owner equity' || r.category === 'owners equity' || r.category === "owner's equity") && (r.balance > 0 || r.balance < 0));
            
            // Calculate totals using absolute values for proper balance sheet equation
            // Assets are debit accounts (positive = normal balance)
            // Liabilities and Equity are credit accounts (negative in database = normal balance, so we use absolute value)
            let totalAssets = 0;
            assetAccounts.forEach(r => {
                totalAssets += r.balance;
            });
            
            let totalLiabilities = 0;
            liabilityAccounts.forEach(r => {
                // Liabilities are credit accounts; if balance is negative, take absolute value
                totalLiabilities += Math.abs(r.balance);
            });
            
            let totalEquity = 0;
            equityAccounts.forEach(r => {
                // Owner's Equity is a credit account; if balance is negative, take absolute value
                totalEquity += Math.abs(r.balance);
            });
            
            let totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
            
            // Add date range info
            let dateInfo = '';
            if (asOfDate) {
                dateInfo += `Balance Sheet as of ${asOfDate}`;
            } else if (fromDate || toDate) {
                dateInfo += `Balance Sheet as of ${toDate || 'Current'}`;
            } else {
                dateInfo += 'Balance Sheet - Current';
            }
            
            // Build HTML - Single Table
            let html = `<div style="display:flex; justify-content:center;">`;
            html += `<div style="width:55%;">`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.44em;">Addams & Family Inc</p>`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.368em;">Balance Sheet</p>`;
            const todayDate = new Date().toISOString().split('T')[0];
            html += `<p style="text-align:center; margin-bottom:16px; color:#666; font-size:1.224em;">As of ${todayDate} - All Accounts</p>`;
            
            html += `<table style="width:100%; border-collapse:collapse; font-size:1.08em; border:none;"><thead><tr><th style="text-align:left; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Description</th><th style="text-align:right; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Amount</th></tr></thead><tbody>`;
            
            // Assets Section
            html += `<tr style="font-weight:bold; background-color:#f9f9f9;"><td colspan="2" style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Assets</td></tr>`;
            assetAccounts.forEach(r => {
                const displayAmount = String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(r.balance)}` : formatAccounting(r.balance);
                html += `<tr style="border:none;"><td style="padding:6px; padding-left:24px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${displayAmount}</td></tr>`;
            });
            const totalAssetsDisplay = `$&nbsp;&nbsp;${formatAccounting(totalAssets)}`;
            html += `<tr style="font-weight:bold; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; padding-left:24px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Total Assets</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${totalAssetsDisplay}</td></tr>`;
            
            // Liabilities Section
            html += `<tr style="font-weight:bold; background-color:#f9f9f9;"><td colspan="2" style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Liabilities</td></tr>`;
            liabilityAccounts.forEach(r => {
                const displayAmount = String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(Math.abs(r.balance))}` : formatAccounting(Math.abs(r.balance));
                html += `<tr style="border:none;"><td style="padding:6px; padding-left:24px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${displayAmount}</td></tr>`;
            });
            const totalLiabilitiesDisplay = `$&nbsp;&nbsp;${formatAccounting(totalLiabilities)}`;
            html += `<tr style="font-weight:bold; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; padding-left:24px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Total Liabilities</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${totalLiabilitiesDisplay}</td></tr>`;
            
            // Owner's Equity Section
            html += `<tr style="font-weight:bold; background-color:#f9f9f9;"><td colspan="2" style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Owner's Equity</td></tr>`;
            equityAccounts.forEach(r => {
                const displayAmount = String(r.account_number).endsWith('01') ? `$&nbsp;&nbsp;${formatAccounting(Math.abs(r.balance))}` : formatAccounting(Math.abs(r.balance));
                html += `<tr style="border:none;"><td style="padding:6px; padding-left:24px; border:none;">${r.account_name}</td><td style="padding:6px; text-align:right; border:none;">${displayAmount}</td></tr>`;
            });
            const totalEquityDisplay = `$&nbsp;&nbsp;${formatAccounting(totalEquity)}`;
            html += `<tr style="font-weight:bold; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; padding-left:24px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Total Owner's Equity</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${totalEquityDisplay}</td></tr>`;
            
            // Total Liabilities and Equity Row
            const totalLiabilitiesAndEquityDisplay = `$&nbsp;&nbsp;${formatAccounting(totalLiabilitiesAndEquity)}`;
            html += `<tr style="font-weight:bold; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Total Liabilities & Equity</td><td style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">${totalLiabilitiesAndEquityDisplay}</td></tr>`;
            
            html += `</tbody></table>`;
            html += `</div></div>`;
            resultsEl.innerHTML = html;
            lastTB = { 
                type: 'balanceSheet',
                assets: assetAccounts,
                liabilities: liabilityAccounts,
                equity: equityAccounts,
                totalAssets,
                totalLiabilities,
                totalEquity,
                totalLiabilitiesAndEquity,
                generatedAt: new Date().toISOString(), 
                dateInfo 
            };
        } catch (err) {
            resultsEl.innerHTML = `<p style="color:red;">Error generating balance sheet: ${err.message}</p>`;
        }
    }

    async function generateRetainedEarnings() {
        resultsEl.innerHTML = '<p>Generating retained earnings statement...</p>';
        msgEl.textContent = '';
        try {
            const asOfDate = document.getElementById('tbAsOf_page').value;
            const fromDate = document.getElementById('tbFrom_page').value;
            const toDate = document.getElementById('tbTo_page').value;
            
            // Fetch accounts
            const accounts = await fetchAccountsForTB();
            
            // Fetch all transactions
            const transResponse = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            });
            let transData = await transResponse.json();
            if (transData && typeof transData.body === 'string') {
                try { transData = JSON.parse(transData.body); } catch (e) {}
            }
            let allTransactions = Array.isArray(transData) ? transData :
                                 Array.isArray(transData.body) ? transData.body :
                                 Array.isArray(transData.transactions) ? transData.transactions : [];
            
            // Filter transactions for the period
            let transactionsToInclude = allTransactions;
            if (asOfDate) {
                transactionsToInclude = allTransactions.filter(t => {
                    const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                    return transDate <= asOfDate;
                });
            } else if (fromDate || toDate) {
                let openingBalanceTransactions = [];
                let periodTransactions = [];
                
                if (fromDate) {
                    openingBalanceTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate < fromDate;
                    });
                    
                    periodTransactions = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        const withinPeriod = transDate >= fromDate && (!toDate || transDate <= toDate);
                        return withinPeriod;
                    });
                    
                    transactionsToInclude = [...openingBalanceTransactions, ...periodTransactions];
                } else if (toDate) {
                    transactionsToInclude = allTransactions.filter(t => {
                        const transDate = new Date(t.created_at || t.date).toISOString().split('T')[0];
                        return transDate <= toDate;
                    });
                }
            }
            
            // Map accounts with their balances
            const rows = accounts.map(a => ({
                account_number: a.account_number || '',
                account_name: a.account_name || '',
                category: (a.category || '').toLowerCase(),
                balance: Number(a.balance || 0)
            }));
            
            // Only include approved transactions
            const approvedTransactions = transactionsToInclude.filter(t => 
                (t.status || '').toLowerCase() === 'approved'
            );
            
            // Calculate Net Income from Income Statement logic
            const revenueAccounts = rows.filter(r => r.category === 'revenue' && (r.balance > 0 || r.balance < 0));
            const expenseAccounts = rows.filter(r => r.category === 'expenses' && (r.balance > 0 || r.balance < 0));
            
            let totalRevenue = 0;
            revenueAccounts.forEach(r => {
                totalRevenue += Math.abs(r.balance);
            });
            
            let totalExpenses = 0;
            expenseAccounts.forEach(r => {
                totalExpenses += Math.abs(r.balance);
            });
            
            let netIncome = totalRevenue - totalExpenses;
            
            // Retained Earnings Statement values
            const beginningBalance = 0;  // Currently 0 as requested
            const lesDrawings = 0;        // Currently 0 as requested
            const endingBalance = beginningBalance + netIncome - lesDrawings;
            
            // Add date range info
            let dateInfo = '';
            if (asOfDate) {
                dateInfo += `Retained Earnings Statement as of ${asOfDate}`;
            } else if (fromDate || toDate) {
                dateInfo += `Retained Earnings Statement for period ${fromDate || 'Beginning'} to ${toDate || 'Current'}`;
            } else {
                dateInfo += 'Retained Earnings Statement - Current';
            }
            
            // Build HTML - Single Table
            let html = `<div style="display:flex; justify-content:center;">`;
            html += `<div style="width:55%;">`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.44em;">Addams & Family Inc</p>`;
            html += `<p style="text-align:center; font-weight:bold; margin-bottom:4px; color:#333; font-size:1.368em;">Retained Earnings Statement</p>`;
            const todayDate = new Date().toISOString().split('T')[0];
            html += `<p style="text-align:center; margin-bottom:16px; color:#666; font-size:1.224em;">As of ${todayDate} - All Accounts</p>`;
            
            html += `<table style="width:100%; border-collapse:collapse; font-size:1.08em; border:none;"><thead><tr><th style="text-align:left; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Description</th><th style="text-align:right; padding:6px; border-bottom:2px solid #333; border-top:none; border-left:none; border-right:none;">Amount</th></tr></thead><tbody>`;
            
            // Beginning Balance Row
            const beginningBalanceDisplay = `$&nbsp;&nbsp;${formatAccounting(beginningBalance)}`;
            html += `<tr style="border:none;"><td style="padding:6px; border:none;">Beginning Balance</td><td style="padding:6px; text-align:right; border:none;">${beginningBalanceDisplay}</td></tr>`;
            
            // Net Income Row
            const netIncomeDisplay = `$&nbsp;&nbsp;${formatAccounting(netIncome)}`;
            html += `<tr style="border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Net Income</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${netIncomeDisplay}</td></tr>`;
            
            // Less Drawings Row
            const lesDrawingsDisplay = `$&nbsp;&nbsp;${formatAccounting(lesDrawings)}`;
            html += `<tr style="border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">Less: Drawings</td><td style="padding:6px; text-align:right; border-top:1px solid #ccc; border-bottom:none; border-left:none; border-right:none;">${lesDrawingsDisplay}</td></tr>`;
            
            // Ending Balance Row
            const endingBalanceDisplay = `$&nbsp;&nbsp;${formatAccounting(endingBalance)}`;
            html += `<tr style="font-weight:bold; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;"><td style="padding:6px; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">Ending Balance</td><td style="padding:6px; text-align:right; border-top:2px solid #333; border-bottom:none; border-left:none; border-right:none;">${endingBalanceDisplay}</td></tr>`;
            
            html += `</tbody></table>`;
            html += `</div></div>`;
            resultsEl.innerHTML = html;
            lastTB = { 
                type: 'retainedEarnings',
                beginningBalance,
                netIncome,
                lesDrawings,
                endingBalance,
                generatedAt: new Date().toISOString(), 
                dateInfo 
            };
        } catch (err) {
            resultsEl.innerHTML = `<p style="color:red;">Error generating retained earnings statement: ${err.message}</p>`;
        }
    }

    document.getElementById('generateTB_page').addEventListener('click', generateTBPage);
    document.getElementById('clearTB_page').addEventListener('click', () => { document.getElementById('tbAsOf_page').value = ''; document.getElementById('tbFrom_page').value = ''; document.getElementById('tbTo_page').value = ''; document.getElementById('tbMsg_page').textContent = ''; document.getElementById('tbResults_page').innerHTML = ''; lastTB = null; });
    document.getElementById('saveTB_page').addEventListener('click', downloadTBPageCSV);
    document.getElementById('emailTB_page').addEventListener('click', emailTBPage);
    document.getElementById('printTB_page').addEventListener('click', printTBPage);
}

// Global variable to store journal entries for transaction details modal
let globalJournalEntries = [];

// Journal tab: show role-specific journal entries view
async function loadJournal() {
    actionContent.innerHTML = `
        <h2>Journal Entries</h2>
        <div style="display:flex; gap:12px; align-items:center; margin-bottom:12px;">
            <input id="journalSearch" placeholder="Search journal entries by account name" style="flex:1; padding:8px; border-radius:8px; border:1px solid #ccc; font-size:1em;">
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

    const journalContainer = document.getElementById('journalTableContainer');
    const searchEl = document.getElementById('journalSearch');
    const filterStatusEl = document.getElementById('journalFilterStatus');
    let entries = [];
    let searchTerm = '';
    let statusFilter = 'all';
    let dateFromFilter = '';
    let dateToFilter = '';
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
            entries = entries.map(e => {
                // Parse credit amounts - prioritize arrays from Lambda, fall back to raw parsing
                let creditAmounts = [];
                if (e.credit_amounts_array && Array.isArray(e.credit_amounts_array)) {
                    creditAmounts = e.credit_amounts_array.filter(x => x > 0);
                } else if (e.credit) {
                    creditAmounts = String(e.credit).split(',').map(x => {
                        const val = parseFloat(x.trim());
                        return isNaN(val) ? 0 : val;
                    }).filter(x => x > 0);
                }
                
                // Parse debit amounts - prioritize arrays from Lambda, fall back to raw parsing
                let debitAmounts = [];
                if (e.debit_amounts_array && Array.isArray(e.debit_amounts_array)) {
                    debitAmounts = e.debit_amounts_array.filter(x => x > 0);
                } else if (e.debit) {
                    debitAmounts = String(e.debit).split(',').map(x => {
                        const val = parseFloat(x.trim());
                        return isNaN(val) ? 0 : val;
                    }).filter(x => x > 0);
                }
                
                return {
                    ...e,
                    date: e.created_at || e.date || e.createdAt || e.created_at,
                    credit_account_names: e.credit_account || e.credit_account_names || '',
                    debit_account_names: e.debit_account || e.debit_account_names || '',
                    credit_amounts_array: creditAmounts,
                    debit_amounts_array: debitAmounts,
                    status: (e.status || 'pending').toString().toLowerCase()
                };
            });
            
            // Update global entries for transaction details modal
            globalJournalEntries = [...entries];
            
            render();
        } catch (err) {
            console.error('Error fetching journal entries:', err);
            journalContainer.innerHTML = 'Error loading journal entries. Please try again.';
        }
    }

    function buildTable(rows) {
        if (!rows.length) return '<p>No journal entries found.</p>';
        
        return `
        <table>
            <thead>
                <tr>
                    <th class="sortable" data-col="date">Date</th>
                    <th class="sortable" data-col="id">Transaction ID</th>
                    <th class="sortable" data-col="description">Description</th>
                    <th class="sortable" data-col="account">Account</th>
                    <th class="sortable" data-col="debit">Debit</th>
                    <th class="sortable" data-col="credit">Credit</th>
                    <th class="sortable" data-col="status">Status</th>
                    <th class="sortable" data-col="comment">Comments</th>
                    ${CURRENT_ROLE === 'manager' ? '<th>Actions</th>' : ''}
                </tr>
            </thead>
            <tbody>
                ${rows.map(entry => `
                    <tr data-id="${entry.id}">
                        <td>${new Date(entry.date).toLocaleDateString()}</td>
                        <td><button onclick="showTransactionDetails(${entry.id})" class="action-link" style="background:none;border:none;color:#007bff;cursor:pointer;text-decoration:underline;padding:0;">#${entry.id}</button></td>
                        <td>${entry.description || ''}</td>
                        <td>${(entry.debit_account_names || '') + (entry.credit_account_names ? (' / ' + entry.credit_account_names) : '')}</td>
                        <td style="text-align:right">${formatAccounting(entry.debit_amounts_array?.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0) || 0)}</td>
                        <td style="text-align:right">${formatAccounting(entry.credit_amounts_array?.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0) || 0)}</td>
                        <td><span style="text-transform:capitalize; padding:4px 8px; border-radius:4px; background:${entry.status === 'approved' ? '#e8f5e8' : entry.status === 'rejected' ? '#ffeaea' : '#fff3cd'}; color:${entry.status === 'approved' ? '#2e7d32' : entry.status === 'rejected' ? '#d32f2f' : '#856404'};">${entry.status || 'pending'}</span></td>
                        <td>${entry.comment || ''}</td></td>
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
        // Remove existing modal if it exists to ensure clean state
        let existingModal = document.getElementById('journalEditModal');
        if (existingModal) {
            existingModal.remove();
        }
        
        const modal = document.createElement('div');
        modal.id = 'journalEditModal';
        modal.className = 'modal-overlay';
        modal.style.display = 'flex';
        modal.style.justifyContent = 'center';
        modal.style.alignItems = 'center';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
        modal.style.zIndex = '1000';
        modal.innerHTML = `
            <div class="modal-content" 
                style="min-width:500px;max-width:600px;max-height:80vh;overflow-y:auto; background:#fff;border-radius:10px;padding:24px 32px; box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative;">
                <button type="button" id="closeJournalEditModal" class="modal-close-x" 
                    style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>

                <h3 style="text-align:center;margin-top:0;margin-bottom:20px;font-size:1.3rem;font-weight:600;">Edit Journal Entry</h3>

                <form id="journalEditForm">
                    <input type="hidden" name="id" id="editJournalId">
                    
                    <div style="margin-bottom:14px">
                        <div id="editDragDropArea" 
                            style="border:2px dashed #ccc;border-radius:8px;padding:18px;text-align:center;margin-bottom:15px;background:#f9f9f9;cursor:pointer;">
                            <div id="editDragDropText" style="color:#666;">Drag and drop files here or click to upload</div>
                            <input type="file" id="editFileInput" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" style="display:none">
                            <div id="editFileList" style="margin-top:10px;text-align:left;"></div>
                        </div>
                        <div style="text-align:center;margin-bottom:10px;">
                            <label style="display:inline-flex;align-items:center;cursor:pointer;">
                                <input type="checkbox" id="replaceExistingFiles" style="margin-right:8px;">
                                Replace existing files (if any)
                            </label>
                        </div>
                    </div>

                    <div style="margin-bottom:14px">
                        <label style="display:block;margin-bottom:4px;font-weight:500;">Description*</label>
                        <textarea name="description" id="editJournalDescription" required 
                            style="width:100%;min-height:60px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;resize:vertical;"></textarea>
                    </div>

                    <div style="margin-bottom:14px">
                        <label style="display:block;margin-bottom:4px;font-weight:500;">Comment</label>
                        <textarea name="comment" id="editJournalComment"
                            style="width:100%;min-height:40px;padding:8px 10px;border:1px solid #ccc;border-radius:6px;resize:vertical;"></textarea>
                    </div>

                    <div style="margin-bottom:14px">
                        <label style="display:block;margin-bottom:4px;font-weight:500;">Transaction Type</label>
                        <select name="type" id="editJournalType" style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                            <option value="standard">Standard</option>
                            <option value="reversal">Reversal</option>
                            <option value="adjustment">Adjustment</option>
                            <option value="closing">Closing</option>
                        </select>
                    </div>

                    <div style="display:flex;">
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:30px;">Accounts</label>
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:115px;">Debit</label>
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:120px;">Credit</label>
                    </div>

                    <div id="editAccountRowsContainer"></div>

                    <div style="text-align:right;margin-bottom:16px;">
                        <button type="button" id="addEditAccountBtn" 
                            style="background:#007bff;color:#fff;padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:500;">
                            + Add New Account
                        </button>
                    </div>

                    <div id="editBalanceDisplay" style="text-align:center;margin-bottom:16px;font-weight:600;font-size:20px;color:green;">
                        Balance: 0.00
                    </div>

                    <div id="editFormError" style="display:none;text-align:center;margin-bottom:12px;color:#c00;font-weight:600;font-size:0.95em;padding:8px;background:#ffe6e6;border-radius:6px;"></div>

                    <div style="display:flex;justify-content:space-between;margin-top:20px;">
                        <button type="button" class="cancel-btn" id="cancelJournalEdit" 
                            style="background:#f2f2f2;color:#555;padding:8px 16px;border:none;border-radius:6px;cursor:pointer;">Cancel</button>
                        <button type="submit" class="confirm-btn" 
                            style="background:#2ecc71;color:#fff;padding:8px 16px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Save Changes</button>
                    </div>
                </form>
            </div>
        `;
        document.body.appendChild(modal);

        // Close modal handlers
        modal.querySelector('#closeJournalEditModal').addEventListener('click', closeEditModal);
        modal.querySelector('#cancelJournalEdit').addEventListener('click', closeEditModal);

        function closeEditModal() {
            modal.style.display = 'none';
            const form = modal.querySelector('#journalEditForm');
            form.reset();
            const editContainer = modal.querySelector('#editAccountRowsContainer');
            editContainer.innerHTML = '';
            const balanceDisplay = modal.querySelector('#editBalanceDisplay');
            balanceDisplay.textContent = 'Balance: 0.00';
        }

        const accountRowsContainer = modal.querySelector('#editAccountRowsContainer');
        const balanceDisplay = modal.querySelector('#editBalanceDisplay');
        const form = modal.querySelector('#journalEditForm');
        
        // File management for edit modal
        let editFiles = []; // New files to be added
        let existingFiles = []; // Files currently stored in S3
        let filesToRemove = []; // Track which existing files to remove

        // Load existing files when modal opens
        const loadExistingFiles = async (transactionId) => {
            try {
                const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_file_get', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        transaction_id: transactionId,
                        requested_by: ADMIN_ID
                    })
                });

                let result = await response.json();
                
                // Handle Lambda response format
                if (result.body && typeof result.body === 'string') {
                    try {
                        result = JSON.parse(result.body);
                    } catch (e) {
                        console.error('Failed to parse Lambda response body:', e);
                    }
                }

                if (response.ok && result.zip_content) {
                    // Extract existing files from zip
                    if (typeof JSZip !== 'undefined' && !window.JSZipLoadFailed) {
                        try {
                            const zip = new JSZip();
                            const extractedZip = await zip.loadAsync(result.zip_content, {base64: true});
                            
                            existingFiles = [];
                            for (const fileName of Object.keys(extractedZip.files)) {
                                const file = extractedZip.files[fileName];
                                if (!file.dir) {
                                    const blob = await file.async('blob');
                                    const fileObj = new File([blob], fileName, { type: blob.type });
                                    fileObj.isExisting = true;
                                    existingFiles.push(fileObj);
                                }
                            }
                        } catch (error) {
                            console.error('Error extracting files:', error);
                            existingFiles = [];
                        }
                    } else {
                        console.warn('JSZip not available, cannot load existing files');
                        existingFiles = [];
                    }
                } else {
                    existingFiles = [];
                }
                
                filesToRemove = [];
                updateEditFileList();
                
            } catch (error) {
                console.error('Error loading existing files:', error);
                existingFiles = [];
                updateEditFileList();
            }
        };

        // File upload handling for edit modal
        const editDragDropArea = modal.querySelector('#editDragDropArea');
        const editFileInput = modal.querySelector('#editFileInput');
        const editFileList = modal.querySelector('#editFileList');

        editDragDropArea.addEventListener('click', () => editFileInput.click());
        editFileInput.addEventListener('change', e => handleEditFiles(Array.from(e.target.files)));
        editDragDropArea.addEventListener('dragover', e => { e.preventDefault(); editDragDropArea.style.background = '#e9e9e9'; });
        editDragDropArea.addEventListener('dragleave', () => editDragDropArea.style.background = '#f9f9f9');
        editDragDropArea.addEventListener('drop', e => { e.preventDefault(); editDragDropArea.style.background = '#f9f9f9'; handleEditFiles(Array.from(e.dataTransfer.files)); });

        function handleEditFiles(newFiles) {
            const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'];
            const allowedMimeTypes = [
                'application/pdf', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/csv', 'image/jpeg', 'image/png'
            ];
            
            const validFiles = [];
            const invalidFiles = [];
            
            newFiles.forEach(file => {
                const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
                const isValidExtension = allowedExtensions.includes(fileExtension);
                const isValidMimeType = allowedMimeTypes.includes(file.type);
                
                if (isValidExtension || isValidMimeType) {
                    validFiles.push(file);
                } else {
                    invalidFiles.push(file.name);
                }
            });
            
            if (invalidFiles.length > 0) {
                alert(`The following files were not added because they are not allowed file types:\\n\\n${invalidFiles.join('\\n')}\\n\\nAllowed types: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, JPG, PNG`);
            }
            
            editFiles = [...editFiles, ...validFiles];
            updateEditFileList();
        }

        function updateEditFileList() {
            const allFiles = [
                ...existingFiles.filter(file => !filesToRemove.includes(file.name)),
                ...editFiles
            ];
            
            if (allFiles.length === 0) {
                editFileList.innerHTML = '<div style="color:#666; font-style:italic; padding:10px;">No files selected</div>';
                return;
            }
            
            editFileList.innerHTML = allFiles.map((file, index) => {
                const isExisting = file.isExisting && !filesToRemove.includes(file.name);
                const isNew = !file.isExisting;
                
                return `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; margin:4px 0; background:#fff; border:1px solid #ddd; border-radius:4px;">
                        <div style="display:flex; align-items:center;">
                            <span style="margin-right:8px;">
                                ${isExisting ? '📁' : '📄'}
                            </span>
                            <span style="font-weight:500;">${file.name}</span>
                            <span style="margin-left:8px; font-size:11px; color:#666; background:${isExisting ? '#e3f2fd' : '#f3e5f5'}; padding:2px 6px; border-radius:10px;">
                                ${isExisting ? 'Existing' : 'New'}
                            </span>
                        </div>
                        <button onclick="removeEditFile('${file.name}', ${isExisting})" 
                                style="background:#dc3545; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:12px;">
                            Remove
                        </button>
                    </div>
                `;
            }).join('');
        }

        // Function to remove files (both existing and new)
        window.removeEditFile = (fileName, isExisting) => {
            if (isExisting) {
                filesToRemove.push(fileName);
            } else {
                editFiles = editFiles.filter(file => file.name !== fileName);
            }
            updateEditFileList();
        };

        // Fetch accounts for dropdowns FIRST, then populate modal
        fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: ADMIN_ID })
        })
        .then(res => res.json())
        .then(data => {
            if (data.body && typeof data.body === 'string') {
                try { 
                    const parsedBody = JSON.parse(data.body);
                    availableAccounts = Array.isArray(parsedBody) ? parsedBody : [];
                } catch (e) {
                    console.error('Error parsing accounts body:', e);
                    availableAccounts = [];
                }
            } else {
                availableAccounts = Array.isArray(data.accounts) ? data.accounts : [];
            }
            
            // Now populate the modal with transaction data
            populateEditModal(entry);
        })
        .catch(err => {
            console.error('Error fetching accounts:', err);
            availableAccounts = [];
            populateEditModal(entry);
        });

        function populateAccountDropdown(selectElement) {
            selectElement.innerHTML = '<option value="">Select account</option>';
            if (availableAccounts && availableAccounts.length > 0) {
                availableAccounts
                    .sort((a, b) => a.account_number.localeCompare(b.account_number))
                    .forEach(acc => {
                        const option = document.createElement('option');
                        option.value = acc.id; // Use integer ID for selection and payload
                        option.textContent = `${acc.account_number} - ${acc.account_name}`;
                        selectElement.appendChild(option);
                    });
            }
        }
        
        function populateEditModal(entry) {
            // Populate modal with current entry data
            modal.querySelector('#editJournalId').value = entry.id;
            modal.querySelector('#editJournalDescription').value = entry.description || '';
            modal.querySelector('#editJournalComment').value = entry.comment || '';
            modal.querySelector('#editJournalType').value = entry.type || 'standard';

            // Clear existing rows
            accountRowsContainer.innerHTML = '';

            // Populate account rows based on current transaction data
            if (entry.debit_account_ids_array && entry.debit_amounts_array) {
                for (let i = 0; i < entry.debit_account_ids_array.length; i++) {
                    const accountId = entry.debit_account_ids_array[i];
                    const amount = entry.debit_amounts_array[i] || 0;
                    if (accountId && amount > 0) {
                        const row = createAccountRow(accountId, amount, '');
                        accountRowsContainer.appendChild(row);
                    }
                }
            }

            if (entry.credit_account_ids_array && entry.credit_amounts_array) {
                for (let i = 0; i < entry.credit_account_ids_array.length; i++) {
                    const accountId = entry.credit_account_ids_array[i];
                    const amount = entry.credit_amounts_array[i] || 0;
                    if (accountId && amount > 0) {
                        const row = createAccountRow(accountId, '', amount);
                        accountRowsContainer.appendChild(row);
                    }
                }
            }

            // Ensure at least one empty row if no data
            if (accountRowsContainer.children.length === 0) {
                const row = createAccountRow();
                accountRowsContainer.appendChild(row);
            }

            // Update balance display
            setTimeout(updateBalance, 100);
            
            // Update account options to prevent duplicates
            setTimeout(updateAccountOptions, 150);
            
            // Load existing files for this transaction
            loadExistingFiles(entry.id);
        }

        function updateAccountOptions() {
            const selectedAccounts = Array.from(accountRowsContainer.querySelectorAll('select'))
                .map(s => s.value)
                .filter(v => v);

            accountRowsContainer.querySelectorAll('select').forEach(select => {
                const currentValue = select.value; 
                populateAccountDropdown(select);     
                select.value = currentValue;         

                Array.from(select.options).forEach(option => {
                    if (option.value && option.value !== currentValue && selectedAccounts.includes(option.value)) {
                        option.disabled = true;
                    }
                });
            });
        }

        function createAccountRow(accountId = '', debitAmount = '', creditAmount = '') {
            const row = document.createElement('div');
            row.className = 'account-row';
            row.style.cssText = 'display:flex;gap:8px;margin-bottom:8px;align-items:center;';

            row.innerHTML = `
                <select style="flex:1;padding:6px;border:1px solid #ccc;border-radius:4px;">
                    <option value="">Select Account</option>
                </select>
                <input type="number" class="debitInput" placeholder="0.00" step="0.01" min="0" 
                    value="${debitAmount}" style="width:100px;padding:6px;border:1px solid #ccc;border-radius:4px;">
                <input type="number" class="creditInput" placeholder="0.00" step="0.01" min="0" 
                    value="${creditAmount}" style="width:100px;padding:6px;border:1px solid #ccc;border-radius:4px;">
                <button type="button" class="removeAccountBtn" style="background:#dc3545;color:#fff;border:none;padding:6px 10px;border-radius:4px;cursor:pointer;">×</button>
            `;

            // Add event listeners
            const select = row.querySelector('select');
            const debitInput = row.querySelector('.debitInput');
            const creditInput = row.querySelector('.creditInput');
            
            // Populate dropdown using the proper function
            populateAccountDropdown(select);
            
            // Set the selected account if provided
            if (accountId) {
                select.value = accountId;
            }
            
            // Update account options to prevent duplicates
            setTimeout(() => updateAccountOptions(), 10);
            const removeBtn = row.querySelector('.removeAccountBtn');

            [select, debitInput, creditInput].forEach(input => {
                input.addEventListener('input', updateBalance);
                input.addEventListener('change', updateBalance);
            });

            // Add account selection change listener to prevent duplicates
            select.addEventListener('change', updateAccountOptions);

            // Prevent both debit and credit on same row
            debitInput.addEventListener('input', () => {
                if (parseFloat(debitInput.value) > 0) creditInput.value = '';
                updateBalance();
            });
            creditInput.addEventListener('input', () => {
                if (parseFloat(creditInput.value) > 0) debitInput.value = '';
                updateBalance();
            });

            removeBtn.addEventListener('click', () => {
                row.remove();
                updateBalance();
                updateAccountOptions();
            });

            return row;
        }

        function updateBalance() {
            const rows = Array.from(accountRowsContainer.querySelectorAll('.account-row'));
            let totalDebit = 0;
            let totalCredit = 0;

            rows.forEach(row => {
                const debit = parseFloat(row.querySelector('.debitInput').value) || 0;
                const credit = parseFloat(row.querySelector('.creditInput').value) || 0;
                totalDebit += debit;
                totalCredit += credit;
            });

            const diff = totalDebit - totalCredit;
            const isBalanced = Math.abs(diff) < 0.005;
            
            balanceDisplay.textContent = `Balance: ${diff.toFixed(2)}`;
            balanceDisplay.style.color = isBalanced ? 'green' : 'red';
        }

        // Add account button
        modal.querySelector('#addEditAccountBtn').addEventListener('click', () => {
            const newRow = createAccountRow();
            accountRowsContainer.appendChild(newRow);
            updateBalance();
        });

        // Form submission
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const description = formData.get('description');
            const comment = formData.get('comment');
            const type = formData.get('type');
            const trans_id = formData.get('id');
            
            function showError(msg) {
                const errorDiv = modal.querySelector('#editFormError');
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
            }

            // Validate and collect account rows
            const rows = Array.from(accountRowsContainer.querySelectorAll('.account-row'));
            const validatedRows = [];
            
            for (const row of rows) {
                const account_id = parseInt(row.querySelector('select').value);
                const debit = parseFloat(row.querySelector('.debitInput').value) || 0;
                const credit = parseFloat(row.querySelector('.creditInput').value) || 0;
                
                if (account_id && (debit > 0 || credit > 0)) {
                    validatedRows.push({ account_id, debit, credit });
                }
            }
            
            if (validatedRows.length === 0) {
                showError('Please fill at least one account row with debit or credit');
                return;
            }
            
            // Check balance
            const totalDebit = validatedRows.reduce((sum, r) => sum + r.debit, 0);
            const totalCredit = validatedRows.reduce((sum, r) => sum + r.credit, 0);
            const diff = totalDebit - totalCredit;
            const EPS = 0.005;
            
            if (Math.abs(diff) > EPS) {
                showError(`Entries not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`);
                return;
            }

            // Transform rows into flattened arrays for Lambda
            const debitAccounts = [];
            const creditAccounts = [];
            const debitAmounts = [];
            const creditAmounts = [];

            validatedRows.forEach(r => {
                if (r.debit > 0) {
                    debitAccounts.push(r.account_id);
                    debitAmounts.push(r.debit);
                }
                if (r.credit > 0) {
                    creditAccounts.push(r.account_id);
                    creditAmounts.push(r.credit);
                }
            });

            const payload = {
                user_id: ADMIN_ID,
                trans_id,
                description,
                comment,
                type,
                debit_account_id: debitAccounts.join(','),
                credit_account_id: creditAccounts.join(','),
                debit: debitAmounts.join(','),
                credit: creditAmounts.join(',')
            };

            // Handle file upload - create new zip with remaining existing files + new files
            const remainingExistingFiles = existingFiles.filter(file => !filesToRemove.includes(file.name));
            const allFilesToZip = [...remainingExistingFiles, ...editFiles];
            
            if (allFilesToZip.length > 0) {
                try {
                    if (typeof JSZip !== 'undefined' && !window.JSZipLoadFailed) {
                        const zip = new JSZip();
                        for (const file of allFilesToZip) {
                            zip.file(file.name, file);
                        }
                        const zipContent = await zip.generateAsync({type: 'base64'});
                        editPayload.files = {
                            zip_content: zipContent,
                            file_count: allFilesToZip.length,
                            replace_existing: true
                        };
                    } else {
                        console.warn('JSZip not available, cannot process files');
                        if (!confirm('File processing unavailable. Continue without file changes?')) {
                            return;
                        }
                    }
                    const zipContent = await zip.generateAsync({type: "base64"});
                    
                    const replaceFilesCheckbox = modal.querySelector('#replaceExistingFiles');
                    payload.files = {
                        zip_content: zipContent,
                        file_count: allFilesToZip.length,
                        replace_existing: true // Always replace since we're sending the complete new file set
                    };
                } catch (err) {
                    console.error('Error processing files:', err);
                    showError('Error processing files: ' + err.message);
                    return;
                }
            }

            try {
                const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_edit_trans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to update transaction');

                if (result.file_upload_error) {
                    console.warn('File upload warning:', result.file_upload_error);
                    alert(`Transaction updated successfully, but file upload failed: ${result.file_upload_error}`);
                } else if (allFilesToZip.length > 0) {
                    const removedCount = filesToRemove.length;
                    const addedCount = editFiles.length;
                    const totalCount = allFilesToZip.length;
                    
                    let message = `Transaction updated successfully with ${totalCount} file(s).`;
                    if (removedCount > 0 && addedCount > 0) {
                        message += ` (${removedCount} removed, ${addedCount} added)`;
                    } else if (removedCount > 0) {
                        message += ` (${removedCount} removed)`;
                    } else if (addedCount > 0) {
                        message += ` (${addedCount} added)`;
                    }
                    
                    alert(message);
                } else {
                    alert('Journal entry updated successfully.');
                }
                
                modal.style.display = 'none';
                await fetchJournalEntries(); // refresh
                // Update badge count for managers
                if (CURRENT_ROLE === 'manager') {
                    updatePendingJournalBadge();
                }
            } catch (err) {
                console.error('Error updating journal entry:', err);
                showError('Failed to update journal entry: ' + (err.message || 'Unknown error'));
            }
        });
    }

// Triggered when Edit button is clicked
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
            // Update badge count
            if (CURRENT_ROLE === 'manager') {
                updatePendingJournalBadge();
            }
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
                <div class="modal-content" style="min-width:420px; position:relative;">
                    <button type="button" id="closeRejectModalX" class="modal-close-x" style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>
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
                        body: JSON.stringify({ manager_id: ADMIN_ID, trans_id: id, rejection_reason: reason })
                    });
                    if (res.ok) {
                        modal.style.display = 'none';
                        await fetchJournalEntries();
                        // Update badge count
                        if (CURRENT_ROLE === 'manager') {
                            updatePendingJournalBadge();
                        }
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
                    // Update badge count
                    if (CURRENT_ROLE === 'manager') {
                        updatePendingJournalBadge();
                    }
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
            modal.style.display = 'flex';
            modal.style.justifyContent = 'center';
            modal.style.alignItems = 'center';
            modal.style.position = 'fixed';
            modal.style.top = '0';
            modal.style.left = '0';
            modal.style.width = '100%';
            modal.style.height = '100%';
            modal.style.backgroundColor = 'rgba(0,0,0,0.4)';
            modal.style.zIndex = '1000';
            modal.innerHTML = `
                <div class="modal-content" 
                    style="min-width:500px;max-width:600px;max-height:80vh;overflow-y:auto; background:#fff;border-radius:10px;padding:24px 32px; box-shadow:0 4px 20px rgba(0,0,0,0.15);position:relative;">
                    <button type="button" id="closeJournalNewModal" class="modal-close-x" 
                        style="position:absolute;top:10px;right:16px;background:none;border:none;font-size:26px;cursor:pointer;color:#555;">&times;</button>

                    <h3 style="text-align:center;margin-top:0;margin-bottom:20px;font-size:1.3rem;font-weight:600;">New Journal Entry</h3>

                    <form id="journalNewForm">
                        <div style="margin-bottom:14px">
                            <div id="dragDropArea" 
                                style="border:2px dashed #ccc;border-radius:8px;padding:18px;text-align:center;margin-bottom:15px;background:#f9f9f9;cursor:pointer;">
                                <div id="dragDropText" style="color:#666;">Drag and drop files here or click to upload</div>
                                <input type="file" id="fileInput" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.jpg,.jpeg,.png" style="display:none">
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

                        <div style="margin-bottom:14px">
                            <label style="display:block;margin-bottom:4px;font-weight:500;">Transaction Type</label>
                            <select name="type" id="newJournalType" 
                                style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                                <option value="standard">Standard</option>
                                <option value="reversal">Reversal</option>
                                <option value="adjustment">Adjustment</option>
                                <option value="closing">Closing</option>
                            </select>
                        </div>

                        <div style="display:flex;">
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:30px;">Accounts</label>
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:115px;">Debit</label>
                        <label style="font-weight:600; margin-top:2px; margin-bottom:6px; margin-left:120px;">Credit</label>
                        </div>

                        <div id="accountRowsContainer"></div>

                        <div style="text-align:right;margin-bottom:16px;">
                            <button type="button" id="addNewAccountBtn" 
                                style="background:#007bff;color:#fff;padding:8px 14px;border:none;border-radius:6px;cursor:pointer;font-weight:500;">
                                + Add New Account
                            </button>
                        </div>

                        <div id="balanceDisplay" style="text-align:center;margin-bottom:16px;font-weight:600;font-size:20px;color:green;">
                            Balance: 0.00
                        </div>

                        <div id="journalFormError" style="display:none;text-align:center;margin-bottom:12px;color:#c00;font-weight:600;font-size:0.95em;padding:8px;background:#ffe6e6;border-radius:6px;"></div>

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

            // Close modal handlers
            modal.querySelector('#closeJournalNewModal').addEventListener('click', closeModal);
            modal.querySelector('#cancelJournalNew').addEventListener('click', closeModal);

            function closeModal() {
                modal.style.display = 'none';
                form.reset();
                fileList.innerHTML = '';
                               files = [];
                accountRowsContainer.innerHTML = '';
                balanceDisplay.textContent = 'Balance: 0.00';
            }

            const accountRowsContainer = modal.querySelector('#accountRowsContainer');
            const balanceDisplay = modal.querySelector('#balanceDisplay');
            const form = modal.querySelector('#journalNewForm');


            let files = [];
            let availableAccounts = [];
            let accountsLoaded = false;

            // Function to populate account dropdowns
            function populateAccountDropdowns() {
                const selects = modal.querySelectorAll('.accountSelect');
                selects.forEach(select => {
                    select.innerHTML = '<option value="">Select Account</option>';
                    availableAccounts.forEach(account => {
                        const option = document.createElement('option');
                        option.value = account.id || account.account_id;
                        option.textContent = `${account.account_number} - ${account.account_name}`;
                        select.appendChild(option);
                    });
                });
            }

            // Load accounts first, then create initial rows
            fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_accounts_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID })
            })
            .then(res => res.json())
            .then(data => {
                let accounts = [];
                if (Array.isArray(data)) accounts = data;
                else if (data.body) {
                    try { accounts = JSON.parse(data.body); } catch { accounts = data.body; }
                }
                availableAccounts = accounts.filter(acc => acc.is_active === true || acc.is_active === 1 || acc.is_active === "1");
                accountsLoaded = true;
                
                // Now add initial account rows with populated dropdowns
                addAccountRow();
                addAccountRow();
            })
            .catch(err => {
                console.error('Error loading accounts:', err);
                // Still add rows but they will be empty
                addAccountRow();
                addAccountRow();
            });

            // Add a new account row
            function addAccountRow() {
                const newRow = document.createElement('div');
                newRow.className = 'account-row';
                newRow.style.display = 'flex';
                newRow.style.gap = '12px';
                newRow.style.marginBottom = '12px';

                newRow.innerHTML = `
                    <div style="flex:1;">
                        <select name="account_number" class="accountSelect" 
                            style="width:100%;padding:8px 10px;border:1px solid #ccc;border-radius:6px;">
                        </select>
                    </div>
                    <div style="flex:1;">
                        <input type="number" name="debit" class="debitInput" min="0" 
                            style="width:100px;padding:8px 10px;border:1px solid #ccc;border-radius:6px; text-align:right;">
                    </div>
                    <div style="flex:1;">
                        <input type="number" name="credit" class="creditInput" min="0" 
                            style="width:100px;padding:8px 10px;border:1px solid #ccc;border-radius:6px; text-align:right;">
                    </div>
                    <div style="flex:0;">
                        <button type="button" class="removeRowBtn" 
                            style="background:none;border:none;color:red;font-size:18px;cursor:pointer;">&times;</button>
                    </div>
                `;
                accountRowsContainer.appendChild(newRow);

                const accountSelect = newRow.querySelector('select');
                const debitInput = newRow.querySelector('.debitInput');
                const creditInput = newRow.querySelector('.creditInput');
                const removeBtn = newRow.querySelector('.removeRowBtn');

                // Populate the dropdown with accounts if they're already loaded
                if (accountsLoaded && availableAccounts.length > 0) {
                    accountSelect.innerHTML = '<option value="">Select Account</option>';
                    availableAccounts.forEach(account => {
                        const option = document.createElement('option');
                        option.value = account.id || account.account_id;
                        option.textContent = `${account.account_number} - ${account.account_name}`;
                        accountSelect.appendChild(option);
                    });
                }

                // Debit/Credit locking
                debitInput.addEventListener('input', () => {
                    if (debitInput.value && parseFloat(debitInput.value) > 0) {
                        creditInput.disabled = true;
                        creditInput.style.background = '#eee';
                    } else {
                        creditInput.disabled = false;
                        creditInput.style.background = '#fff';
                    }
                    updateBalance();
                });

                creditInput.addEventListener('input', () => {
                    if (creditInput.value && parseFloat(creditInput.value) > 0) {
                        debitInput.disabled = true;
                        debitInput.style.background = '#eee';
                    } else {
                        debitInput.disabled = false;
                        debitInput.style.background = '#fff';
                    }
                    updateBalance();
                });

                accountSelect.addEventListener('change', updateAccountOptions);

                removeBtn.addEventListener('click', () => {
                    newRow.remove();
                    updateBalance();
                    updateAccountOptions();
                });
            }

            modal.querySelector('#addNewAccountBtn').addEventListener('click', () => {
                addAccountRow();
                // Ensure new row is populated if accounts are already loaded
                if (accountsLoaded && availableAccounts.length > 0) {
                    populateAccountDropdowns();
                }
            });

            // Update balance
            function updateBalance() {
                const debitFields = form.querySelectorAll('.debitInput');
                const creditFields = form.querySelectorAll('.creditInput');

                let totalDebit = 0, totalCredit = 0;
                debitFields.forEach(i => totalDebit += parseFloat(i.value) || 0);
                creditFields.forEach(i => totalCredit += parseFloat(i.value) || 0);

                const balance = totalDebit - totalCredit;

                // Reorder rows: debit rows first, then credit rows
                const rows = Array.from(accountRowsContainer.querySelectorAll('.account-row'));
                const activeElement = document.activeElement;
                const activeSelectionStart = activeElement.selectionStart;
                const activeSelectionEnd = activeElement.selectionEnd;

                rows.sort((a, b) => {
                    const aDebit = parseFloat(a.querySelector('.debitInput').value) || 0;
                    const aCredit = parseFloat(a.querySelector('.creditInput').value) || 0;
                    const bDebit = parseFloat(b.querySelector('.debitInput').value) || 0;
                    const bCredit = parseFloat(b.querySelector('.creditInput').value) || 0;

                    if ((aDebit > 0 && bDebit > 0) || (aCredit > 0 && bCredit > 0)) return 0;
                    if (aDebit > 0 && bCredit > 0) return -1;
                    if (aCredit > 0 && bDebit > 0) return 1;
                    return 0;
                });

                rows.forEach(row => accountRowsContainer.appendChild(row));

                if (activeElement && activeElement.tagName === 'INPUT') {
                    activeElement.focus();
                    if (typeof activeSelectionStart === 'number' && typeof activeSelectionEnd === 'number') {
                        activeElement.setSelectionRange(activeSelectionStart, activeSelectionEnd);
                    }
                }

                balanceDisplay.textContent = `Balance: ${balance.toFixed(2)}`;
                balanceDisplay.style.color = Math.abs(balance) < 0.001 ? 'green' : 'red';
            }


            // Drag & Drop Files
            const dragDropArea = modal.querySelector('#dragDropArea');
            const fileInput = modal.querySelector('#fileInput');
            const fileList = modal.querySelector('#fileList');

            dragDropArea.addEventListener('click', () => fileInput.click());
            fileInput.addEventListener('change', e => handleFiles(Array.from(e.target.files)));
            dragDropArea.addEventListener('dragover', e => { e.preventDefault(); dragDropArea.style.background = '#e9e9e9'; });
            dragDropArea.addEventListener('dragleave', () => dragDropArea.style.background = '#f9f9f9');
            dragDropArea.addEventListener('drop', e => { e.preventDefault(); dragDropArea.style.background = '#f9f9f9'; handleFiles(Array.from(e.dataTransfer.files)); });

            function handleFiles(newFiles) {
                const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.csv', '.jpg', '.jpeg', '.png'];
                const allowedMimeTypes = [
                    'application/pdf',
                    'application/msword',
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                    'application/vnd.ms-excel',
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                    'text/csv',
                    'image/jpeg',
                    'image/png'
                ];
                
                const validFiles = [];
                const invalidFiles = [];
                
                newFiles.forEach(file => {
                    const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
                    const isValidExtension = allowedExtensions.includes(fileExtension);
                    const isValidMimeType = allowedMimeTypes.includes(file.type);
                    
                    if (isValidExtension || isValidMimeType) {
                        validFiles.push(file);
                    } else {
                        invalidFiles.push(file.name);
                    }
                });
                
                if (invalidFiles.length > 0) {
                    alert(`The following files were not added because they are not allowed file types:\n\n${invalidFiles.join('\n')}\n\nAllowed types: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), CSV, JPG, PNG`);
                }
                
                files = [...files, ...validFiles];
                updateFileList();
            }

            function updateFileList() {
                fileList.innerHTML = files.map((file, index) => `
                    <div style="display:flex; justify-content:space-between; align-items:center; padding:5px; margin:2px 0; background:#fff; border-radius:4px;">
                        <span>${file.name}</span>
                        <button type="button" class="remove-file" data-index="${index}" style="border:none; background:none; color:red; cursor:pointer;">&times;</button>
                    </div>
                `).join('');
                fileList.querySelectorAll('.remove-file').forEach(btn => btn.addEventListener('click', e => {
                    const index = parseInt(e.target.dataset.index);
                    files.splice(index, 1);
                    updateFileList();
                }));
            }

        // Set today's date
        modal.querySelector('#newJournalDate').value = new Date().toISOString().split('T')[0];

         form.addEventListener('submit', async e => {
            e.preventDefault();

            const formData = new FormData(form);
            const description = formData.get('description');
            const date = formData.get('date');
            const type = formData.get('type') || 'standard';
            
            // Clear previous error
            const errorDiv = modal.querySelector('#journalFormError');
            errorDiv.style.display = 'none';
            errorDiv.textContent = '';

            function showError(msg) {
                errorDiv.textContent = msg;
                errorDiv.style.display = 'block';
            }
            
            // Check date
            if (!date) {
                showError('Date is required');
                return;
            }
            
            // Check description
            if (!description || !description.trim()) {
                showError('Description is required');
                return;
            }
            
            // Validate account rows
            const allRows = Array.from(accountRowsContainer.querySelectorAll('.account-row'));
            if (allRows.length === 0) {
                showError('Please add at least one account row');
                return;
            }
            
            let validatedRows = [];
            for (let idx = 0; idx < allRows.length; idx++) {
                const row = allRows[idx];
                const account_id = row.querySelector('select').value;
                const debit = parseFloat(row.querySelector('.debitInput').value) || 0;
                const credit = parseFloat(row.querySelector('.creditInput').value) || 0;
                
                if (!account_id) {
                    showError(`Row ${idx + 1}: Account not selected`);
                    return;
                }
                
                if (debit === 0 && credit === 0) {
                    showError(`Row ${idx + 1}: No debit or credit amount entered`);
                    return;
                }
                
                if (debit > 0 && credit > 0) {
                    showError(`Row ${idx + 1}: Both debit and credit entered (use only one)`);
                    return;
                }
                
                // Only include valid rows in calculation
                if (account_id && (debit > 0 || credit > 0)) {
                    validatedRows.push({ account_id, debit, credit });
                }
            }
            
            if (validatedRows.length === 0) {
                showError('Please fill at least one account row with debit or credit');
                return;
            }
            
            // Check balance
            const totalDebit = validatedRows.reduce((sum, r) => sum + r.debit, 0);
            const totalCredit = validatedRows.reduce((sum, r) => sum + r.credit, 0);
            const diff = totalDebit - totalCredit;
            const EPS = 0.005;
            
            if (Math.abs(diff) > EPS) {
                showError(`Entries not balanced: Debit ${totalDebit.toFixed(2)} ≠ Credit ${totalCredit.toFixed(2)}`);
                return;
            }

            // Collect account rows for submission
            const rows = Array.from(accountRowsContainer.querySelectorAll('.account-row')).map(row => {
                const account_id = row.querySelector('select').value; // Now integer ID
                const debit = parseFloat(row.querySelector('.debitInput').value) || 0;
                const credit = parseFloat(row.querySelector('.creditInput').value) || 0;
                return { account_id, debit, credit };
            }).filter(r => r.account_id && (r.debit > 0 || r.credit > 0));

            // Transform rows into flattened arrays for Lambda
            const debitAccounts = [];
            const creditAccounts = [];
            const debitAmounts = [];
            const creditAmounts = [];

            rows.forEach(r => {
                if (r.debit > 0) {
                    debitAccounts.push(r.account_id);
                    debitAmounts.push(r.debit);
                }
                if (r.credit > 0) {
                    creditAccounts.push(r.account_id);
                    creditAmounts.push(r.credit);
                }
            });

            const payload = {
                user_id: ADMIN_ID,
                date,
                description,
                type,
                status: 'pending',
                debit_account_id: debitAccounts.join(','),
                credit_account_id: creditAccounts.join(','),
                debit: debitAmounts.join(','),
                credit: creditAmounts.join(',')
            };

            // Handle file upload if files are attached
            if (files.length > 0) {
                try {
                    // Check if JSZip is available, if not, skip file processing
                    if (typeof JSZip === 'undefined' || window.JSZipLoadFailed) {
                        console.warn('JSZip not available, skipping file upload');
                        if (!confirm('File upload library not available. Continue without files?')) {
                            return;
                        }
                    } else {
                        // Create zip file with all uploaded files
                        const zip = new JSZip();
                        
                        for (const file of files) {
                            const arrayBuffer = await file.arrayBuffer();
                            zip.file(file.name, arrayBuffer);
                        }
                        
                        // Generate zip as base64
                        const zipContent = await zip.generateAsync({type: 'base64'});
                        
                        // Add files to payload
                        payload.files = {
                            zip_content: zipContent,
                            file_count: files.length
                        };
                    }
                } catch (fileError) {
                    console.error('Error processing files:', fileError);
                    if (!confirm('Error processing files. Continue without files?')) {
                        return;
                    }
                }
            }

            try {
                const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_create_trans', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const result = await response.json();
                if (!response.ok) throw new Error(result.error || 'Failed to create transaction');

                let message = 'Journal entry created successfully!';
                if (result.files) {
                    if (result.files.error) {
                        message += `\n\nNote: Files could not be uploaded: ${result.files.error}`;
                    } else {
                        message += `\n\nFiles uploaded: ${result.files.file_count} files`;
                    }
                }

                alert(message);
                modal.style.display = 'none';
                await fetchJournalEntries();
                // Update badge count for managers
                if (CURRENT_ROLE === 'manager') {
                    updatePendingJournalBadge();
                }
            } catch (err) {
                console.error('Error creating transaction:', err);
                alert('Failed to create journal entry. Please try again.');
            }
        });



        }

        modal.style.display = 'flex';
    }

// Attach new journal button
document.getElementById('newJournalEntryBtn').addEventListener('click', showNewEntryModal);
// Attach new journal button
document.getElementById('newJournalEntryBtn').addEventListener('click', showNewEntryModal);

    function render() {
        let filtered = [...entries];
        
        if (statusFilter !== 'all') {
            filtered = filtered.filter(e => (e.status || '').toLowerCase() === statusFilter);
        }
        
        if (searchTerm) {
            const term = searchTerm.toLowerCase();
            filtered = filtered.filter(e => 
                (e.debit_account_names || '').toLowerCase().includes(term) ||
                (e.credit_account_names || '').toLowerCase().includes(term)
            );
        }

        // Add date filtering
        if (dateFromFilter) {
            filtered = filtered.filter(e => {
                const entryDate = new Date(e.date).toISOString().split('T')[0];
                return entryDate >= dateFromFilter;
            });
        }
        
        if (dateToFilter) {
            filtered = filtered.filter(e => {
                const entryDate = new Date(e.date).toISOString().split('T')[0];
                return entryDate <= dateToFilter;
            });
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

        journalContainer.innerHTML = buildTable(filtered);

        // Add sort handlers
        journalContainer.querySelectorAll('th.sortable').forEach(th => {
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

    document.getElementById('journalFilterFrom').addEventListener('change', (e) => {
        dateFromFilter = e.target.value;
        render();
    });

    document.getElementById('journalFilterTo').addEventListener('change', (e) => {
        dateToFilter = e.target.value;
        render();
    });

    // Initial load
    await fetchJournalEntries();
    
    // Update badge count after loading (for managers)
    if (CURRENT_ROLE === 'manager') {
        updatePendingJournalBadge();
    }
}

// Global function to populate account dropdown
function populateAccountDropdown(selectElement) {
    selectElement.innerHTML = '<option value="">Select account</option>';
    if (window.availableAccounts && window.availableAccounts.length > 0) {
        // Get already selected account IDs from other dropdowns in the same container
        const container = selectElement.closest('.modal-content') || selectElement.closest('#actionContent');
        const selectedIds = [];
        if (container) {
            // Look for both account and account_number selects
            const otherSelects = container.querySelectorAll('select[name="account"], select[name="account_number"], .accountSelect');
            otherSelects.forEach(select => {
                if (select !== selectElement && select.value) {
                    selectedIds.push(parseInt(select.value));
                }
            });
        }

        window.availableAccounts
            .sort((a, b) => a.account_number.localeCompare(b.account_number))
            .forEach(acc => {
                // Skip already selected accounts
                if (!selectedIds.includes(acc.id)) {
                    const option = document.createElement('option');
                    option.value = acc.id; // Use integer ID for selection and payload
                    option.textContent = `${acc.account_number} - ${acc.account_name}`;
                    selectElement.appendChild(option);
                }
            });
    }
}

// Global function to update all account dropdowns to prevent duplicates
function updateAccountOptions() {
    // Find the container (either modal or main content)
    const container = document.querySelector('.modal-content:not([style*="display: none"])') || 
                     document.querySelector('#actionContent');
    
    if (!container) return;

    // Look for both account and account_number selects
    const accountSelects = container.querySelectorAll('select[name="account"], select[name="account_number"], .accountSelect');
    if (accountSelects.length === 0) return;

    const selectedAccounts = Array.from(accountSelects)
        .map(s => s.value)
        .filter(v => v);

    accountSelects.forEach(select => {
        const currentValue = select.value; 
        populateAccountDropdown(select);     
        select.value = currentValue;         

        Array.from(select.options).forEach(option => {
            if (option.value && option.value !== currentValue && selectedAccounts.includes(option.value)) {
                option.disabled = true;
            }
        });
    });
}

// Global function to show transaction details modal
window.showTransactionDetails = (transactionId) => {
    // Handle both string and number transaction IDs
    const entry = globalJournalEntries.find(e => e.id == transactionId || e.id === parseInt(transactionId) || e.id === transactionId.toString());
    if (!entry) {
        alert('Transaction not found');
        return;
    }

    // Create modal if it doesn't exist
    let modal = document.getElementById('transactionDetailsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'transactionDetailsModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: none; align-items: center; 
            justify-content: center; z-index: 1000;
        `;
        
        modal.innerHTML = `
            <div class="modal-content" style="background:#fff; padding:24px; border-radius:12px; max-width:700px; width:90%; max-height:80vh; overflow-y:auto; position:relative;">
                <span class="close" style="position:absolute; top:12px; right:16px; font-size:24px; cursor:pointer; color:#666;">&times;</span>
                <h2 style="margin-top:0; color:#333;">Transaction Details</h2>
                <div id="transactionDetailsContent"></div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    // Populate modal content
    const content = document.getElementById('transactionDetailsContent');
    let debitAccountsHtml = '';
    let creditAccountsHtml = '';
    
    // Build debit accounts table
    if (entry.debit_account_ids_array && entry.debit_amounts_array) {
        debitAccountsHtml = `
            <h3 style="color:#d32f2f; margin-bottom:8px;">Debited Accounts</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="padding:8px; text-align:left; border:1px solid #ddd;">Account</th>
                        <th style="padding:8px; text-align:right; border:1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${entry.debit_account_ids_array.map((accountId, index) => {
                        const amount = entry.debit_amounts_array[index] || 0;
                        const accountName = entry.debit_account_names ? entry.debit_account_names.split(',')[index]?.trim() || `Account ID: ${accountId}` : `Account ID: ${accountId}`;
                        return `
                            <tr>
                                <td style="padding:8px; border:1px solid #ddd;">${accountName}</td>
                                <td style="padding:8px; text-align:right; border:1px solid #ddd;">${formatAccounting(amount)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }
    
    // Build credit accounts table
    if (entry.credit_account_ids_array && entry.credit_amounts_array) {
        creditAccountsHtml = `
            <h3 style="color:#388e3c; margin-bottom:8px;">Credited Accounts</h3>
            <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
                <thead>
                    <tr style="background:#f5f5f5;">
                        <th style="padding:8px; text-align:left; border:1px solid #ddd;">Account</th>
                        <th style="padding:8px; text-align:right; border:1px solid #ddd;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    ${entry.credit_account_ids_array.map((accountId, index) => {
                        const amount = entry.credit_amounts_array[index] || 0;
                        const accountName = entry.credit_account_names ? entry.credit_account_names.split(',')[index]?.trim() || `Account ID: ${accountId}` : `Account ID: ${accountId}`;
                        return `
                            <tr>
                                <td style="padding:8px; border:1px solid #ddd;">${accountName}</td>
                                <td style="padding:8px; text-align:right; border:1px solid #ddd;">${formatAccounting(amount)}</td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;
    }

    content.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
            <div>
                <p><strong>Transaction ID:</strong> #${entry.id}</p>
                <p><strong>Date:</strong> ${new Date(entry.date).toLocaleDateString()}</p>
                <p><strong>Status:</strong> <span style="text-transform:capitalize; padding:4px 8px; border-radius:4px; background:${entry.status === 'approved' ? '#e8f5e8' : entry.status === 'rejected' ? '#ffeaea' : '#fff3cd'}; color:${entry.status === 'approved' ? '#2e7d32' : entry.status === 'rejected' ? '#d32f2f' : '#856404'};">${entry.status || 'pending'}</span></p>
            </div>
            <div>
                <p><strong>Description:</strong> ${entry.description || 'No description'}</p>
                <p><strong>Type:</strong> ${entry.type || 'standard'}</p>
                <p><strong>Created By:</strong> ${entry.created_by || 'Unknown'}</p>
            </div>
        </div>
        
        ${entry.comment ? `
            <div style="margin-bottom:20px; padding:12px; background:#f8f9fa; border-left:4px solid #007bff; border-radius:4px;">
                <h4 style="margin:0 0 8px 0; color:#333;">Comments</h4>
                <p style="margin:0; color:#555;">${entry.comment}</p>
            </div>
        ` : ''}
        
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">
            <div>${debitAccountsHtml}</div>
            <div>${creditAccountsHtml}</div>
        </div>
        
        <div style="margin-top:20px; padding:12px; background:#f1f3f4; border-radius:6px;">
            <p style="margin:0; text-align:center; font-weight:bold;">
                Total Debit: ${formatAccounting(entry.debit_amounts_array?.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0) || 0)} | 
                Total Credit: ${formatAccounting(entry.credit_amounts_array?.reduce((sum, amt) => sum + (parseFloat(amt) || 0), 0) || 0)}
            </p>
        </div>
        
        <!-- Transaction Files Section -->
        <div style="margin-top:20px; padding:16px; background:#fafafa; border-radius:8px; border:1px solid #e0e0e0;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <h4 style="margin:0; color:#333;">Attached Files</h4>
                <button id="loadTransactionFiles" onclick="loadTransactionFiles(${entry.id})" style="background:#007bff; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:12px;">
                    Load Files
                </button>
            </div>
            <div id="transactionFilesContainer" style="min-height:40px; color:#666; font-style:italic;">
                Click "Load Files" to view attached files
            </div>
        </div>
    `;

    modal.style.display = 'flex';
};

// Function to load and display transaction files
window.loadTransactionFiles = async (transactionId) => {
    const container = document.getElementById('transactionFilesContainer');
    const loadButton = document.getElementById('loadTransactionFiles');
    
    // Update UI to show loading state
    loadButton.disabled = true;
    loadButton.textContent = 'Loading...';
    container.innerHTML = '<div style="color:#666;">Loading files...</div>';
    
    try {
        const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_file_get', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_id: transactionId,
                requested_by: ADMIN_ID
            })
        });

        let result = await response.json();
        
        // Handle Lambda response format - if result has body property, parse it
        if (result.body && typeof result.body === 'string') {
            try {
                result = JSON.parse(result.body);
            } catch (e) {
                console.error('Failed to parse Lambda response body:', e);
            }
        }
        
        if (!response.ok || result.error) {
            throw new Error(result.error || 'Failed to load files');
        }

        if (result.message === 'No files found for this transaction.') {
            container.innerHTML = '<div style="color:#666; font-style:italic;">No files attached to this transaction</div>';
            return;
        }

        // Debug: Check what we received
        console.log('File response:', result);
        console.log('Response keys:', Object.keys(result));
        
        if (!result.zip_content) {
            throw new Error(`No zip content received from server. Response: ${JSON.stringify(result)}`);
        }

        // Extract zip file using JSZip
        if (typeof JSZip === 'undefined' || window.JSZipLoadFailed) {
            container.innerHTML = '<div style="color:#f00;">File viewing not available - JSZip library failed to load</div>';
            return;
        }
        
        const zip = new JSZip();
        // The result.zip_content should be base64 encoded
        let extractedZip;
        try {
            extractedZip = await zip.loadAsync(result.zip_content, {base64: true});
        } catch (zipError) {
            console.error('Zip loading error:', zipError);
            console.log('Zip content type:', typeof result.zip_content);
            console.log('Zip content length:', result.zip_content?.length);
            throw new Error('Failed to extract zip file: ' + zipError.message);
        }
        
        // Display file list
        const fileNames = Object.keys(extractedZip.files);
        
        if (fileNames.length === 0) {
            container.innerHTML = '<div style="color:#666; font-style:italic;">No files found in archive</div>';
            return;
        }

        const fileListHtml = fileNames.map(fileName => {
            const file = extractedZip.files[fileName];
            if (file.dir) return ''; // Skip directories
            
            const fileExtension = fileName.split('.').pop().toLowerCase();
            const isViewable = ['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md'].includes(fileExtension);
            const isImage = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(fileExtension);
            
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:8px; margin:4px 0; background:white; border:1px solid #ddd; border-radius:4px;">
                    <span style="font-weight:500; color:#333;">📄 ${fileName}</span>
                    <div>
                        ${isViewable || isImage ? `
                            <button onclick="viewFileContent('${fileName}', '${transactionId}')" 
                                    style="background:#17a2b8; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:12px; margin-right:4px;">
                                View
                            </button>
                        ` : ''}
                        <button onclick="downloadExtractedFile('${fileName}', '${transactionId}')" 
                                style="background:#28a745; color:white; border:none; padding:4px 8px; border-radius:3px; cursor:pointer; font-size:12px;">
                            Download
                        </button>
                    </div>
                </div>
            `;
        }).filter(html => html).join('');

        container.innerHTML = `
            <div style="margin-bottom:8px; color:#333; font-weight:500;">
                ${fileNames.filter(name => !extractedZip.files[name].dir).length} file(s) found:
            </div>
            ${fileListHtml}
        `;
        
        // Store extracted zip data for download function
        window.currentExtractedZip = extractedZip;

    } catch (error) {
        console.error('Error loading transaction files:', error);
        container.innerHTML = `<div style="color:#d32f2f;">Error loading files: ${error.message}</div>`;
    } finally {
        loadButton.disabled = false;
        loadButton.textContent = 'Reload Files';
    }
};

// Function to download individual extracted files
window.downloadExtractedFile = async (fileName, transactionId) => {
    try {
        if (!window.currentExtractedZip || !window.currentExtractedZip.files[fileName]) {
            alert('File data not available. Please reload the files.');
            return;
        }

        const file = window.currentExtractedZip.files[fileName];
        const blob = await file.async('blob');
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        
        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
    } catch (error) {
        console.error('Error downloading file:', error);
        alert('Error downloading file: ' + error.message);
    }
};

// Function to view file content in a modal
window.viewFileContent = async (fileName, transactionId) => {
    try {
        if (!window.currentExtractedZip || !window.currentExtractedZip.files[fileName]) {
            alert('File data not available. Please reload the files.');
            return;
        }

        const file = window.currentExtractedZip.files[fileName];
        const fileExtension = fileName.split('.').pop().toLowerCase();
        
        // Create or get the file content modal
        let contentModal = document.getElementById('fileContentModal');
        if (!contentModal) {
            contentModal = document.createElement('div');
            contentModal.id = 'fileContentModal';
            contentModal.className = 'modal-overlay';
            contentModal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                background: rgba(0,0,0,0.7); display: none; align-items: center; 
                justify-content: center; z-index: 1100;
            `;
            
            contentModal.innerHTML = `
                <div class="modal-content" style="background:#fff; padding:20px; border-radius:8px; max-width:90%; width:800px; max-height:80vh; overflow:hidden; position:relative; display:flex; flex-direction:column;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; border-bottom:1px solid #ddd; padding-bottom:12px;">
                        <h3 style="margin:0; color:#333;" id="fileContentTitle">File Content</h3>
                        <button style="background:none; border:none; font-size:20px; cursor:pointer; color:#666; padding:4px;" onclick="document.getElementById('fileContentModal').style.display='none'">&times;</button>
                    </div>
                    <div id="fileContentBody" style="flex:1; overflow:auto; background:#f8f9fa; padding:16px; border-radius:4px; border:1px solid #e9ecef;">
                        <div style="text-align:center; color:#666;">Loading...</div>
                    </div>
                    <div style="margin-top:12px; text-align:right;">
                        <button onclick="downloadExtractedFile('${fileName}', '${transactionId}')" style="background:#28a745; color:white; border:none; padding:8px 16px; border-radius:4px; cursor:pointer;">
                            Download File
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(contentModal);
            
            // Close modal when clicking outside
            contentModal.onclick = (e) => {
                if (e.target === contentModal) contentModal.style.display = 'none';
            };
        }
        
        // Update modal title and show modal
        document.getElementById('fileContentTitle').textContent = fileName;
        contentModal.style.display = 'flex';
        
        const contentBody = document.getElementById('fileContentBody');
        contentBody.innerHTML = '<div style="text-align:center; color:#666;">Loading file content...</div>';
        
        // Handle different file types
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(fileExtension)) {
            // Display image
            const arrayBuffer = await file.async('arraybuffer');
            const blob = new Blob([arrayBuffer]);
            const imageUrl = URL.createObjectURL(blob);
            
            contentBody.innerHTML = `
                <div style="text-align:center;">
                    <img src="${imageUrl}" style="max-width:100%; max-height:500px; border-radius:4px; box-shadow:0 2px 8px rgba(0,0,0,0.1);" alt="${fileName}">
                </div>
            `;
            
            // Cleanup URL after a delay
            setTimeout(() => URL.revokeObjectURL(imageUrl), 10000);
            
        } else if (['txt', 'csv', 'json', 'xml', 'html', 'css', 'js', 'md', 'log'].includes(fileExtension)) {
            // Display text content
            const textContent = await file.async('text');
            const isJson = fileExtension === 'json';
            const isXml = fileExtension === 'xml';
            const isCsv = fileExtension === 'csv';
            
            let displayContent = textContent;
            
            // Format JSON
            if (isJson) {
                try {
                    const parsed = JSON.parse(textContent);
                    displayContent = JSON.stringify(parsed, null, 2);
                } catch (e) {
                    displayContent = textContent; // Use original if parsing fails
                }
            }
            
            // Create appropriate display based on file type
            if (isCsv) {
                // Try to display CSV as a table
                const lines = textContent.split('\n').filter(line => line.trim());
                if (lines.length > 0) {
                    const headers = lines[0].split(',').map(h => h.trim());
                    const rows = lines.slice(1).map(line => line.split(',').map(cell => cell.trim()));
                    
                    let tableHtml = '<div style="overflow:auto;"><table style="width:100%; border-collapse:collapse; font-size:12px;">';
                    tableHtml += '<thead><tr style="background:#e9ecef;">';
                    headers.forEach(header => {
                        tableHtml += `<th style="padding:8px; border:1px solid #dee2e6; text-align:left;">${header}</th>`;
                    });
                    tableHtml += '</tr></thead><tbody>';
                    
                    rows.slice(0, 50).forEach(row => { // Limit to 50 rows for performance
                        tableHtml += '<tr>';
                        row.forEach(cell => {
                            tableHtml += `<td style="padding:6px; border:1px solid #dee2e6;">${cell}</td>`;
                        });
                        tableHtml += '</tr>';
                    });
                    
                    tableHtml += '</tbody></table></div>';
                    if (rows.length > 50) {
                        tableHtml += `<div style="margin-top:8px; color:#666; font-style:italic;">Showing first 50 rows of ${rows.length} total rows</div>`;
                    }
                    
                    contentBody.innerHTML = tableHtml;
                } else {
                    contentBody.innerHTML = `<pre style="margin:0; white-space:pre-wrap; font-family:monospace; font-size:12px;">${displayContent}</pre>`;
                }
            } else {
                // Display as formatted text
                contentBody.innerHTML = `
                    <pre style="margin:0; white-space:pre-wrap; font-family:monospace; font-size:12px; line-height:1.4;">${displayContent}</pre>
                `;
            }
            
        } else if (['pdf'].includes(fileExtension)) {
            // For PDF files, show a message with download option
            contentBody.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <div style="font-size:48px; margin-bottom:16px;">📄</div>
                    <h4 style="margin:0 0 8px 0;">PDF Document</h4>
                    <p style="margin:0 0 20px 0;">PDF files cannot be previewed directly.<br>Click download to view the file.</p>
                    <button onclick="downloadExtractedFile('${fileName}', '${transactionId}')" style="background:#dc3545; color:white; border:none; padding:12px 24px; border-radius:4px; cursor:pointer; font-size:14px;">
                        Download PDF
                    </button>
                </div>
            `;
        } else {
            // For other file types, show file info and download option
            const blob = await file.async('blob');
            const sizeInKB = (blob.size / 1024).toFixed(1);
            
            contentBody.innerHTML = `
                <div style="text-align:center; padding:40px; color:#666;">
                    <div style="font-size:48px; margin-bottom:16px;">📁</div>
                    <h4 style="margin:0 0 8px 0;">${fileName}</h4>
                    <p style="margin:0 0 8px 0;">File Type: ${fileExtension.toUpperCase()}</p>
                    <p style="margin:0 0 20px 0;">Size: ${sizeInKB} KB</p>
                    <p style="margin:0 0 20px 0; font-style:italic;">This file type cannot be previewed.<br>Use the download button to view the file.</p>
                    <button onclick="downloadExtractedFile('${fileName}', '${transactionId}')" style="background:#007bff; color:white; border:none; padding:12px 24px; border-radius:4px; cursor:pointer; font-size:14px;">
                        Download File
                    </button>
                </div>
            `;
        }
        
    } catch (error) {
        console.error('Error viewing file content:', error);
        alert('Error viewing file: ' + error.message);
    }
};

// Simple account details modal (reuse behavior from admin module)
function showAccountModal(accountNumber) {
    let acc = null;
    let accountId = null;
    
    try {
        // Search DOM rows for a matching data-account-number attribute
        const el = document.querySelector(`[data-account-number='${accountNumber}']`);
        if (el) {
            const cells = el.querySelectorAll('td');
            acc = { account_number: accountNumber };
            if (cells && cells.length) {
                acc.account_name = cells[1]?.textContent || '';
                acc.category = cells[2]?.textContent || '';
                acc.subcategory = cells[3]?.textContent || '';
                acc.balance = cells[4]?.textContent || '';
                acc.statement = cells[5]?.textContent || '';
                acc.description = cells[6]?.textContent || '';
            }
        }
        
        // Always map account number to account ID using availableAccounts
        if (window.availableAccounts && Array.isArray(window.availableAccounts)) {
            const found = window.availableAccounts.find(a => String(a.account_number) === String(accountNumber));
            if (found) accountId = Number(found.id || found.account_id);
        }
    } catch (e) { acc = null; }

    if (!acc) {
        acc = { account_number: accountNumber, account_name: '', category: '', subcategory: '', balance: '', statement: '', description: '' };
    }

    let modal = document.getElementById('accountViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'accountViewModal';
        modal.className = 'modal-overlay';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
            background: rgba(0,0,0,0.5); display: none; align-items: center; 
            justify-content: center; z-index: 1000; overflow-y: auto;
        `;
        modal.innerHTML = `
            <div class="modal-content" style="background:#fff; padding:24px 24px 24px 24px; border-radius:12px; max-width:95%; width:1100px; max-height:90vh; overflow-y:auto; position:relative; margin:20px auto;">
                <span class="close" style="position:absolute; top:10px; right:16px; font-size:28px; cursor:pointer; color:#666; z-index:10;">&times;</span>
                <h2 style="margin-top:0; margin-bottom:20px; color:#333;">Account Details</h2>
                <div id="accountViewBody"></div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Close modal handlers
        modal.querySelector('.close').onclick = () => modal.style.display = 'none';
        modal.onclick = (e) => {
            if (e.target === modal) modal.style.display = 'none';
        };
    }

    const bodyDiv = modal.querySelector('#accountViewBody');
    bodyDiv.innerHTML = `
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:20px;">
            <div>
                <p><strong>Account Number:</strong> ${acc.account_number || 'N/A'}</p>
                <p><strong>Account Name:</strong> ${acc.account_name || 'N/A'}</p>
                <p><strong>Status:</strong> <span style="text-transform:capitalize; padding:4px 8px; border-radius:4px; background:#e8f5e8; color:#2e7d32;">Active</span></p>
            </div>
            <div>
                <p><strong>Category:</strong> ${acc.category || 'N/A'}</p>
                <p><strong>Subcategory:</strong> ${acc.subcategory || 'N/A'}</p>
                <p><strong>Statement:</strong> ${acc.statement || 'N/A'}</p>
            </div>
        </div>
        
        <div style="margin-bottom:20px; padding:12px; background:#f1f3f4; border-radius:6px;">
            <p style="margin:0; text-align:center; font-weight:bold;">
                Current Balance: ${formatAccounting(acc.balance || 0)}
            </p>
        </div>
        
        <div id="accountTransTableWrap"><p>Loading transactions...</p></div>
    `;

    modal.style.display = 'flex';

    // Fetch transactions for this account and populate the table
    (async () => {
        try {
            const response = await fetch('https://is8v3qx6m4.execute-api.us-east-1.amazonaws.com/dev/AA_trans_list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: ADMIN_ID})
            });
            let data = await response.json();
            
            if (data && typeof data.body === 'string') {
                try { data = JSON.parse(data.body); } catch (e) {}
            }
            let entries = Array.isArray(data) ? data :
                         Array.isArray(data.body) ? data.body :
                         Array.isArray(data.transactions) ? data.transactions : [];
            
            // Filter for this account using account ID
            let filtered = [];
            if (accountId) {
                const accountIdInt = parseInt(accountId); // Convert to integer for comparison
                
                filtered = entries.filter(e => {
                    const hasDebit = Array.isArray(e.debit_account_ids_array) && e.debit_account_ids_array.includes(accountIdInt);
                    const hasCredit = Array.isArray(e.credit_account_ids_array) && e.credit_account_ids_array.includes(accountIdInt);
                    return hasDebit || hasCredit;
                });
                
                // Only show approved transactions
                filtered = filtered.filter(e => (e.status || '').toLowerCase() === 'approved');
                
                // Sort chronologically by date, then by ID
                filtered.sort((a, b) => {
                    const dateA = new Date(a.created_at).getTime();
                    const dateB = new Date(b.created_at).getTime();
                    if (dateA !== dateB) return dateA - dateB;
                    return a.id - b.id;
                });
            }

            let html = `<table border="none" border-collapse="collapse" cellpadding="8" cellspacing="0" style="width:100%; max-width:1000px; margin:0 auto 12px auto; border-collapse:collapse;">
                <tr>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:120px;">Date</th>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:14px;">Reference No.</th>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:300px;">Description</th>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:100px;">Debit</th>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:100px;">Credit</th>
                    <th style="text-align:center; padding:12px; font-size:1.1em; min-width:120px;">Balance</th>
                </tr>`;
            
            if (!filtered.length) {
                html += `<tr><td colspan="6" style="text-align:center; color:#c00; padding:16px;">No transactions found for this account.</td></tr>`;
            } else {
                let runningBalance = 0;
                filtered.forEach(e => {
                    const accountIdInt = parseInt(accountId); // Use integer for comparison
                    const isDebit = e.debit_account_ids_array && e.debit_account_ids_array.includes(accountIdInt);
                    const isCredit = e.credit_account_ids_array && e.credit_account_ids_array.includes(accountIdInt);
                    
                    let debitAmount = 0;
                    let creditAmount = 0;
                    
                    if (isDebit) {
                        const debitIndex = e.debit_account_ids_array.indexOf(accountIdInt);
                        debitAmount = e.debit_amounts_array[debitIndex] || 0;
                        runningBalance += debitAmount;
                    }
                    
                    if (isCredit) {
                        const creditIndex = e.credit_account_ids_array.indexOf(accountIdInt);
                        creditAmount = e.credit_amounts_array[creditIndex] || 0;
                        runningBalance -= creditAmount;
                    }
                    
                    html += `<tr>
                        <td style="text-align:center; padding:8px;">${new Date(e.created_at).toLocaleDateString()}</td>
                        <td style="text-align:center; padding:8px;"><a href="#" onclick="switchToJournalAndShowTransaction('${e.id}'); return false;" style="color:#007bff; text-decoration:underline; cursor:pointer;">${e.id || ''}</a></td>
                        <td style="text-align:left; padding:8px;">${e.description || ''}</td>
                        <td style="text-align:right; padding:8px;">${debitAmount ? formatAccounting(debitAmount) : ''}</td>
                        <td style="text-align:right; padding:8px;">${creditAmount ? formatAccounting(creditAmount) : ''}</td>
                        <td style="text-align:right; padding:8px;">${formatAccounting(runningBalance)}</td>
                    </tr>`;
                });
            }
            
            html += `</table>`;
            document.getElementById('accountTransTableWrap').innerHTML = html;
        } catch (err) {
            document.getElementById('accountTransTableWrap').innerHTML = `<p style="color:red;">Error loading transactions: ${err.message}</p>`;
        }
    })();
}

// Function to switch to journal tab and show transaction details
function switchToJournalAndShowTransaction(transactionId) {
    // Close the account modal first
    const accountModal = document.getElementById('accountViewModal');
    if (accountModal) {
        accountModal.style.display = 'none';
    }
    
    // Switch to journal tab
    const journalTab = document.querySelector('button[data-tab="journal"]');
    if (journalTab) {
        journalTab.click();
    }
    
    // Wait for tab to load and then show transaction details
    setTimeout(() => {
        showTransactionDetails(transactionId);
    }, 1000);
}
