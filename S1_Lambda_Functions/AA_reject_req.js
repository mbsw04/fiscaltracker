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

  const { admin_id, request_id } = body;

  if (!admin_id || !request_id) {
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

    // Check if request exists
    const [rows] = await connection.execute(
      "SELECT * FROM User_Requests WHERE id = ?",
      [request_id]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "Request not found" }),
      };
    }

    // Update request status to rejected
    await connection.execute(
      "UPDATE User_Requests SET status = 'rejected', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
      [admin_id, request_id]
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "User request rejected" }),
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
