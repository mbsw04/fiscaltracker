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

    //Updated query to match email instead of username 09/30
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

    const validPassword = await bcrypt.compare(password, user.password_hash);
    if (!validPassword) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid username or password" }),
      };
    }

    delete user.password_hash;

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