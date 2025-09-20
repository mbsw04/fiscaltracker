const mysql = require("mysql2/promise");

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

exports.handler = async (event) => {
  const { username, password_hash } = event;

  if (!username || !password_hash) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing username or password_hash" }),
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

    // query for the user
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

    // check password hash
    if (user.password_hash !== password_hash) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: "Invalid username or password" }),
      };
    }

    // remove password before returning
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