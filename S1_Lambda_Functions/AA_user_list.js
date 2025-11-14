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

    // 1. Check if user exists and has correct role (allow administrator, manager, or accountant)
    const [userRows] = await connection.execute(
      "SELECT id, role FROM Users WHERE id = ? AND role IN ('administrator', 'manager', 'accountant')",
      [admin_id]
    );

    if (userRows.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Not authorized or user not found" }),
      };
    }

    // 2. Get all users but exclude sensitive fields
    const [users] = await connection.execute(
      `SELECT 
        id, username, first_name, last_name, email, dob, role, avatar_url, 
        is_active, is_suspended, suspended_from, suspended_to, created_at, 
        last_login, password_expires_at, failed_login_attempts, locked_until, 
        security_question
      FROM Users`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ users }),
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
