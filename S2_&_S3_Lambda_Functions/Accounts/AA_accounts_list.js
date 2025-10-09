import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  // Expect user_id in the request to determine role-based access
  const { user_id } = body || {};
  if (!user_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id in request body' }) };
  }


  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // lookup user role
    const [userRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    let rows;
    if (String(user.role).toLowerCase() === 'administrator') {
      // admin sees all accounts
      const [allRows] = await conn.execute(`SELECT * FROM Accounts ORDER BY \`order\``);
      rows = allRows;
    } else {
      // managers/accountants see only active accounts
      const [activeRows] = await conn.execute(`SELECT * FROM Accounts WHERE is_active = TRUE ORDER BY \`order\``);
      rows = activeRows;
    }

    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    console.error('Error in AA_accounts_list:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
}
