import express, { json } from 'express';
import { getMetadata, getMetadatas } from './controller';
import { connectDb, cache_connect, getCache } from './util';

const app = express();
app.use(json());
const connect = async () => {
  try {
    await connectDb();
    await cache_connect();
  } catch (error) {
    console.error('connection failed', error);
    process.exit();
  }
};
const start = async () => {
  await connect();
  app.post('/metadata', getCache, getMetadata);
  app.get('/metadatas', getMetadatas);
  app.listen('3000', () => {
    console.log('Sever is working on port 3000');
  });
};

start();
