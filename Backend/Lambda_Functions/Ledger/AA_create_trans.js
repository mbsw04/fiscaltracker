import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB, S3_BUCKET_NAME } = process.env;
const s3Client = new S3Client({ region: 'us-east-1' });

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, credit_account_id, credit, debit_account_id, debit, description, comment, type, files } = body;

  // Validate transaction type
  const validTypes = ['standard', 'reversal', 'adjustment', 'closing'];
  const transactionType = type || 'standard'; // Default to 'standard' if not provided
  if (!validTypes.includes(transactionType)) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ 
        error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` 
      }) 
    };
  }

  // Validate and convert arrays to comma-separated strings with 2 decimal places
  const creditAccountStr = Array.isArray(credit_account_id) ? credit_account_id.join(',') : String(credit_account_id || '');
  
  // Handle credit amounts - can be array or comma-separated string
  let creditArray = [];
  if (Array.isArray(credit)) {
    creditArray = credit.filter(amt => amt && parseFloat(amt) > 0).map(amt => parseFloat(amt));
  } else if (credit && typeof credit === 'string' && credit.includes(',')) {
    creditArray = credit.split(',').map(amt => parseFloat(amt.trim())).filter(amt => !isNaN(amt) && amt > 0);
  } else if (credit && parseFloat(credit) > 0) {
    creditArray = [parseFloat(credit)];
  }
  const creditStr = creditArray.map(amt => amt.toFixed(2)).join(',');
  
  const debitAccountStr = Array.isArray(debit_account_id) ? debit_account_id.join(',') : String(debit_account_id || '');
  
  // Handle debit amounts - can be array or comma-separated string
  let debitArray = [];
  if (Array.isArray(debit)) {
    debitArray = debit.filter(amt => amt && parseFloat(amt) > 0).map(amt => parseFloat(amt));
  } else if (debit && typeof debit === 'string' && debit.includes(',')) {
    debitArray = debit.split(',').map(amt => parseFloat(amt.trim())).filter(amt => !isNaN(amt) && amt > 0);
  } else if (debit && parseFloat(debit) > 0) {
    debitArray = [parseFloat(debit)];
  }
  const debitStr = debitArray.map(amt => amt.toFixed(2)).join(',');

  // Basic validation
  if (!creditAccountStr && !debitAccountStr) {
    return { statusCode: 400, body: JSON.stringify({ error: 'At least one account must be specified' }) };
  }
  if (!creditStr && !debitStr) {
    return { statusCode: 400, body: JSON.stringify({ error: 'At least one amount must be specified' }) };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    const [userRows] = await conn.execute(`SELECT id, role FROM Users WHERE id = ?`, [user_id]);
    const user = userRows && userRows[0] ? userRows[0] : null;
    if (!user) {
      return { statusCode: 404, body: JSON.stringify({ error: 'User not found' }) };
    }

    // Validate account IDs exist
    const allAccountIds = [...(Array.isArray(credit_account_id) ? credit_account_id : [credit_account_id]), 
                          ...(Array.isArray(debit_account_id) ? debit_account_id : [debit_account_id])]
                          .filter(id => id).map(id => parseInt(id));
    
    if (allAccountIds.length > 0) {
      const [accountCheck] = await conn.execute(
        `SELECT id FROM Accounts WHERE id IN (${allAccountIds.map(() => '?').join(',')}) AND is_active = 1`,
        allAccountIds
      );
      if (accountCheck.length !== allAccountIds.length) {
        return { statusCode: 400, body: JSON.stringify({ error: 'One or more account IDs are invalid or inactive' }) };
      }
    }

    // Validate transaction balance
    const totalCredit = creditArray.reduce((sum, amt) => sum + amt, 0);
    const totalDebit = debitArray.reduce((sum, amt) => sum + amt, 0);
    const EPS = 0.005; // Small epsilon for floating point comparison
    
    if (Math.abs(totalCredit - totalDebit) > EPS) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: `Transaction not balanced: Credit ${totalCredit.toFixed(2)} ≠ Debit ${totalDebit.toFixed(2)}` 
        }) 
      };
    }

    const [result] = await conn.execute(
      `INSERT INTO Transactions (credit_account_id, debit_account_id, credit, debit, type, description, comment, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [creditAccountStr, debitAccountStr, creditStr, debitStr, transactionType, description, comment || null, user_id]
    );

    // fetch created transaction and write full JSON to event log
    const [createdRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [result.insertId]);
    const createdRow = createdRows && createdRows[0] ? createdRows[0] : null;
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
       VALUES (?, ?, ?, ?, ?)`,
      ['Transactions', result.insertId, 'CREATE TRANSACTION', JSON.stringify(createdRow || {}), user_id]
    );

    // Handle file upload if files are provided
    let fileUploadResult = null;
    if (files && files.zip_content) {
      try {
        // Use transaction ID as filename with .zip extension
        const s3Key = `transactions/${result.insertId}.zip`;
        
        // Decode base64 zip content
        const fileBuffer = Buffer.from(files.zip_content, 'base64');
        
        // Upload to S3
        const uploadParams = {
          Bucket: S3_BUCKET_NAME,
          Key: s3Key,
          Body: fileBuffer,
          ContentType: 'application/zip',
          Metadata: {
            'transaction-id': String(result.insertId),
            'uploaded-by': String(user_id),
            'file-count': String(files.file_count || 0)
          }
        };

        const uploadResult = await s3Client.send(new PutObjectCommand(uploadParams));
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.us-east-1.amazonaws.com/${s3Key}`;

        // Log the file upload event
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'Transactions',
            result.insertId,
            'UPLOAD FILES',
            JSON.stringify({
              s3_key: s3Key,
              file_count: files.file_count || 0,
              file_size: fileBuffer.length,
              etag: uploadResult.ETag,
              public_url: publicUrl
            }),
            user_id
          ]
        );

        fileUploadResult = {
          s3_key: s3Key,
          public_url: publicUrl,
          file_count: files.file_count || 0,
          file_size: fileBuffer.length
        };
      } catch (fileErr) {
        console.error('Error uploading files:', fileErr);
        // Don't fail the transaction creation if file upload fails
        fileUploadResult = { error: fileErr.message };
      }
    }

    // created - event logged to DB
    return { 
      statusCode: 201, 
      body: JSON.stringify({ 
        message: "Transaction created successfully",
        transaction_id: result.insertId,
        files: fileUploadResult
      }) 
    };
  } catch (err) {
    console.error('Error in AA_create_trans:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
