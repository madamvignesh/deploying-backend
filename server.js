const express = require('express');
const { open } = require('sqlite');
const cors = require('cors')
const sqlite3 = require('sqlite3');
const path = require('path');

const app = express();
app.use(cors()); 
app.use(express.json());

const dbPath = path.join(__dirname, 'transactionManagement.db');
let db = null;

// Initialize DB and Server
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(8081, () => {
      console.log(`Server Running at http://localhost:8081/`);
    });
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

app.get('/api/transactions/', async (req, res) => {
  const { user_id } = req.query; // Get query parameter
  let query;
  let params = [];

  if (user_id) {
    query = `
      SELECT transaction_id, user_id, amount, transaction_type, time AS timestamp, status
      FROM transactions
      WHERE user_id = ?
    `;
    params = [user_id];
  } else {
    query = `
      SELECT transaction_id, user_id, amount, transaction_type, time AS timestamp, status
      FROM transactions
    `;
  }
  try {
    const transactions = await db.all(query, params);
    res.json(transactions); 
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transactions', message: error.message });
  }
});

// To get specific transaction 
app.get('/api/transactions/:transactionID', async (req, res) => {
  const { transactionID } = req.params;
  const query = `
    SELECT transaction_id, user_id, amount, transaction_type, time AS timestamp, status
    FROM transactions
    WHERE transaction_id = ?`;
  try {
    const transaction = await db.get(query, [transactionID]);
    if (transaction) {
      res.json(transaction);
    } else {
      res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch transaction', message: error.message });
  }
});

// To Create Transaction 
app.post('/api/transactions', async (req, res) => {
  const { transaction_id, user_id, amount, transaction_type, timestamp, status } = req.body;
  const query = `
    INSERT INTO transactions (transaction_id, user_id, amount, transaction_type, time, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  try {
    await db.run(query, [transaction_id, user_id, amount, transaction_type, timestamp, status]);
    res.status(201).json({ message: 'Transaction created successfully' });
  } catch (error) {
    console.error('POST Error:', error.message);
    res.status(500).json({ error: 'Failed to create transaction', details: error.message });
  }
});

// API to update a transaction's status
app.put('/api/transactions/:transactionID', async (req, res) => {
  const { transactionID } = req.params;
  const { status } = req.body;
  const query = `
    UPDATE transactions
    SET status = ?
    WHERE transaction_id = ?`;
  try {
    const result = await db.run(query, [status, transactionID]);
    if (result.changes > 0) {
      res.json({ message: 'Transaction status updated successfully', status });
    } else {
      res.status(404).json({ message: 'Transaction not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update transaction status', message: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json('Server is connecting...');
});

module.exports = app;
