import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { admin_id, original_account_number, account_number, account_name, description, normal_side, category, subcategory, initial_balance, statement, comment } = body;

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    
  // verify admin exists (include role for authorization check)
  const [adminRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [admin_id]);
  const admin = adminRows && adminRows[0] ? adminRows[0] : null;
  console.log('AA_edit_account - admin lookup result:', admin);
    if (!admin) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Admin user not found' }) };
    } else { if (String(admin.role).toLowerCase() !== 'administrator') {
      return { statusCode: 403, body: JSON.stringify({ error: 'User not authorized to edit accounts' }) };
      }
    }
    
    const lookupAccountNumber = original_account_number && original_account_number !== '' ? original_account_number : account_number;
    const [beforeRows] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [lookupAccountNumber]);
    const before = beforeRows && beforeRows[0] ? beforeRows[0] : null;

    // Update - allow changing the account_number value (rename) by setting account_number = ?
    await conn.execute(
      `UPDATE Accounts SET account_number=?, account_name=?, description=?, normal_side=?, category=?, subcategory=?, initial_balance=?, statement=?, comment=? WHERE account_number=?`,
      [account_number, account_name, description, normal_side, category, subcategory, initial_balance, statement, comment, lookupAccountNumber]
    );

    const [afterRows] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);
    const after = afterRows && afterRows[0] ? afterRows[0] : null;

    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES ('Accounts', ?, 'UPDATE ACCOUNT', ?, ?, ?)`,
      [before ? before.id : null, JSON.stringify(before || {}), JSON.stringify(after || {}), admin_id]
    );

    // completed - event logged to DB
    return { statusCode: 200, body: JSON.stringify({ message: "Account updated successfully" }) };
  } catch (err) {
    console.error('Error in AA_edit_account:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
