import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { admin_id, account_number, account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment } = body;

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [beforeRows] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);
    const before = beforeRows && beforeRows[0] ? beforeRows[0] : null;

    await conn.execute(
      `UPDATE Accounts SET account_name=?, description=?, normal_side=?, category=?, subcategory=?, initial_balance=?, \`order\`=?, statement=?, comment=? WHERE account_number=?`,
      [account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment, account_number]
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
