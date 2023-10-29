import { Stack, StackProps } from 'aws-cdk-lib/core';
import { Vpc } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Key } from 'aws-cdk-lib/aws-kms';

export interface EksStackProps extends StackProps {
  readonly vpc: Vpc;
}

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    // Create a KMS key
    const key = new Key(this, 'Key', {
      enableKeyRotation: true,
    });
  }
}
