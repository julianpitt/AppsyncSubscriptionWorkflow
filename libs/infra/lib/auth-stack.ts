import { CfnOutput, RemovalPolicy, Stack, StackProps } from 'aws-cdk-lib';
import {
  AccountRecovery,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  CfnUserPoolGroup,
  IUserPoolClient,
  UserPool,
  UserPoolClient,
  UserPoolClientIdentityProvider,
  UserPoolProps,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, ManagedPolicy, Role } from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

interface AuthStackProps extends StackProps {
  userPoolName: string;
  passwordPolicy?: UserPoolProps['passwordPolicy'];
  identityPoolName: string;
}

export class AuthStack extends Stack {
  userPool: UserPool;
  userPoolClient: IUserPoolClient;
  authRole: Role;
  unauthRole: Role;

  constructor(scope: Construct, id: string, props: AuthStackProps) {
    super(scope, id, props);

    const userPool = new UserPool(this, 'userpool', {
      userPoolName: props.userPoolName,
      selfSignUpEnabled: false,

      signInAliases: {
        email: true,
      },
      autoVerify: {
        email: true,
      },
      userInvitation: {
        emailSubject: 'Temporary password for AppSync subscription demo app',
        emailBody:
          'Welcome to the AppSync subscription demo app!\nYour username is {username} and your temporary password is {####}.',
      },
      passwordPolicy: props.passwordPolicy
        ? props.passwordPolicy
        : {
            minLength: 10,
            requireLowercase: false,
            requireDigits: false,
            requireUppercase: false,
            requireSymbols: false,
          },
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    this.userPool = userPool;

    const userPoolClient = new UserPoolClient(this, 'userpool-client', {
      userPool,
      supportedIdentityProviders: [UserPoolClientIdentityProvider.COGNITO],
    });
    this.userPoolClient = userPoolClient;

    const identityPool = new CfnIdentityPool(this, 'identity-pool', {
      identityPoolName: props.identityPoolName,
      allowUnauthenticatedIdentities: true,
      cognitoIdentityProviders: [
        {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
        },
      ],
    });

    const anonymousRole = new Role(this, 'anonymous-group-role', {
      description: 'Default role for anonymous users',
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'unauthenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    this.unauthRole = anonymousRole;

    const userRole = new Role(this, 'users-group-role', {
      description: 'Default role for authenticated users',
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
      managedPolicies: [ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole')],
    });
    this.authRole = userRole;

    new CfnUserPoolGroup(this, 'AdminGroup', {
      groupName: 'admin',
      userPoolId: userPool.userPoolId,
    });

    new CfnIdentityPoolRoleAttachment(this, 'identity-pool-role-attachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: userRole.roleArn,
        unauthenticated: anonymousRole.roleArn,
      },
      roleMappings: {
        mapping: {
          type: 'Token',
          ambiguousRoleResolution: 'AuthenticatedRole',
          identityProvider: `cognito-idp.${Stack.of(this).region}.amazonaws.com/${userPool.userPoolId}:${
            userPoolClient.userPoolClientId
          }`,
        },
      },
    });

    new CfnOutput(this, 'userPoolId', {
      value: userPool.userPoolId,
    });

    new CfnOutput(this, 'userPoolClientId', {
      value: userPoolClient.userPoolClientId,
    });

    new CfnOutput(this, 'userIdentityPoolId', {
      value: identityPool.ref,
    });

    new CfnOutput(this, 'cognitoRegion', {
      value: Stack.of(this).region,
    });
  }
}
