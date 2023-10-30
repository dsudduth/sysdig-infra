import { Stack, StackProps } from 'aws-cdk-lib/core';
import { Vpc, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Cluster, KubernetesVersion, EksOptimizedImage, NodeType } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { AutoScalingGroup,UpdatePolicy } from 'aws-cdk-lib/aws-autoscaling';

export interface EksStackProps extends StackProps {
  readonly vpc: Vpc;
}

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    // IAM role for the worker nodes
    const workerRole = new Role(this, 'EKSWorkerRole', {
      assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
    });

    // Create a KMS key
    const key = new Key(this, 'Key', {
      enableKeyRotation: true,
    });

    // Create the EKS cluster
    const cluster = new Cluster(this, 'EksCluster', {
      clusterName: 'SysdigEksCluster',
      vpc,
      defaultCapacity: 0,
      version: KubernetesVersion.V1_27,
    });

    // Add a managed node group to the cluster
    const onDemandASG = new AutoScalingGroup(this, 'EksOnDemandASG', {
      vpc: vpc,
      role: workerRole,
      minCapacity: 1,
      maxCapacity: 3,
      desiredCapacity: 1,
      instanceType: new InstanceType('t3.medium'),
      machineImage: new EksOptimizedImage({
        kubernetesVersion: '1.27',
        nodeType: NodeType.STANDARD,
      }),
      updatePolicy: UpdatePolicy.rollingUpdate(),
    });

    cluster.connectAutoScalingGroupCapacity(onDemandASG, {});
  }
}
