import express from 'express';
import dotenv from 'dotenv';
import { S3Client, ListObjectsV2Command, DeleteObjectCommand } from '@aws-sdk/client-s3';

dotenv.config();

const app = express();
app.use(express.json());

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId:     process.env.R2_ACCESS_KEY,
    secretAccessKey: process.env.R2_SECRET_KEY
  }
});

// Cleanup endpoint
app.post('/cleanup', async (req, res) => {
  const buckets = req.body.buckets || ['podcast-temp-batches', 'podcast-raw-merged'];
  const results = {};

  for (const bucket of buckets) {
    try {
      const list = await s3.send(new ListObjectsV2Command({ Bucket: bucket }));
      const files = list.Contents || [];

      for (const obj of files) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }));
      }

      results[bucket] = { deleted: files.length };
    } catch (err) {
      results[bucket] = { error: err.message };
    }
  }

  res.json(results);
});

// Health check
app.get('/status', (_, res) => res.send('Cleanup service active 🧽'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Cleanup service running on port ${PORT}`));
