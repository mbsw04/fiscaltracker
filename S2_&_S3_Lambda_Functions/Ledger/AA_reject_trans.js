import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { manager_id, trans_id, rejection_reason } = body;

  // Validate required fields
  if (!manager_id || !trans_id) {
    return { statusCode: 400, body: JSON.stringify({ error: "manager_id and trans_id are required" }) };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // Capture before image (check existence and status before starting transactional work)
    const [beforeRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const beforeRow = beforeRows && beforeRows[0] ? beforeRows[0] : null;
    if (!beforeRow) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }
    if (String(beforeRow.status).toLowerCase() !== 'pending') {
      return { statusCode: 409, body: JSON.stringify({ error: `Transaction already ${beforeRow.status}` }) };
    }

    // Begin transaction to ensure atomicity
    await conn.beginTransaction();

    // Perform rejection
    await conn.execute(`
      UPDATE Transactions 
      SET status = 'rejected', approved_by = ?, approved_date = NOW() 
      WHERE id = ?
    `, [manager_id, trans_id]);

    // Fetch updated transaction
    const [updatedRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const updatedRow = updatedRows && updatedRows[0] ? updatedRows[0] : null;

    // Log the transaction rejection with before and after images
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        'Transactions', 
        trans_id, 
        `REJECT TRANSACTION${rejection_reason ? ` - ${rejection_reason}` : ''}`, 
        JSON.stringify(beforeRow || {}), 
        JSON.stringify(updatedRow || {}), 
        manager_id
      ]
    );

    // Commit all changes
    await conn.commit();

    return { 
      statusCode: 200, 
      body: JSON.stringify({ 
        message: "Transaction rejected successfully",
        transaction_id: trans_id,
        rejection_reason: rejection_reason || "No reason provided"
      }) 
    };
  } catch (err) {
    console.error('Error in AA_reject_trans:', err);
    if (conn) {
      try { await conn.rollback(); } catch (rbErr) { console.warn('Rollback error', rbErr); }
    }
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: err.message, 
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      }) 
    };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};