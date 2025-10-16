import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id } = body || {};
  if (!user_id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing user_id in request body' }) };
  }

  let conn;

  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    
    
    
    // verify user exists
    const [userRows] = await conn.execute(`SELECT id FROM Users WHERE id = ?`, [user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    const [rows] = await conn.execute(`
      SELECT e.*, u.username 
      FROM Event_Logs e
      JOIN Users u ON e.changed_by = u.id
      ORDER BY e.changed_at DESC
    `);
  // completed - returning event rows
    return { statusCode: 200, body: JSON.stringify(rows) };
  } catch (err) {
    console.error('Error in AA_event_log_list:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
