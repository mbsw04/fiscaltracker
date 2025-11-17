import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  // Parse body safely
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { admin_id, account_number, account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment } = body;

  // Function to determine normal side based on category
  function getNormalSide(category) {
    switch(category) {
      case 'assets':
      case 'expenses':
        return 'debit';
      case 'liabilities':
      case 'ownerEquity':
      case 'revenue':
        return 'credit';
      default:
        return 'debit'; // fallback
    }
  }

  // Determine normal side based on category (override any provided normal_side)
  const calculatedNormalSide = getNormalSide(category);

  // Validation: account_number must be digits only (no decimals, spaces, or letters)
  if (!account_number || typeof account_number !== 'string') {
    return { statusCode: 400, body: JSON.stringify({ error: 'account_number is required and must be a string of digits' }) };
  }
  const acctNumClean = account_number.trim();
  const acctNumDigitsOnly = /^\d+$/.test(acctNumClean);
  if (!acctNumDigitsOnly) {
    return { statusCode: 400, body: JSON.stringify({ error: 'account_number must contain digits only (no decimals, spaces, or letters)' }) };
  }

  // basic validation for account_name
  if (!account_name || String(account_name).trim().length === 0) {
    return { statusCode: 400, body: JSON.stringify({ error: 'account_name is required' }) };
  }

  // perform DB work and record event log (only log after creation)
  let conn;

  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    
  // verify admin exists (include role for authorization check)
  const [adminRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [admin_id]);
  const admin = adminRows && adminRows[0] ? adminRows[0] : null;
  console.log('AA_create_account - admin lookup result:', admin);
    if (!admin) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Admin user not found' }) };
    } else { if (String(admin.role).toLowerCase() !== 'administrator') {
      return { statusCode: 403, body: JSON.stringify({ error: 'User not authorized to create accounts' }) };
      }
    }

    // Check for duplicates: account_number or account_name must not already exist
    const [existingByNumber] = await conn.execute(`SELECT id FROM Accounts WHERE account_number = ? LIMIT 1`, [acctNumClean]);
    if (existingByNumber && existingByNumber.length > 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'An account with this account_number already exists' }) };
    }
    const [existingByName] = await conn.execute(`SELECT id FROM Accounts WHERE account_name = ? LIMIT 1`, [String(account_name).trim()]);
    if (existingByName && existingByName.length > 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'An account with this account_name already exists' }) };
    }

    const [result] = await conn.execute(
      'INSERT INTO Accounts (account_number, account_name, description, normal_side, category, subcategory, initial_balance, statement, comment, added_by, balance)\n       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [acctNumClean, account_name, description, calculatedNormalSide, category, subcategory, initial_balance, statement, comment, admin_id, initial_balance]
    );
    
    // fetch the created row and store the full row JSON in the event log
    const [createdRows] = await conn.execute(`SELECT * FROM Accounts WHERE id = ?`, [result.insertId]);
    const createdRow = createdRows && createdRows[0] ? createdRows[0] : null;
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      ['Accounts', result.insertId, 'CREATE ACCOUNT', JSON.stringify(createdRow || {}), admin_id]
    );

    // creation completed; event log written to DB
    return { 
      statusCode: 201, 
      body: JSON.stringify({ message: "Account created successfully" }) 
    };
  } catch (err) {
    console.error('Error in AA_create_account:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ error: err.message, stack: err.stack })
    };
  } finally {
    if (conn) try {
      await conn.end(); 
    } catch (e) {
      console.warn('Error closing connection', e); 
    }
  }
}