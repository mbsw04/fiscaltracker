import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  try {
    const conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [rows] = await conn.execute(`
      SELECT t.*, ca.account_name AS credit_account, da.account_name AS debit_account 
      FROM Transactions t
      JOIN Accounts ca ON t.credit_account_id = ca.id
      JOIN Accounts da ON t.debit_account_id = da.id
      ORDER BY t.created_at DESC
    `);
    await conn.end();
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
