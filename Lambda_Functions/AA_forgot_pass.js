const mysql = require("mysql2/promise");

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB
} = process.env;

exports.handler = async (event) => {
  const { type, email, new_passwordHash, security_question, security_answer } = event;

  if (!type || !email || !new_passwordHash || !security_question || !security_answer) {
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

    // find the user by email
    const [userRows] = await connection.execute(
      "SELECT id, password_hash FROM Users WHERE email = ?",
      [email]
    );

    if (userRows.length === 0) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: "User not found" }),
      };
    }

    const user = userRows[0];
    const userId = user.id;
    const oldPasswordHash = user.password_hash;

    // 1) FORGOT PASSWORD (type == 1)
    if (type == 1) {
      // Cannot reuse the current password
      if (oldPasswordHash === new_passwordHash) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: "New password cannot be the same as the old password" }),
        };
      }

      // Insert into Password_History
      await connection.execute(
        `INSERT INTO Password_History (user_id, current_password, previous_password)
         VALUES (?, ?, ?)`,
        [userId, new_passwordHash, oldPasswordHash]
      );

      // Update Users with new password
      await connection.execute(
        `UPDATE Users
         SET password_hash = ?
         WHERE id = ?`,
        [new_passwordHash, userId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "Password updated successfully (forgot password)" }),
      };
    }

    // 2) FIRST-TIME LOGIN SETUP (type == 2)
    if (type == 2) {
      // Insert into Password_History
      await connection.execute(
        `INSERT INTO Password_History (user_id, current_password, previous_password)
         VALUES (?, ?, ?)`,
        [userId, new_passwordHash, oldPasswordHash]
      );

      // Update Users table with new password + security Q & A
      await connection.execute(
        `UPDATE Users SET password_hash = ?, security_question = ?, security_answer = ?WHERE id = ?`,
        [new_passwordHash, security_question, security_answer, userId]
      );

      return {
        statusCode: 200,
        body: JSON.stringify({ message: "First-time login setup complete" }),
      };
    }

    // If type is neither 1 nor 2
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Invalid type" }),
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
