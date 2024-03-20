import { ResultInput, Stage } from '../../api/graphql-gen';
import { Handler } from 'aws-lambda';
import { sendMessageToQueue } from '../libs/request';
import { SQSClient } from '@aws-sdk/client-sqs';
import { faker } from '@faker-js/faker';

export const sleep = (ms: number, cb?: () => void): Promise<void> =>
  new Promise((resolve) => {
    function callback() {
      if (cb) cb();
      resolve();
    }
    setTimeout(callback, ms);
  });

export function sleepBetween(minMilliseconds: number, maxMilliseconds: number, cb?: () => void): Promise<void> {
  const randomMilliseconds = Math.floor(Math.random() * (maxMilliseconds - minMilliseconds + 1)) + minMilliseconds;
  return sleep(randomMilliseconds, cb);
}

const { MESSAGE_QUEUE_URL } = process.env;
const client = new SQSClient();

export type StoreFunctionEvent = { userId: string; requestId: string; storeName: string };

export const handler: Handler<StoreFunctionEvent> = async (event) => {
  if (!MESSAGE_QUEUE_URL) throw new Error('env MESSAGE_QUEUE_URL is missing');

  const randomMilliseconds = Math.floor(Math.random() * (10000 - 2000 + 1)) + 2000;

  const payload: ResultInput = {
    requestId: event.requestId,
    stage: Stage.MESSAGE,
    userId: event.userId,
    payload: JSON.stringify({
      storeName: event.storeName,
      sleepingFor: randomMilliseconds,
      results: [
        {
          price: parseFloat(faker.commerce.price()),
          name: faker.commerce.productName(),
        },
        {
          price: parseFloat(faker.commerce.price()),
          name: faker.commerce.productName(),
        },
        {
          price: parseFloat(faker.commerce.price()),
          name: faker.commerce.productName(),
        },
      ],
    }),
  };

  await sleep(randomMilliseconds);

  console.log({ payload: JSON.stringify(payload, null, 2) });
  await sendMessageToQueue(client, MESSAGE_QUEUE_URL, payload);
};
