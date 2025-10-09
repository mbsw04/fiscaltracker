import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  let conn;

  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });
    
    
    
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
