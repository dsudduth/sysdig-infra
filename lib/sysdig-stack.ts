import { Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";
import { Cluster, HelmChart } from "aws-cdk-lib/aws-eks";

export interface SysdigStackProps extends StackProps {
  readonly cluster: Cluster;
  readonly sysdigAccessKey: string;
}

export class SysdigStack extends Stack {
  constructor(scope: Construct, id: string, props: SysdigStackProps) {
    super(scope, id, props);

    const cluster = props.cluster;
    const sysdigAccessKey = props.sysdigAccessKey;

    // TODO: Implement Sysdig resources

  }
}
