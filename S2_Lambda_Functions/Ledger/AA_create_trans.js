import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, credit_account_id, credit, debit_account_id, debit, reference, description } = body;

  try {
    const conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [result] = await conn.execute(
      `INSERT INTO Transactions (credit_account_id, debit_account_id, credit, debit, reference, description, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [credit_account_id, debit_account_id, credit, debit, reference, description, user_id]
    );

    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES ('Transactions', ?, 'CREATE TRANSACTION', JSON_OBJECT('reference', ?, 'credit', ?, 'debit', ?), ?)`,
      [result.insertId, reference, credit, debit, user_id]
    );

    await conn.end();
    return { statusCode: 201, body: JSON.stringify({ message: "Transaction created successfully" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
