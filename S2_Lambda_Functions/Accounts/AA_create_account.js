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

  // perform DB work and record event log (only log after creation)
  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [result] = await conn.execute(
      `INSERT INTO Accounts (account_number, account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment, added_by, balance)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [account_number, account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment, admin_id, initial_balance]
    );
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES ('Accounts', ?, 'CREATE ACCOUNT', JSON_OBJECT('account_number', ?, 'account_name', ?, 'initial_balance', ?), ?)`,
      [result.insertId, account_number, account_name, initial_balance, admin_id]
    );
  // creation completed; event log written to DB
    return { statusCode: 201, body: JSON.stringify({ message: "Account created successfully" }) };
  } catch (err) {
    console.error('Error in AA_create_account:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
