#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { AuthStack } from '../lib/auth-stack';
import { ApiStack } from '../lib/api-stack';
import { DataStack } from '../lib/data-stack';

const app = new cdk.App();

const data = new DataStack(app, 'data-stack', {});

const auth = new AuthStack(app, 'auth-stack', {
  userPoolName: 'appsync-sub-demo-up',
  identityPoolName: 'appsync-sub-demo-idp',
});

new ApiStack(app, 'api-stack', {
  userPool: auth.userPool,
  database: data.table,
});
