const mysql = require("mysql2/promise");

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

exports.handler = async (event) => {
  const {
    username,
    first_name,
    last_name,
    email,
    dob,
    password_hash,
    security_question,
    security_answer,
  } = event;

  if (
    !username ||
    !first_name ||
    !last_name ||
    !email ||
    !dob ||
    !password_hash ||
    !security_question ||
    !security_answer
  ) {
    return {
      statusCode: 400,
      body: { error: "Missing required fields" },
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

    // add request to db
    const sql = `
      INSERT INTO User_Requests 
        (username, first_name, last_name, email, dob, password_hash, security_question, security_answer) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const [result] = await connection.execute(sql, [
      username,
      first_name,
      last_name,
      email,
      dob,
      password_hash,
      security_question,
      security_answer,
    ]);

    // return confirmation
    return {
      statusCode: 201,
      body: {
        message: "User request submitted successfully",
        status: "pending",
      },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: { error: err.message },
    };
  } finally {
    if (connection) await connection.end();
  }
};
