import { MongoClient, Db, Collection } from 'mongodb';

const dbUrl = process.env.MONGODB_URL;

export const collections: { metadata?: Collection } = {};
const defaultDbName = 'mydb';

export const connectDb = async (dbName: string = defaultDbName) => {
  const client = new MongoClient(dbUrl || 'mongodb://127.0.0.1:27017/');
  await client.connect();
  const db: Db = client.db(dbName);
  const metadataCollection: Collection = db.collection('metadata');
  collections.metadata = metadataCollection;
  console.log(`DB connection succeed`);
};
