const mysql = require("mysql2/promise");
const nodemailer = require("nodemailer");

const {
  RDS_HOST,
  RDS_USER,
  RDS_PASSWORD,
  RDS_DB,
  GMAIL_USER,
  GMAIL_PASS
} = process.env;

exports.handler = async (event) => {
  const { first_name, last_name, email, dob } = event;

  if (!first_name || !last_name || !email || !dob) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing required fields" }),
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

    // insert the new request
    const sql = `
      INSERT INTO User_Requests 
        (first_name, last_name, email, dob)
      VALUES (?, ?, ?, ?)
    `;
    await connection.execute(sql, [
      first_name,
      last_name,
      email,
      dob,
    ]);

    // Send email using Gmail
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: GMAIL_USER,
      to: email,
      subject: "Your User Request Has Been Received",
      text: `Hello ${first_name},

      Your registration request has been submitted successfully.
      We will review it and get back to you soon!

      Thanks,
      Support Team at Fiscal Tracker
      `,
    };

    await transporter.sendMail(mailOptions);

    return {
      statusCode: 201,
      body: JSON.stringify({
        message: "User request submitted successfully and email sent",
      }),
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
