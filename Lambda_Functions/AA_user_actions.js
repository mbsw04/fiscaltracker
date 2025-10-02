import mysql from "mysql2/promise";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }

  const { user_id, action, suspended_from, suspended_to } = body;

  if (!user_id || !action) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing user_id or action" }),
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

    // Check if user exists
    const [users] = await connection.execute(
      "SELECT id FROM Users WHERE id = ?",
      [user_id]
    );

    if (users.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    // ACTION: ACTIVATE
    if (action === "activate") {
      await connection.execute(
        `UPDATE Users
         SET is_active = 1,
             is_suspended = 0,
             suspended_from = NULL,
             suspended_to = NULL,
             locked_until = NULL,
             failed_login_attempts = 0
         WHERE id = ?`,
        [user_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User activated" }),
      };
    }

    // ACTION: DEACTIVATE
    if (action === "deactivate") {
      await connection.execute(
        `UPDATE Users
         SET is_active = 0
         WHERE id = ?`,
        [user_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User deactivated" }),
      };
    }

    // ACTION: SUSPEND
    if (action === "suspend") {
      if (!suspended_from || !suspended_to) {
        return {
          statusCode: 400,
          body: JSON.stringify({
            error: "Missing suspended_from or suspended_to for suspension",
          }),
        };
      }

      await connection.execute(
        `UPDATE Users
         SET is_suspended = 1,
             suspended_from = ?,
             suspended_to = ?
         WHERE id = ?`,
        [suspended_from, suspended_to, user_id]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "User suspended" }),
      };
    }

    // INVALID ACTION
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid action" }),
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  } finally {
    if (connection) await connection.end();
  }
};