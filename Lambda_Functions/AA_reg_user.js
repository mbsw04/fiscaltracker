const mysql = require("mysql2/promise");

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

exports.handler = async (event) => {
  const { request_id, role } = event;

  if (!request_id || !role) {
    return {
      statusCode: 400,
      body: { error: "Missing required fields" },
    };
  }

  const validRoles = ["administrator", "manager", "accountant"];
  if (!validRoles.includes(role)) {
    return {
      statusCode: 400,
      body: { error: "Invalid role" },
    };
  }

  let connection;

  try {
    // connect to RDS
    connection = await mysql.createConnection({
      host: RDS_HOST,
      user: RDS_USER,
      password: RDS_PASSWORD,
      database: RDS_DB,
    });

    // query the request
    const [rows] = await connection.execute(
      "SELECT * FROM User_Requests WHERE id = ?",
      [request_id]
    );

    if (rows.length === 0) {
      return {
        statusCode: 404,
        body: { error: "Request not found" },
      };
    }

    const request = rows[0];

    // check for duplicate username/email in Users table
    const [existing] = await connection.execute(
      "SELECT id FROM Users WHERE username = ? OR email = ?",
      [request.username, request.email]
    );

    if (existing.length > 0) {
      return {
        statusCode: 409,
        body: { error: "Username or email already exists" },
      };
    }

    // insert into Users table with specified role
    const insertSql = `
      INSERT INTO Users 
        (username, first_name, last_name, email, dob, role, password_hash, security_question, security_answer)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(insertSql, [
      request.username,
      request.first_name,
      request.last_name,
      request.email,
      request.dob,
      role, // use role from input
      request.password_hash,
      request.security_question,
      request.security_answer,
    ]);

    // update the User_Requests status to 'approved'
    await connection.execute(
      "UPDATE User_Requests SET status = 'approved', resolved_by = ?, resolved_at = NOW() WHERE id = ?",
      [result.insertId, request_id]
    );

    // return confirmation
    return {
      statusCode: 201,
      body: {
        message: "User registered successfully",
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: "Internal server error" },
    };
  } finally {
    if (connection) await connection.end();
  }
};