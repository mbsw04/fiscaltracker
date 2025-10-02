import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
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

  const { username, password } = body;

  if (!username || !password) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing username or password" }),
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

    // Fetch user
    const [rows] = await connection.execute(
      "SELECT * FROM Users WHERE username = ?",
      [username]
    );

    if (rows.length === 0) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid username or password" }),
      };
    }

    const user = rows[0];

    // 1. Check if user is active
    if (!user.is_active) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: "Account is deactivated" }),
      };
    }

    // 2. Check suspension + auto-clear if expired
    const now = new Date();
    if (user.is_suspended) {
      const from = user.suspended_from ? new Date(user.suspended_from) : null;
      const to = user.suspended_to ? new Date(user.suspended_to) : null;

      if (to && now > to) {
        // Suspension expired → auto-clear
        await connection.execute(
          `UPDATE Users
           SET is_suspended = 0,
               suspended_from = NULL,
               suspended_to = NULL
           WHERE id = ?`,
          [user.id]
        );
      } else if (
        (from && now >= from) &&
        (to && now <= to)
      ) {
        // Still suspended
        return {
          statusCode: 403,
          body: JSON.stringify({
            error: `Account is suspended until ${to.toISOString()}`
          }),
        };
      }
    }

    // 3. Check account lock
    if (user.locked_until) {
      const lockedUntil = new Date(user.locked_until);
      if (lockedUntil > now) {
        return {
          statusCode: 403,
          body: JSON.stringify({
            error: `Account locked until ${lockedUntil.toISOString()}`
          }),
        };
      }
    }

    // 4. Validate password
    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      const attempts = (user.failed_login_attempts || 0) + 1;
      let lockTime = null;

      if (attempts >= 3) {
        lockTime = new Date(Date.now() + 5 * 60 * 1000); // 5 mins
      }

      await connection.execute(
        `UPDATE Users SET failed_login_attempts = ?, locked_until = ?
         WHERE id = ?`,
        [attempts, lockTime, user.id]
      );

      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid username or password" }),
      };
    }

    // Successful login
    await connection.execute(
      `UPDATE Users
       SET failed_login_attempts = 0,
           locked_until = NULL,
           last_login = NOW()
       WHERE id = ?`,
      [user.id]
    );

    delete user.password_hash;
    delete user.security_answer;

    return {
      statusCode: 200,
      body: JSON.stringify(user),
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
