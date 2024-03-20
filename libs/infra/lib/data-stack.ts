import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { AttributeType, BillingMode, ITable, Table } from 'aws-cdk-lib/aws-dynamodb';

type DataStackPropts = StackProps;

export class DataStack extends Stack {
  table: ITable;
  constructor(scope: Construct, id: string, props: DataStackPropts) {
    super(scope, id, props);

    this.table = new Table(this, 'appsync-sub-demo-table', {
      tableName: 'appsync-sub-demo-table',
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'PK',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'SK',
        type: AttributeType.STRING,
      },
    });
  }
}
