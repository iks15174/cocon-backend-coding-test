import { Request, Response } from 'express';
import { getMetadataByUrl, getAllMetadatas } from '../service';
import { ISuccessMsg, IFailMsg } from '../interfaces';
import { setCache } from '../util';
import validator from 'validator';

export const getMetadata = async (req: Request, res: Response) => {
  const url: string = req.body.url;
  if (!validator.isURL(url)) {
    res.status(400).send('invalid url');
    return;
  }
  await getMetadataByUrl(url, (result: ISuccessMsg | null, error: IFailMsg | null) => {
    if (error) {
      res.status(error.code).send(error.msg);
    } else if (result) {
      setCache(url, result.data);
      res.status(result.code).send(result.data);
    } else {
      res.status(500).send('internal error');
    }
  });
};

export const getMetadatas = (req: Request, res: Response) => {
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
