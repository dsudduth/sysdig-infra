#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { VpcStack } from '../lib/vpc-stack';
import { EksStack } from '../lib/eks-stack';

const app = new cdk.App();
const prefix = stackPrefix(app);

// Create the VPC stack
const vpcStack = new VpcStack(app, `${prefix}VPCStack`);

// Create the EKS stack
const eksStack = new EksStack(app, `${prefix}EKSStack`, {
  vpc: vpcStack.vpc,
});

/**
 * Get the stack prefix from the context
 * @param stack The stack to get the prefix for
 * @returns The stack prefix or 'Sysdig-' if not defined
 */
function stackPrefix(stack: Construct): string {
  const stackPrefix = stack.node.tryGetContext('stackPrefix');

  if (stackPrefix !== undefined) {
      return stackPrefix.trim();
  }

  return 'Sysdig-';
}
