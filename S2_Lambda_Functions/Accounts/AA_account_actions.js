import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { admin_id, action, account_number } = body;

  if (!action || !account_number) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing action or account_number' }) };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    if (action === "DEACTIVATE ACCOUNT") {
      await conn.execute(`UPDATE Accounts SET is_active = FALSE WHERE account_number = ?`, [account_number]);
      await conn.execute(
        `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
         VALUES ('Accounts', (SELECT id FROM Accounts WHERE account_number = ?), 'DEACTIVATE ACCOUNT', JSON_OBJECT('account_number', ?), ?)`,
        [account_number, account_number, admin_id]
      );
    }

  // completed - event logged to DB
    return { statusCode: 200, body: JSON.stringify({ message: `Action ${action} executed successfully.` }) };
  } catch (err) {
    console.error('Error in AA_account_actions:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
