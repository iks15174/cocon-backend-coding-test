import metascraper from 'metascraper';
import axios from 'axios';
import metascraperUrl from 'metascraper-url';
import metascraperTitle from 'metascraper-title';
import metascraperImage from 'metascraper-image';
import metascraperDate from 'metascraper-date';
import metascraperDescription from 'metascraper-description';
import metascraperPublisher from 'metascraper-publisher';
import { MetadataRes } from '../interfaces';
const aixosInstance = axios.create();

export const crawlMetadata = async (url: string) => {
  try {
    const response = await aixosInstance.get(url);
    const html = await response.data;
    const metadata = await metascraper([
      metascraperUrl(),
      metascraperTitle(),
      metascraperImage(),
      metascraperDate(),
      metascraperDescription(),
      metascraperPublisher(),
    ])({ html, url });
    return {
      date: new Date(metadata.date).toISOString(),
      description: metadata.description,
      image: metadata.image,
      publisher: metadata.publisher,
      title: metadata.title,
      url: url,
    } as MetadataRes;
  } catch (error) {
    console.error('crawling failed');
    return null;
  }
};
