/* eslint-disable @typescript-eslint/no-explicit-any */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type { DocumentNode } from "graphql/language/ast";
import gql from 'graphql-tag';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  AWSDate: { input: string; output: string; }
  AWSDateTime: { input: string; output: string; }
  AWSEmail: { input: string; output: string; }
  AWSIPAddress: { input: string; output: string; }
  AWSJSON: { input: string; output: string; }
  AWSPhone: { input: string; output: string; }
  AWSTime: { input: string; output: string; }
  AWSTimestamp: { input: number; output: number; }
  AWSURL: { input: string; output: string; }
  BigInt: { input: any; output: any; }
  Double: { input: any; output: any; }
};

export type Item = {
  name: Scalars['String']['output'];
  price: Scalars['Float']['output'];
};

export type Mutation = {
  sendResult?: Maybe<Result>;
};


export type MutationSendResultArgs = {
  input: ResultInput;
};

export type Query = {
  hello?: Maybe<Scalars['String']['output']>;
};

export type RequestInput = {
  requestId?: InputMaybe<Scalars['String']['input']>;
  searchTerm: Scalars['String']['input'];
};

export type Result = {
  payload: Scalars['AWSJSON']['output'];
  requestId: Scalars['ID']['output'];
  stage: Stage;
  userId: Scalars['ID']['output'];
};

export type ResultInput = {
  payload: Scalars['AWSJSON']['input'];
  requestId: Scalars['ID']['input'];
  stage: Stage;
  userId: Scalars['ID']['input'];
};

export const enum Stage {
  BEGIN = 'BEGIN',
  END = 'END',
  MESSAGE = 'MESSAGE'
};

export type Subscription = {
  onResult?: Maybe<Result>;
};


export type SubscriptionOnResultArgs = {
  input: RequestInput;
};

export type SendResultMutationVariables = Exact<{
  input: ResultInput;
}>;


export type SendResultMutation = { sendResult?: { requestId: string, userId: string, payload: string, stage: Stage } | null };

export type OnResultSubscriptionVariables = Exact<{
  input: RequestInput;
}>;


export type OnResultSubscription = { onResult?: { requestId: string, userId: string, payload: string, stage: Stage } | null };


export const SendResult = gql`
    mutation SendResult($input: ResultInput!) {
  sendResult(input: $input) {
    requestId
    userId
    payload
    stage
  }
}
    `;
export const OnResult = gql`
    subscription OnResult($input: RequestInput!) {
  onResult(input: $input) {
    requestId
    userId
    payload
    stage
  }
}
    `;