import { Sha256 } from '@aws-crypto/sha256-js';
import { defaultProvider } from '@aws-sdk/credential-provider-node';
import { HttpRequest } from '@smithy/protocol-http';
import { SignatureV4 } from '@smithy/signature-v4';
import type { DocumentNode } from 'graphql/language/ast';
import { default as fetch, Request } from 'node-fetch';
import { SendResultMutationVariables } from '../../api/graphql-gen';
import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

export async function sendMessageToQueue(
  client: SQSClient,
  queueURL: string,
  payload: SendResultMutationVariables['input'],
) {
  const command = new SendMessageCommand({
    QueueUrl: queueURL,
    MessageGroupId: `${payload.userId}-${payload.requestId}`,
    MessageAttributes: {
      UserId: {
        DataType: 'String',
        StringValue: payload.userId,
      },
      RequestId: {
        DataType: 'String',
        StringValue: payload.requestId,
      },
    },
    MessageBody: JSON.stringify(payload),
  });

  const response = await client.send(command);
  console.log(response);
  return response;
}

export async function makeRequest<Response = Record<string, unknown>>(
  graphQLEndpoint: string,
  region: string,
  query: string | DocumentNode,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  variables?: Record<string, any>,
) {
  const endpoint = new URL(graphQLEndpoint);

  const signer = new SignatureV4({
    credentials: defaultProvider(),
    region: region,
    service: 'appsync',
    sha256: Sha256,
  });

  const post_body = {
    query,
    variables,
  };

  if (typeof query !== 'string' && query.kind && query.kind === 'Document') {
    post_body.query = (query.loc && query.loc.source.body) || query;
  }

  const requestToBeSigned = new HttpRequest({
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      host: endpoint.host,
    },
    hostname: endpoint.host,
    body: JSON.stringify(post_body),
    path: endpoint.pathname,
  });

  const signed = await signer.sign(requestToBeSigned);
  const request = new Request(endpoint.toString(), signed);
  console.log(JSON.stringify({ request }, null, 2));
  const response = await fetch(request);
  return response.json() as Response;
}
