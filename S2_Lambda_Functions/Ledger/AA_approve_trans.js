import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { manager_id, trans_id } = body;

  try {
    const conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    await conn.execute(`UPDATE Transactions SET approved_by=?, approved_date=NOW() WHERE id=?`, [manager_id, trans_id]);
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES ('Transactions', ?, 'APPROVE TRANSACTION', JSON_OBJECT('approved_by', ?), ?)`,
      [trans_id, manager_id, manager_id]
    );
    await conn.end();
    return { statusCode: 200, body: JSON.stringify({ message: "Transaction approved" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
