import { GraphqlApi, BaseResolverProps } from 'aws-cdk-lib/aws-appsync';
import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import { Query, Mutation } from '../api/graphql-gen';
import { defaultFunctionProps } from './Functions';
import { IFunction } from 'aws-cdk-lib/aws-lambda';

export function createLambdaResolver(
  construct: Construct,
  api: GraphqlApi,
  resolverInfo: { typeName: 'Query'; field: keyof Query } | { typeName: 'Mutation'; field: keyof Mutation },
  options: (
    | {
        functionName?: string;
        functionDir?: string;
        functionOverwrites?: NodejsFunctionProps;
      }
    | { functionName?: string; function: IFunction }
  ) & { resolverProps?: Omit<BaseResolverProps, 'typeName' | 'fieldName'> } = {},
) {
  let lambdaFunction: IFunction;
  let functionName: string;

  if ('function' in options) {
    lambdaFunction = options.function;
    functionName = options.functionName ?? options.function.functionName;
  } else {
    functionName = resolverInfo.field ?? options.functionName;
    lambdaFunction = new NodejsFunction(construct, `${functionName}Function`, {
      ...defaultFunctionProps(),
      functionName,
      entry: path.join(__dirname, `../api/resolvers/${options.functionDir ?? functionName}/index.ts`),
      ...options.functionOverwrites,
    });
  }

  const lambdaDS = api.addLambdaDataSource(`${functionName}FnDs`, lambdaFunction, {
    name: functionName + 'FnDs',
  });

  const resolver = lambdaDS.createResolver(`${functionName}FnResolver`, {
    typeName: resolverInfo.typeName,
    fieldName: resolverInfo.field,
    ...(options?.resolverProps ?? {}),
  });

  return {
    datasource: lambdaDS,
    resolver: resolver,
    function: lambdaFunction,
  };
}
