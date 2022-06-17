import { Request, Response } from 'express';
import { getMetadataByUrl, getAllMetadatas } from '../service';
import { ISuccessMsg, IFailMsg } from '../interfaces';

const getMetadata = async (req: Request, res: Response) => {
  const url: string = req.body.url;
  await getMetadataByUrl(url, (result: ISuccessMsg | null, error: IFailMsg | null) => {
    if (error) {
      res.status(error.code).send(error.msg);
    } else if (result) {
      res.status(result.code).send(result.data);
    } else {
      res.status(500).send('internal error');
    }
  });
};

const getMetadatas = (req: Request, res: Response) => {
  getAllMetadatas((result: ISuccessMsg | null, error: IFailMsg | null) => {
    if (error) {
      res.status(error.code).send(error.msg);
    } else if (result) {
      res.status(result.code).send(result.data);
    } else {
      res.status(500).send('internal error');
    }
  });
};

export default {
  getMetadata,
  getMetadatas,
};
