import express, { Request, Response } from 'express';

const app = express();

app.post('/metadata', (req: Request, res: Response) => {
  res.send('welcome!');
});

app.get('/metadatas', (req: Request, res: Response) => {
  res.send('welcome!');
});

app.listen('3000', () => {
  console.log('sever is working on port 3000');
});
