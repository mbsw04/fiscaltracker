import mysql from "mysql2/promise";
const { RDS_HOST, RDS_USER, RDS_PASSWORD, RDS_DB } = process.env;

export const handler = async (event) => {
  let body = event;
  if (event.body) {
    try { body = JSON.parse(event.body); } 
    catch { return { statusCode: 400, body: JSON.stringify({ error: "Invalid JSON body" }) }; }
  }

  const { user_id, trans_id, credit, debit, credit_account_id, debit_account_id, description, comment, type } = body;

  // Validate transaction type if provided
  if (type !== undefined) {
    const validTypes = ['standard', 'reversal', 'adjustment', 'closing'];
    if (!validTypes.includes(type)) {
      return { 
        statusCode: 400, 
        body: JSON.stringify({ 
          error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` 
        }) 
      };
    }
  }

  // Validate and convert arrays to comma-separated strings with 2 decimal places
  // Handle credit account IDs
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
  
  // Handle debit account IDs
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

    const [beforeRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const before = beforeRows && beforeRows[0] ? beforeRows[0] : null;
    
    if (!before) {
      return { statusCode: 404, body: JSON.stringify({ error: 'Transaction not found' }) };
    }

    // Validate account IDs exist if provided
    const allAccountIds = [...(Array.isArray(credit_account_id) ? credit_account_id : credit_account_id ? [credit_account_id] : []), 
                          ...(Array.isArray(debit_account_id) ? debit_account_id : debit_account_id ? [debit_account_id] : [])]
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
    
    await conn.execute(
      `UPDATE Transactions SET credit_account_id=?, debit_account_id=?, credit=?, debit=?, type=?, description=?, comment=? WHERE id=?`,
      [creditAccountStr, debitAccountStr, creditStr, debitStr, type || 'standard', description, comment || null, trans_id]
    );
    const [afterRows] = await conn.execute(`SELECT * FROM Transactions WHERE id = ?`, [trans_id]);
    const after = afterRows && afterRows[0] ? afterRows[0] : null;
    await conn.execute(
      `INSERT INTO Event_Logs (table_name, record_id, action, before_image, after_image, changed_by)
       VALUES ('Transactions', ?, 'UPDATE TRANSACTION', ?, ?, ?)`,
      [trans_id, JSON.stringify(before || {}), JSON.stringify(after || {}), user_id]
    );

  // completed - event logged to DB
    return { statusCode: 200, body: JSON.stringify({ message: "Transaction updated successfully" }) };
  } catch (err) {
    console.error('Error in AA_edit_trans:', err);
    return { statusCode: 500, body: JSON.stringify({ error: err.message, stack: err.stack }) };
  } finally {
    if (conn) try { await conn.end(); } catch (e) { console.warn('Error closing connection', e); }
  }
};
