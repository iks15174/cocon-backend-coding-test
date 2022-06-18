# cocon-backend-coding-test

# 목차

- [전체보기](#전체보기)
- [구현 상세 설명](#구현-상세-설명)
- [실행 방법](#실행-방법)

# 전체보기

1. POST /metadata와 GET /metadatas를 구현하였다. POST /metadata는 먼저 mongo DB에 url에 해당하는 메타데이터가 있는지 확인한다. 데이터가 존재하고, 데이터를 저장한지 1시간이 지나지 않았으면 그 데이터를 반환한다. 만약 데이터가 존재하지 않거나, 데이터를 저장한지 1시간이 지난 뒤라면 새롭게 메타데이터를 크롤링 한 후 데이터를 mongo DB에 저장하고, 크롤링한 데이터를 반환한다.

2. GET /metadatas는 호출 시에 mongo DB에 저장되어 있던 메타데이터 전부를 반환한다.

3. 성능향상을 위해 redis를 사용하였다. redis의 만료시간은 데이터 유효 시간과 같은 1시간이다.

4. docker compose를 이용하여, node.js backend, mongo DB, redis 3개의 cotainer를 실행시키고 서로 통신하게 만들 수 있다.

5. redis 서버의 url은 `REDIS_URL`, mongo DB 서버의 url은 `MONGODB_URL` 환경변수를 통해 전달할 수 있다.

# 구현 상세 설명

## 새롭게 정의한 인터페이스

메타데이터 크롤러를 만들기 위해 새롭게 정의한 인터페이스가 있다. 이런 인터페이스는 `interfaces` 폴더 아래 정의해뒀다.

`IFailMsg.ts`

```js
// interfaces/IFailMsg.ts
export interface IFailMsg {
  code: number;
  msg: string;
}
```

요청 처리 중 실패했을 때, 실패 코드와 실패 원인을 담기 위한 인터페이스이다.

`ISuccessMsg.ts`

```js
// interfaces/ISuccessMsg.ts
export interface ISuccessMsg {
  code: number;
  msg: string;
  data: any;
}
```

요청 처리가 성공했을 때 응답을 위한 인터페이스이다. `IFailMsg`와 다른점은 요청 처리 결과를 담기 위한 `data` 필드가 존재한다.

`MetadataDb`

```js
// interfaces/MetadataDb.ts
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
```

크롤링한 메타데이터를 mongo DB에 저장할 때의 형식을 나타낸다. 기본적으로 저장해야하는 `date`, `description`, `image`, `publisher`, `title`, `url` 외에도 데이터가 언제 저장됐는지를 나타내는 `updatedAt`과 데이터의 primary key인 `id`가 있다.

`MetadataRes`

```js
// interfaces/MetadataDb.ts
export interface MetadataRes {
  date: string;
  description: string;
  image: string;
  publisher: string;
  title: string;
  url: string;
}
```

크롤링한 메타데이터를 client한테 응답하는 형식을 나타내는 인터페이스이다.

###

## mongo DB & redis 연결

메타데이터 크롤러는 mongo DB와 redis를 사용하기 때문에 어플리케이션 시작 전 mongo DB와 redis에 연결을 해야 한다.

```js
// app.ts
const connect = async () => {
  try {
    await connectDb();
    await cache_connect();
  } catch (error) {
    console.error('connection failed', error);
    process.exit();
  }
};
```

위 코드는 mongo DB 연결을 위한 함수와, redis 연결을 위한 함수를 호출하는 부분이다. 어플리케이션 시작 전 `connect` 함수를 호출하여 연결을 하고 시작한다.

```js
// util/db.ts
const dbUrl = process.env.MONGODB_URL;

export const collections: { metadata?: Collection } = {};

export const connectDb = async (dbName: string = defaultDbName) => {
  const client = new MongoClient(dbUrl || 'mongodb://127.0.0.1:27017/');
  await client.connect();
  const db: Db = client.db(dbName);
  const metadataCollection: Collection = db.collection('metadata');
  collections.metadata = metadataCollection;
};
```

위 코드는 `connectDb` 함수의 일부로, `MONGODB_URL` 환경변수로부터 mongo DB의 url을 가져온 후 해당 url로 연결한다. 연결 후 어플리케이션에서 사용하고자 하는 mongo DB의 collection을 `collections` 변수에 할당한다. 이 `collections` 변수를 export 해서 service 층에서 DB에 접근할 수 있도록 한다.

```js
// util/cache_redis.ts
const redisClient: RedisClientType = createClient({
  url: process.env.REDIS_URL,
});

export const cache_connect = async () => {
  await redisClient.connect();
};

export const setCache = async (key: string, value: any) => { ... }
export const getCache = async (req: Request, res: Response, next: NextFunction) => { ... }
```

위 코드는 `cache_connect` 함수의 일부로, `REDIS_URL` 환경변수로부터 redis의 url을 가져온 후 해당 url로 연결한다. `util/cache_redis.ts` 파일에는 redis에 연결하는 함수 뿐만 아니라, redis에 set, get 하는 함수도 정의되어 있다.

## 메타데이터 크롤링

메타데이터 크롤러의 핵심 기능 중 하나는 웹페이지 url을 이용하여 웹페이지의 메타데이터를 가져오는 기능이다. 이 기능은 `util/crawl_metadata.ts` 파일에 정의되어 있다.

```js
// util/crawl_metadata.ts
export const crawlMetadata = async (url: string) => {
  try {
    const response = await aixosInstance.get(url);
    const html = await response.data;
    const metadata = await metascraper(...)({ html, url });
    return {
      date: new Date(metadata.date).toISOString(),
      description: metadata.description,
      image: metadata.image,
      publisher: metadata.publisher,
      title: metadata.title,
      url: url,
    } as MetadataRes;
  } catch (error) {
    return null
  }
};
```

위 코드는 `crawlMetadata` 함수의 일부이다. 이 함수 구현을 위해 [`metascraper` 라이브러리](https://www.npmjs.com/package/metascraper)와 [`axios` 라이브러리](https://axios-http.com/kr/docs/intro)를 사용하였다. `axios`를 이용하여 url에 해당하는 페이지의 html을 가져오고 `metascraper` 이용해 html로부터 메타데이터를 추출하였다.

## app.ts & controller

앞에서 기능구현에 필요한 타입과 모듈들에 대한 설명을 마쳤다. 지금부턴 위의 모듈들을 어떻게 사용하여 메타데이터 크롤러를 구현했는지 설명하도록 하겠다. 먼저 어플리케이션의 시작이라고 할 수 있는 `app.ts`와 `controller`에 대해 설명하겠다.

```js
// app.ts
const connect = async () => {
  ...
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
```

`app.ts`에선 `start` 함수를 호출한다. `start` 함수를 호출하면 `connect` 함수를 통해 mongo DB와 redis에 연결한다. 그리고 '/metadata'와 '/metadatas'로 들어오는 요청을 처리한다. '/metadata'로 들어오는 요청은 `getCache` 함수를 통해 redis 캐쉬가 있는지 확인하고 캐쉬가 있으면 그 데이터를 반환하고 없으면 `getMetadata` 함수로 요청을 전달한다. '/metadatas'로 들어오는 요청은 `getMetadatas` 함수로 요청을 전달한다. '/metadatas'로 들어오는 요청은 관리자를 위한 기능이고 자주 요청이 생길 것 같지 않아 redis 캐쉬를 적용하지 않았다.

```js
// controller/MetadataController.ts
export const getMetadata = async (req: Request, res: Response) => {
  const url: string = req.body.url;
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
```

`getMetadata`는 요청의 body로부터 url(`getCache`함수에서 유효성 처리함)을 가져오고 service 층의 함수인 `getMetadataByUrl`로 url과 콜백함수를 전달해준다. 콜백함수는 `result`와 `error`를 인자로 받는데 `getMetadataByUrl`함수가 정상적으로 처리됐으면 `result`에는 결과, `error`에는 `null`을 넘겨주고 `getMetadataByUrl`함수 실행 중 문제가 발생하면 `result`에는 `null`, `error`에는 에러 메세지를 넘겨준다. 콜백함수에서 `result`가 `null`이 아닌 경우 즉 정상적으로 메타데이터를 가져왔을 경우 `result`에 포함되어 있는 메타데이터를 redis 캐쉬에 저장해준다.

```js
// controller/MetadataController.ts
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
```

`getMetadatas`는 service 층의 함수인 `getAllMetadatas`로 콜백함수를 전달해준다. 콜백함수의 기능은 `getMetadata`에서의 기능과 같다.

## POST /metadata 요청의 getMetadataByUrl 함수

```js
// service/MetadataService.ts
const metadataByUrl = await collections.metadata?.findOne(query);
```

`getMetadataByUrl`함수는 mongo DB에 url에 해당하는 메타데이터가 있는지 확인한다.

```js
// service/MetadataService.ts
export const thresholdTime = 60 * 60 * 1000;

if (metadataByUrl == null) {
      const metadata: MetadataRes | null = await crawlMetadata(url);
      if (metadata == null) {
        callback(null, { code: 404, msg: "Can't not find page" } as IFailMsg);
        return;
      }
      const result = await collections.metadata?.insertOne(metadataResToDb(metadata));
      ...
}
```

만약 메터데이터가 없으면 메타데이터를 크롤링한 후 메타데이터를 DB에 저장하고 콜백함수를 호출한다.

```js
// service/MetadataService.ts
else if (+new Date() - metadataByUrl.updatedAt > thresholdTime) {
      const metadata: MetadataRes | null = await crawlMetadata(url);
      if (metadata == null) {
        callback(null, { code: 404, msg: "Can't not find page" } as IFailMsg);
        return;
      }
      const result = await collections.metadata?.updateOne(query, {
        $set: metadataResToDb(metadata),
      });
      ...
}
```

만약 메타데이터가 있으면 메타데이터의 `updateAt` 필드를 확인한다. `updateAt` 필드의 시간이 현재 시간과 1시간 이상 차이나면 메타데이터를 새롭게 크롤링한 후 mongo DB에 업데이트하고 콜백함수를 호출한다.

```js
// service/MetadataService.ts
else {
callback(
        {
          code: 200,
          msg: 'Succeed to get updated metadata',
          data: metadataDbToRes(metadataByUrl),
        } as ISuccessMsg,
        null
      );
}
```

1시간 이상 차이나지 않으면 DB의 메타데이터와 함께 콜백함수를 호출한다.

## GET /metadatas 요청의 getAllMetadatas 함수

```js
// service/MetadataService.ts
export const getAllMetadatas = async (...) => {
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
    ...
    callback(null, { code: 500, msg: message } as IFailMsg);
  }
};
```

mongo DB로부터 모든 메타데이터를 리스트로 가져온다. 메타데이터를 가져오는 도중 문제가 생기면 에러 메시지와 함께 콜백함수를 호출한다. 문제가 없으면 메타데이터 리스트를 순회하며 각 메타데이터를 `metadataDbToRes`함수를 통해 `MetadataRes` 타입으로 바꿔준 후 콜백함수를 호출한다.

# 실행 방법

1. 먼저 Dockerfile을 이용해 이미지를 빌드해야 한다. 프로젝트의 루트에서 `docker build . -t ts-node-web` 명령어를 입력한다. 반드시 `ts-node-web` 이어야 한다.
2. docker compose up 명령어를 통해 redis, mongo DB, 메타데이터 크롤러 어플리케이션 이 3개의 컨테이너를 실행시킨다.
3. http://localhost:3000/metadata 또는 http://localhost:3000/metadatas을 통해 요청을 보낼 수 있다.

![Figure1 실행예시](/docs/imgs/execute.gif)
실행 예시이다.
