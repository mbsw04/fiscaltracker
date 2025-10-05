import mysql from "mysql2/promise";

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB
} = process.env;

export const handler = async (event) => {
  // Parse body
  let body = event;
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Invalid JSON body" }),
      };
    }
  }

  const { admin_id, user_id, first_name, last_name, email, role } = body;

  // Validate required fields
  if (!admin_id || !user_id || !first_name || !last_name || !email || !role) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
    };
  }

  const validRoles = ["administrator", "manager", "accountant"];
  if (!validRoles.includes(role)) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid role" }),
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

    // Validate admin_id
    const [adminCheck] = await connection.execute(
      "SELECT role FROM Users WHERE id = ?",
      [admin_id]
    );

    if (adminCheck.length === 0) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Invalid admin_id" }),
      };
    }

    if (adminCheck[0].role !== "administrator") {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Only administrators can edit users" }),
      };
    }

    // Check if user exists
    const [userCheck] = await connection.execute(
      "SELECT id FROM Users WHERE id = ?",
      [user_id]
    );

    if (userCheck.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    // Update user info
    await connection.execute(
      `UPDATE Users
       SET first_name = ?, last_name = ?, email = ?, role = ?
       WHERE id = ?`,
      [first_name, last_name, email, role, user_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User info updated successfully" }),
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
