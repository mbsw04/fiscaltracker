import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, trans_id, credit, debit, description } = body;

  // Convert arrays to comma-separated strings with 2 decimal places
  const creditStr = Array.isArray(credit) ? 
    credit.map(amt => parseFloat(amt).toFixed(2)).join(',') : 
    parseFloat(credit || 0).toFixed(2);
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

    const [beforeRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const before = beforeRows && beforeRows[0] ? beforeRows[0] : null;
    await conn.execute(
      `UPDATE Transactions SET credit=?, debit=?, description=? WHERE id=?`,
      [creditStr, debitStr, description, trans_id]
    );
    const [afterRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const after = afterRows && afterRows[0] ? afterRows[0] : null;
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES ('Transactions', ?, 'UPDATE TRANSACTION', ?, ?, ?)`,
      [trans_id, JSON.stringify(before || {}), JSON.stringify(after || {}), user_id]
    );

  // completed - event logged to DB
    return { statusCode: 200, body: JSON.stringify({ message: "Transaction updated successfully" }) };
  } catch (err) {
    console.error('Error in AA_edit_trans:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
