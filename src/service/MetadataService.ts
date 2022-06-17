import { collections } from './db';
import { crawlMetadata } from '../util/crawl_metadata';
import {
  ISuccessMsg,
  IFailMsg,
  MetadataRes,
  metadataDbToRes,
  metadataResToDb,
} from '../interfaces';
const thresholdTime = 10 * 1000;

export const getMetadataByUrl = async (
  url: string,
  callback: (result: ISuccessMsg | null, error: IFailMsg | null) => void
) => {
  try {
    const query = { url: url };
    const metadataByUrl = await collections.metadata?.findOne(query);
    if (metadataByUrl == null) {
      const metadata: MetadataRes = await crawlMetadata(url);
      const result = await collections.metadata?.insertOne(metadataResToDb(metadata));
      callback(
        {
          code: 201,
          msg: 'Succeed to get new metadata',
          data: metadata,
        } as ISuccessMsg,
        null
      );
      if (!result) {
        console.log('Failed to create new metadata information');
      }
    } else if (+new Date() - metadataByUrl.updatedAt > thresholdTime) {
      const metadata: MetadataRes = await crawlMetadata(url);
      const result = await collections.metadata?.updateOne(query, {
        $set: metadataResToDb(metadata),
      });
      callback(
        {
          code: 200,
          msg: 'Succeed to get updated metadata',
          data: metadata,
        } as ISuccessMsg,
        null
      );
      if (!result) {
        console.log('Failed to update metadata information');
      }
    } else {
      callback(
        {
          code: 200,
          msg: 'Succeed to get updated metadata',
          data: metadataDbToRes(metadataByUrl),
        } as ISuccessMsg,
        null
      );
    }
  } catch (error) {
    let message;
    if (error instanceof Error) message = error.message;
    else message = String(error);
    callback(null, { code: 500, msg: message } as IFailMsg);
  }
};

export const getAllMetadatas = async (
  callback: (result: ISuccessMsg | null, error: IFailMsg | null) => void
) => {
  try {
    const metadatas = await collections.metadata?.find({}).toArray();
    callback(
      {
        code: 200,
        msg: 'Succeed to get updated metadata',
        data: metadatas?.map((metadata) => metadataDbToRes(metadata)),
      } as ISuccessMsg,
      null
    );
  } catch (error) {
    let message;
    if (error instanceof Error) message = error.message;
    else message = String(error);
    callback(null, { code: 500, msg: message } as IFailMsg);
  }
};
