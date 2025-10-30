import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, credit_account_id, credit, debit_account_id, debit, description, comment, type } = body;

  // Validate transaction type
  const validTypes = ['standard', 'reversal', 'adjustment', 'closing'];
  const transactionType = type || 'standard'; // Default to 'standard' if not provided
  if (!validTypes.includes(transactionType)) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ 
        error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` 
      }) 
    };
  }

  // Convert arrays to comma-separated strings with 2 decimal places
  const creditAccountStr = Array.isArray(credit_account_id) ? credit_account_id.join(',') : String(credit_account_id || '');
  const creditStr = Array.isArray(credit) ? 
    credit.map(amt => parseFloat(amt).toFixed(2)).join(',') : 
    parseFloat(credit || 0).toFixed(2);
  const debitAccountStr = Array.isArray(debit_account_id) ? debit_account_id.join(',') : String(debit_account_id || '');
  const debitStr = Array.isArray(debit) ? 
    debit.map(amt => parseFloat(amt).toFixed(2)).join(',') : 
    parseFloat(debit || 0).toFixed(2);

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    const [userRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    const [result] = await conn.execute(
      `INSERT INTO Transactions (credit_account_id, debit_account_id, credit, debit, type, description, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [creditAccountStr, debitAccountStr, creditStr, debitStr, transactionType, description, comment || null, user_id]
    );

    // fetch created transaction and write full JSON to event log
    const [createdRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [result.insertId]);
    const createdRow = createdRows && createdRows[0] ? createdRows[0] : null;
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      ['Transactions', result.insertId, 'CREATE TRANSACTION', JSON.stringify(createdRow || {}), user_id]
    );

    // created - event logged to DB
    return { statusCode: 201, body: JSON.stringify({ message: "Transaction created successfully" }) };
  } catch (err) {
    console.error('Error in AA_create_trans:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
