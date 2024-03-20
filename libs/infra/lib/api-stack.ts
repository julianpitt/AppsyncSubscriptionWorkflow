import { CfnOutput, Duration, Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as path from 'path';
import { IUserPool } from 'aws-cdk-lib/aws-cognito';
import {
  GraphqlApi,
  SchemaFile,
  AuthorizationType as AppSyncAuthorizationType,
  IntrospectionConfig,
  FieldLogLevel,
  NoneDataSource,
  FunctionRuntime,
  Code,
  LambdaDataSource,
} from 'aws-cdk-lib/aws-appsync';
import { ITable } from 'aws-cdk-lib/aws-dynamodb';
import { defaultFunctionProps } from '../helpers/Functions';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Queue, QueueEncryption } from 'aws-cdk-lib/aws-sqs';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';

interface ApiStackPropts extends StackProps {
  userPool: IUserPool;
  database: ITable;
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackPropts) {
    super(scope, id, props);

    const gqlApi = new GraphqlApi(this, 'appsync-sub-demo-api', {
      name: 'appsync-sub-demo-api',
      introspectionConfig: IntrospectionConfig.DISABLED,
      definition: {
        schema: SchemaFile.fromAsset(path.join(__dirname, '../api/schema.graphql')),
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AppSyncAuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AppSyncAuthorizationType.IAM,
          },
        ],
      },
      logConfig: {
        fieldLogLevel: FieldLogLevel.ERROR,
      },
    });

    new CfnOutput(this, 'GraphQLAPIEndpoint', {
      value: gqlApi.graphqlUrl,
    });

    /**
     * Response fn
     * Build a queue and lambda function that will send the message payload AppSync sendResponse mutation
     */

    const dlq = new Queue(this, 'sendMessgeDLQ', {
      queueName: 'send-message-dlq.fifo',
      fifo: true,
      encryption: QueueEncryption.UNENCRYPTED,
      visibilityTimeout: Duration.seconds(40),
      retentionPeriod: Duration.days(4),
    });

    const messageQueue = new Queue(this, 'sendMessageQueue', {
      queueName: 'send-message-queue.fifo',
      fifo: true,
      encryption: QueueEncryption.UNENCRYPTED,
      visibilityTimeout: Duration.seconds(40),
      retentionPeriod: Duration.minutes(2),
      contentBasedDeduplication: true,
      deadLetterQueue: {
        queue: dlq,
        maxReceiveCount: 1,
      },
    });

    const responseFn = new NodejsFunction(this, 'responseFn', {
      functionName: 'responseFn',
      entry: path.resolve(__dirname, '../functions/sendResult/index.ts'),
      ...defaultFunctionProps(),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        APPSYNC_REGION: Stack.of(this).region,
        APPSYNC_ENDPOINT: gqlApi.graphqlUrl,
      },
    });
    responseFn.addEventSource(
      new SqsEventSource(messageQueue, {
        maxConcurrency: 2,
        batchSize: 1,
        reportBatchItemFailures: true,
      }),
    );
    gqlApi.grantMutation(responseFn, 'sendResult');

    /**
     *
     * Long running task simulation function
     *
     */

    const searchStoreFn = new NodejsFunction(this, 'searchStore', {
      functionName: 'searchStoreFn',
      entry: path.resolve(__dirname, '../functions/store/index.ts'),
      ...defaultFunctionProps(),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        MESSAGE_QUEUE_URL: messageQueue.queueUrl,
      },
    });
    messageQueue.grantSendMessages(searchStoreFn);

    /**
     * Send Result mutation
     */

    const noneDS = new NoneDataSource(this, 'NoneDS', {
      api: gqlApi,
      name: 'noneDS',
    });

    noneDS.createResolver(`sendResultResolver`, {
      typeName: 'Mutation',
      fieldName: 'sendResult',
      runtime: FunctionRuntime.JS_1_0_0,
      code: Code.fromAsset(path.resolve(__dirname, '../api/resolvers/sendResult/mappingTemplate.js')),
    });

    /**
     * OnResult Subscription
     */

    const onResultFn = new NodejsFunction(this, 'onResultFn', {
      functionName: 'onResultSubscription',
      entry: path.resolve(__dirname, '../api/resolvers/onResult/function/index.ts'),
      ...defaultFunctionProps(),
      environment: {
        NODE_OPTIONS: '--enable-source-maps',
        MESSAGE_QUEUE_URL: messageQueue.queueUrl,
        STORE_FN_ARN: searchStoreFn.functionArn,
        TABLE_NAME: props.database.tableName,
      },
    });
    messageQueue.grantSendMessages(onResultFn);
    searchStoreFn.grantInvoke(onResultFn);

    const onResultDS = new LambdaDataSource(this, 'onResultDS', {
      api: gqlApi,
      name: 'onResultDS',
      lambdaFunction: onResultFn,
    });

    onResultDS.createResolver(`onResultResolver`, {
      typeName: 'Subscription',
      fieldName: 'onResult',
      runtime: FunctionRuntime.JS_1_0_0,
      code: Code.fromAsset(path.resolve(__dirname, '../api/resolvers/onResult/mappingTemplate.js')),
    });
  }
}
