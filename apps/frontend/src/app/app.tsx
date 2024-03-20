import { Authenticator } from '@aws-amplify/ui-react';
import { ReactNode, useRef, useState } from 'react';
import { GraphqlSubscriptionResult } from '@aws-amplify/api-graphql';
import { OnResultDocument, OnResultSubscription, OnResultSubscriptionVariables, Result, Stage } from '@appsync-subscription-workflow/api';

import { Amplify, ResourcesConfig } from 'aws-amplify';
import { generateClient, GraphQLSubscription } from 'aws-amplify/api';
import config from '../aws-exports.json';

const amplifyConfig: ResourcesConfig = {
  Auth: {
    Cognito: {
      userPoolClientId: config["auth-stack"].userPoolClientId,
      userPoolId: config["auth-stack"].userPoolId,
    }
  },
  API: {
    GraphQL: {
      region: config["auth-stack"].cognitoRegion,
      defaultAuthMode: 'userPool',
      endpoint: config["api-stack"].GraphQLAPIEndpoint
    }
  }
};
console.log({ amplifyConfig })
Amplify.configure(amplifyConfig);

const client = generateClient();

const AuthGuardComponent = (props: { children: ReactNode }) => <Authenticator hideSignUp={true}
  components={{
    Header() {
      return (
        <div className='my-6 text-center'>
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-3">
            AppSync Subscription demo
          </h2>
        </div>
      );
    },
  }}
  formFields={
    {
      signIn: {
        username: {
          label: 'Email',
          placeholder: 'Enter your Email',
        },
      },
    }
  }>
  {props.children}
</Authenticator>

export function App() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const subscriptionRef = useRef<ReturnType<GraphqlSubscriptionResult<GraphQLSubscription<OnResultSubscription>>['subscribe']> | null>();

  const beginMessage = results.find(r => r.stage === Stage.BEGIN);
  const beginMessagePayload: { stores: string[] } | undefined = beginMessage?.payload ? JSON.parse(beginMessage?.payload) : undefined;
  const expectedStoreMessages = beginMessagePayload?.stores.length;
  const storeMessages = results.filter(r => r.stage === Stage.MESSAGE);

  if (expectedStoreMessages !== undefined && expectedStoreMessages === storeMessages.length) {
    closeSubscription();
  }

  function closeSubscription() {
    subscriptionRef.current?.unsubscribe();
    setLoading(false);
  }

  function startSusbcription() {
    setLoading(true);
    const input: OnResultSubscriptionVariables = {
      input: {
        searchTerm: ''
      }
    }

    const result = client.graphql<GraphQLSubscription<OnResultSubscription>>({
      // @ts-expect-error different versions of graphql DocumentNode
      query: OnResultDocument, variables: input
    });
    subscriptionRef.current = result.subscribe((next) => {
      const result = next.data.onResult
      if (result !== undefined && result !== null) {
        setResults(r => [...r, result]);
      }
    });
  }

  return (
    <AuthGuardComponent>
      <p>Hello!</p>
      <button disabled={loading} onClick={startSusbcription}>Start Subscription</button>
      <p>Subscription {loading ? 'open' : 'closed'}. Recieved {storeMessages.length} of {beginMessagePayload?.stores.length ?? '?'}</p>
      <pre>
        {storeMessages.map((result, idx, arr) => (
          `Store Message: ${idx}/${beginMessagePayload?.stores.length ?? '?'}\n` +
          `${JSON.stringify(result, null, 2)}` +
          `\n`
        ))}
      </pre>
    </AuthGuardComponent>
  );
}

export default App;
