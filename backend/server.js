const express = require('express');
const dotenv = require('dotenv');
const { MongoClient, ObjectId } = require('mongodb');
const cors = require('cors');

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// 🔴 IMPORTANT: No localhost fallback
const url = process.env.MONGO_URI;
const client = new MongoClient(url);

// DB name
const dbName = process.env.DB_NAME || 'passop';

// Middleware
app.use(express.json());
app.use(cors()); // keep open for now

async function start() {
  try {
    await client.connect();
    console.log('MongoDB connected');

    // GET all passwords
    app.get('/', async (req, res) => {
      try {
        const db = client.db(dbName);
        const collection = db.collection('documents');
        const results = await collection.find({}).toArray();
        res.json(results);
      } catch (err) {
        console.error('GET error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // POST new password
    app.post('/', async (req, res) => {
      try {
        const db = client.db(dbName);
        const collection = db.collection('documents');
        const data = req.body;

        if (!data.site || !data.username || !data.password) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        const insertResult = await collection.insertOne({
          ...data,
          createdAt: new Date()
        });

        res.status(201).json({
          success: true,
          insertedId: insertResult.insertedId
        });
      } catch (err) {
        console.error('POST error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // DELETE password
    app.delete('/:id', async (req, res) => {
      try {
        const id = req.params.id;

        if (!ObjectId.isValid(id)) {
          return res.status(400).json({ error: 'Invalid id' });
        }

        const db = client.db(dbName);
        const collection = db.collection('documents');
        const result = await collection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 1) {
          return res.json({ success: true });
        } else {
          return res.status(404).json({ error: 'Not found' });
        }
      } catch (err) {
        console.error('DELETE error:', err);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    // Start server
    app.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });

  } catch (err) {
    console.error('Startup error:', err);
    process.exit(1);
  }
}

start();