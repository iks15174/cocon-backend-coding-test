import { ObjectId } from 'mongodb';

export interface MetadataRes {
  date: string;
  description: string;
  image: string;
  publisher: string;
  title: string;
  url: string;
}

export interface MetadataDb {
  date: Date;
  description: string;
  image: string;
  publisher: string;
  title: string;
  url: string;
  updatedAt: Date;
  id?: ObjectId;
}

export function metadataDbToRes(doc: any): MetadataRes {
  return {
    date: doc.date.toISOString(),
    description: doc.description,
    image: doc.image,
    publisher: doc.publisher,
    title: doc.title,
    url: doc.url,
  } as MetadataRes;
}

export function metadataResToDb(metadata: MetadataRes): MetadataDb {
  return {
    date: new Date(metadata.date),
    description: metadata.description,
    image: metadata.image,
    publisher: metadata.publisher,
    title: metadata.title,
    url: metadata.url,
    updatedAt: new Date(),
  } as MetadataDb;
}
