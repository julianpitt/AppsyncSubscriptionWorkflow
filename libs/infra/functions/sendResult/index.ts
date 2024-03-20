import { SQSBatchResponse, SQSHandler } from 'aws-lambda';
import { makeRequest } from '../libs/request';
import { SendResult, SendResultMutationVariables } from '../../api/graphql-gen';

const { APPSYNC_ENDPOINT, APPSYNC_REGION } = process.env;

export const handler: SQSHandler = async (event): Promise<SQSBatchResponse> => {
  if (!APPSYNC_REGION || !APPSYNC_ENDPOINT) {
    throw new Error('Missing env variables APPSYNC_REGION and APPSYNC_ENDPOINT');
  }

  const batchItemFailures: SQSBatchResponse['batchItemFailures'] = [];

  for (const r of event.Records) {
    const body: SendResultMutationVariables['input'] = JSON.parse(r.body);
    console.log(JSON.stringify({ body }, null, 2));

    const response = await makeRequest(APPSYNC_ENDPOINT, APPSYNC_REGION, SendResult, {
      input: {
        requestId: body.requestId,
        stage: body.stage,
        userId: body.userId,
        payload: body.payload,
      },
    } satisfies SendResultMutationVariables);

    console.log(JSON.stringify({ response }, null, 2));
  }

  return {
    batchItemFailures,
  };
};
