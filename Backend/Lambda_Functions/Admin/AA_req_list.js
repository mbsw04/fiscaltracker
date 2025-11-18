import mysql from "mysql2/promise";

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB
} = process.env;

export const handler = async (event) => {
  let body = event;
  if (typeof event.body === "string") {
    try {
      body = JSON.parse(event.body);
    } catch {
      body = {};
    }
  }

  const { admin_id } = body;

  if (!admin_id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  let connection;

  try {
    connection = await mysql.createConnection({
      host: RDS_HOST,
      user: RDS_USER,
      password: RDS_PASSWORD,
      database: RDS_DB,
    });

    // 1. Check if admin exists and is authorized
    const [adminRows] = await connection.execute(
      "SELECT id, role FROM Users WHERE id = ? AND role = 'administrator'",
      [admin_id]
    );

    if (adminRows.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Not authorized or admin not found" }),
      };
    }

    // 2. Get all user requests
    const [requests] = await connection.execute(
      `SELECT 
        id, first_name, last_name, email, dob, status, 
        requested_at, resolved_by, resolved_at 
       FROM User_Requests`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ requests }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  } finally {
    if (connection) {
      await connection.end();
    }
  }
};
