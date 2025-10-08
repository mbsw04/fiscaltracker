import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { admin_id, account_number, account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment } = body;

  try {
    const conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    const [before] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);

    await conn.execute(
      `UPDATE Accounts SET account_name=?, description=?, normal_side=?, category=?, subcategory=?, initial_balance=?, \`order\`=?, statement=?, comment=? WHERE account_number=?`,
      [account_name, description, normal_side, category, subcategory, initial_balance, order, statement, comment, account_number]
    );

    const [after] = await conn.execute(`SELECT * FROM Accounts WHERE account_number = ?`, [account_number]);
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES ('Accounts', ?, 'UPDATE ACCOUNT', ?, ?, ?)`,
      [before[0].id, JSON.stringify(before[0]), JSON.stringify(after[0]), admin_id]
    );

    await conn.end();
    return { statusCode: 200, body: JSON.stringify({ message: "Account updated successfully" }) };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
