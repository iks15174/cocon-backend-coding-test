import { NextFunction, Request, Response } from 'express';
import { RedisClientType, createClient } from 'redis';
import { thresholdTime } from '../service';
import validator from 'validator';

const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

export const setCache = async (key: string, value: any) => {
  await redisClient.set(key, JSON.stringify(value), { EX: thresholdTime / 1000 });
};

export const getCache = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const url: string = req.body.url;
    if (!validator.isURL(url)) {
      res.status(400).send('invalid url');
      return;
    }
    const data = await redisClient.get(url);
    if (data !== null) {
      res.status(200).send(JSON.parse(data));
    } else next();
  } catch (error) {
    res.status(500).send('Internal server error');
  }
};

export const cache_connect = async () => {
  await redisClient.connect();
};
