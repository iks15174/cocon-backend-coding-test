import express, { json } from 'express';
import { MetadataController } from './controller';
import { connect } from './service';
const app = express();
app.use(json());
connect()
  .then(() => {
    app.post('/metadata', MetadataController.getMetadata);

    app.get('/metadatas', MetadataController.getMetadatas);
    app.listen('3000', () => {
      console.log('Sever is working on port 3000');
    });
  })
  .catch((error: Error) => {
    console.error('Database connection failed', error);
    process.exit();
  });
