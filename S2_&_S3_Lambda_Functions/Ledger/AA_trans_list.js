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
      SELECT t.*, ca.account_name AS credit_account, da.account_name AS debit_account
      FROM Transactions t
      JOIN Accounts ca ON t.credit_account_id = ca.id
      JOIN Accounts da ON t.debit_account_id = da.id
      ORDER BY t.created_at DESC
    `);
  // completed - returning transaction rows
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    console.error('Error in AA_trans_list:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
