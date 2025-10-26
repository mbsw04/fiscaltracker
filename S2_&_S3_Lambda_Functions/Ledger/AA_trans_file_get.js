import { S3Client, HeadObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import mysql from "mysql2/promise";

const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB, S3_BUCKET_NAME, AWS_REGION } = process.env;

const s3Client = new S3Client({ region: AWS_REGION || 'us-east-1' });

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { transaction_id, s3_key, requested_by, list_files_only } = body;

  // Validate required fields
  if (!transaction_id || !requested_by) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ 
        error: "transaction_id and requested_by are required" 
      }) 
    };
  }

  let conn;
  try {
    conn = await mysql.createConnection({ host: RDS_HOST, user: RDS_USER, password: RDS_PASSWORD, database: RDS_DB });

    // Verify transaction exists
    const [transRows] = await conn.execute(`SELECT id FROM Transactions WHERE id = ?`, [transaction_id]);
    if (!transRows || transRows.length === 0) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    if (list_files_only) {
      // List files for this transaction (now using transaction ID as filename)
      const listParams = {
        Bucket: S3_BUCKET_NAME,
        Prefix: `transactions/${transaction_id}`
      };

      const listResult = await s3Client.send(new ListObjectsV2Command(listParams));
      
      const files = (listResult.Contents || []).map(obj => ({
        s3_key: obj.Key,
        file_name: obj.Key ? obj.Key.replace('transactions/', '') : 'unknown',
        size: obj.Size,
        last_modified: obj.LastModified
      }));

      // Log the file list access
      await conn.execute(
        `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
         VALUES (?, ?, ?, ?, ?)`,
        [
          'Transactions',
          transaction_id,
          'LIST FILES',
          JSON.stringify({ file_count: files.length, files: files.map(f => f.s3_key) }),
          requested_by
        ]
      );

      return { 
        statusCode: 200, 
        body: JSON.stringify({ 
          transaction_id: transaction_id,
          files: files
        }) 
      };
    } else if (s3_key) {
      // Get specific file - return presigned URL for download
      const getParams = {
        Bucket: S3_BUCKET_NAME,
        Key: s3_key
      };

      // Verify the file belongs to this transaction (transaction ID as filename)
      const expectedKey = `transactions/${transaction_id}`;
      if (!s3_key.startsWith(expectedKey)) {
        return { 
          statusCode: 403, 
          body: JSON.stringify({ error: 'File does not belong to specified transaction' }) 
        };
      }

      try {
        // Check if file exists using HeadObject
        await s3Client.send(new HeadObjectCommand(getParams));
        
        // Generate public URL for the file
        const publicUrl = `https://${S3_BUCKET_NAME}.s3.${AWS_REGION || 'us-east-1'}.amazonaws.com/${s3_key}`;

        // Log the file access
        await conn.execute(
          `INSERT INTO Event_Logs (table_name, record_id, action, after_image, changed_by)
           VALUES (?, ?, ?, ?, ?)`,
          [
            'Transactions',
            transaction_id,
            'ACCESS FILE',
            JSON.stringify({ s3_key: s3_key, access_type: 'public_url' }),
            requested_by
          ]
        );

        return { 
          statusCode: 200, 
          body: JSON.stringify({ 
            public_url: publicUrl,
            s3_key: s3_key,
            transaction_id: transaction_id
          }) 
        };
      } catch (s3Error) {
        if (s3Error.name === 'NoSuchKey') {
          return { statusCode: 404, body: JSON.stringify({ error: 'File not found' }) };
        }
        throw s3Error;
      }
    } else {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: "Either s3_key (for specific file) or list_files_only=true (for file list) must be provided" 
        }) 
      };
    }
  } catch (err) {
    console.error('Error in AA_trans_file_get:', err);
    return { 
      statusCode: 500, 
      body: JSON.stringify({ 
        error: err.message, 
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined 
      }) 
    };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};