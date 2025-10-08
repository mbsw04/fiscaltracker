import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, trans_id, credit, debit, reference, description } = body;

  try {
    const conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [before] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    await conn.execute(
      `UPDATE Transactions SET credit=?, debit=?, reference=?, description=? WHERE id=?`,
      [credit, debit, reference, description, trans_id]
    );
    const [after] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES ('Transactions', ?, 'UPDATE TRANSACTION', ?, ?, ?)`,
      [trans_id, JSON.stringify(before[0]), JSON.stringify(after[0]), user_id]
    );

    await conn.end();
    return { statusCode: 200, body: JSON.stringify({ message: "Transaction updated successfully" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
