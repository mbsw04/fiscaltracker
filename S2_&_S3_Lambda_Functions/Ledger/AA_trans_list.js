import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id } = body;

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // validate user exists and fetch role
    const [userRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    // fetch transactions ordered newest-first
    const [rows] = await conn.execute(`
      SELECT t.*
      FROM Transactions t
      ORDER BY t.created_at DESC
    `);

    // Process each row to add account names for the arrays
    const processedRows = await Promise.all(rows.map(async (row) => {
      // Parse credit account IDs and get names
      const creditAccountIds = row.credit_account_id ? 
        String(row.credit_account_id).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];
      const debitAccountIds = row.debit_account_id ? 
        String(row.debit_account_id).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id)) : [];

      // Get account names for credit accounts
      const creditAccountNames = [];
      for (const id of creditAccountIds) {
        const [nameRows] = await conn.execute(`SELECT account_name FROM Accounts WHERE id = ?`, [id]);
        creditAccountNames.push(nameRows[0]?.account_name || `Account ${id}`);
      }

      // Get account names for debit accounts  
      const debitAccountNames = [];
      for (const id of debitAccountIds) {
        const [nameRows] = await conn.execute(`SELECT account_name FROM Accounts WHERE id = ?`, [id]);
        debitAccountNames.push(nameRows[0]?.account_name || `Account ${id}`);
      }

      return {
        ...row,
        credit_account_names: creditAccountNames.join(', '),
        debit_account_names: debitAccountNames.join(', '),
        credit_account_ids_array: creditAccountIds,
        debit_account_ids_array: debitAccountIds,
        credit_amounts_array: row.credit ? String(row.credit).split(',').map(amt => parseFloat(parseFloat(amt.trim()).toFixed(2))) : [],
        debit_amounts_array: row.debit ? String(row.debit).split(',').map(amt => parseFloat(parseFloat(amt.trim()).toFixed(2))) : []
      };
    }));

  // completed - returning processed transaction rows
    return { statusCode: 200, body: JSON.stringify(processedRows) };
  } catch (err) {
    console.error('Error in AA_trans_list:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};