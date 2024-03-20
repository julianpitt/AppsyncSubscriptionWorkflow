import type { AppSyncResolverHandler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';
import { SubscriptionOnResultArgs, OnResultSubscription, Stage } from '../../../graphql-gen';
import { sendMessageToQueue } from '../../../../functions/libs/request';
import { SQSClient } from '@aws-sdk/client-sqs';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import type { StoreFunctionEvent } from '../../../../functions/store';

const { MESSAGE_QUEUE_URL, STORE_FN_ARN } = process.env;
const sqsClient = new SQSClient();
const lambdaClient = new LambdaClient();

export const handler: AppSyncResolverHandler<SubscriptionOnResultArgs, OnResultSubscription['onResult']> = async (
  event,
  context,
) => {
  console.log(JSON.stringify({ event, context }, null, 2));
  if (!MESSAGE_QUEUE_URL) {
    throw new Error('No MESSAGE_QUEUE_URL');
  }
  if (!STORE_FN_ARN) {
    throw new Error('No STORE_FN_ARN');
  }

  const inputRequestId = event.arguments.input.requestId;
  let requestId: string;
  const userId = event.identity && 'sub' in event.identity && event.identity.sub;

  if (!userId) {
    throw new Error('No cognito Sub in identity event');
  }

  // Check if the user has sent through a request ID.
  if (inputRequestId) {
    requestId = `${inputRequestId}`;
    // If they have then send them all the previous request data from the database
  } else {
    // If the user hasn't send through a request ID generated a new request ID then send it
    requestId = uuidv4();
    // Save it in the database as a master record
    // Kick off the main requests
    lambdaClient.send(
      new InvokeCommand({
        FunctionName: STORE_FN_ARN,
        Payload: Buffer.from(
          JSON.stringify({
            userId,
            requestId,
            storeName: 'Store 1',
          } satisfies StoreFunctionEvent),
        ),
        InvocationType: InvocationType.Event,
      }),
    );
    lambdaClient.send(
      new InvokeCommand({
        FunctionName: STORE_FN_ARN,
        Payload: Buffer.from(
          JSON.stringify({
            userId,
            requestId,
            storeName: 'Store 2',
          } satisfies StoreFunctionEvent),
        ),
        InvocationType: InvocationType.Event,
      }),
    );
    lambdaClient.send(
      new InvokeCommand({
        FunctionName: STORE_FN_ARN,
        Payload: Buffer.from(
          JSON.stringify({
            userId,
            requestId,
            storeName: 'Store 3',
          } satisfies StoreFunctionEvent),
        ),
        InvocationType: InvocationType.Event,
      }),
    );
  }

  // Return the request ID and the usersId to the response mapping template so we can filter future messages
  const payload = {
    requestId: requestId,
    userId,
    stage: Stage.BEGIN,
    payload: JSON.stringify({ stores: ['Store 1', 'Store 2', 'Store 3'] }),
  };

  // Initiate a request
  // send a message to a queue that sends messages to users
  await sendMessageToQueue(sqsClient, MESSAGE_QUEUE_URL, {
    ...payload,
  });

  // Return the payload
  return payload;
};
