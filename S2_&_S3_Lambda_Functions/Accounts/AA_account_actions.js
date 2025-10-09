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

    // verify admin exists
    const [adminRows] = await conn.execute(`SELECT id FROM Users WHERE id = ?`, [admin_id]);
    const admin = adminRows && adminRows[0] ? adminRows[0] : null;
    if (!admin) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Admin user not found' }) };
    } else { if (String(admin.role).toLowerCase() !== 'administrator') {
      return { statusCode: 403, body: JSON.stringify({ error: 'User not authorized to perform account actions' }) };
      } 
    }
    
    if (action === "DEACTIVATE ACCOUNT") {
      // get the current state (before image)
      const [beforeRows] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);
      const beforeRow = beforeRows && beforeRows[0] ? beforeRows[0] : null;

      //check if beforeRow exist and balance is zero
      if (!beforeRow) {
        return { statusCode: 404, body: JSON.stringify({ error: 'Account not found' }) };
      } else if (parseFloat(beforeRow.balance) !== 0) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Account balance must be zero to deactivate' }) };
      }
      
      // perform the update
      await conn.execute(`UPDATE Accounts SET is_active = FALSE WHERE account_number = ?`, [account_number]);

      // fetch the account row after change (after image)
      const [acctRows] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);
      const acctRow = acctRows && acctRows[0] ? acctRows[0] : null;

      // Insert Event_Log with both before and after images
      await conn.execute(
        `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
         VALUES (?, ?, ?, ?, ?, ?)`,
        ['Accounts', (beforeRow && beforeRow.id) || (acctRow && acctRow.id) || null, 'DEACTIVATE ACCOUNT', JSON.stringify(beforeRow || {}), JSON.stringify(acctRow || {}), admin_id]
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
}
