import { Stack, StackProps } from 'aws-cdk-lib/core';
import { Vpc, InstanceType } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Key } from 'aws-cdk-lib/aws-kms';
import { Cluster, ClusterLoggingTypes, KubernetesVersion, NodegroupAmiType } from 'aws-cdk-lib/aws-eks';
import { Role, ServicePrincipal, CompositePrincipal, AnyPrincipal, ManagedPolicy, User } from 'aws-cdk-lib/aws-iam';
import { KubectlV27Layer } from '@aws-cdk/lambda-layer-kubectl-v27';

export interface EksStackProps extends StackProps {
  readonly vpc: Vpc;
}

export class EksStack extends Stack {
  constructor(scope: Construct, id: string, props: EksStackProps) {
    super(scope, id, props);

    const vpc = props.vpc;

    // IAM role for the worker nodes
    const workerRole = new Role(this, 'eksNodeRole', {
      assumedBy: new CompositePrincipal(
        new ServicePrincipal('ec2.amazonaws.com'),
        new ServicePrincipal('eks.amazonaws.com'),
        new AnyPrincipal(),
      )
    });
    workerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSWorkerNodePolicy'));
    workerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKS_CNI_Policy'));
    workerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2ContainerRegistryReadOnly'));
    workerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSFargatePodExecutionRolePolicy'));

    // IAM role for the cluster
    const clusterServiceRole = new Role(this, 'eksClusterRole', {
      assumedBy: new ServicePrincipal('eks.amazonaws.com'),
    });
    clusterServiceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSClusterPolicy'));
    clusterServiceRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('AmazonEKSServicePolicy'));

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
      kubectlLayer: new KubectlV27Layer(this, 'kubectl'),
      secretsEncryptionKey: key,
      role: clusterServiceRole,
      clusterLogging: [
        ClusterLoggingTypes.API,
        ClusterLoggingTypes.AUDIT,
        ClusterLoggingTypes.AUTHENTICATOR,
        ClusterLoggingTypes.CONTROLLER_MANAGER,
        ClusterLoggingTypes.SCHEDULER,
      ]
    });

    cluster.addNodegroupCapacity('EksNodeGroup', {
      instanceTypes: [new InstanceType('t3.medium')],
      minSize: 1,
      maxSize: 3,
      desiredSize: 1,
      nodeRole: workerRole,
      amiType: NodegroupAmiType.AL2_X86_64,
    });

    // Add allowed role to the cluster
    const allowedAdminRole = Role.fromRoleName(this, 'AllowedAdminRole', 'EksAdmin');
    cluster.awsAuth.addRoleMapping(allowedAdminRole, {
      groups: ['system:masters'],
    });

    const allowedUser  = User.fromUserName(this, 'AllowedUser', 'SysdigDemoUser');
    cluster.awsAuth.addUserMapping(allowedUser, {
      groups: ['system:masters'],
    });

    // Enables full review of the cluster from the AWS console.
    cluster.addManifest('dashboard', {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRole',
      metadata: {
        name: 'eks-console-dashboard-full-access-clusterrole',
      },
      rules: [
        {
          apiGroups: [''],
          resources: ['nodes', 'nodes/proxy', 'services', 'endpoints', 'pods'],
          verbs: ['get', 'list', 'watch'],
        },
        {
          apiGroups: [''],
          resources: ['namespaces'],
          verbs: ['get', 'list'],
        },
        {
          apiGroups: ['extensions'],
          resources: ['namespaces'],
          verbs: ['get', 'list'],
        },
        {
          apiGroups: ['apps'],
          resources: ['namespaces', 'deployments', 'replicasets', 'daemonsets', 'statefulsets'],
          verbs: ['get', 'list'],
        },
        {
          apiGroups: ['batch'],
          resources: ['namespaces', 'jobs'],
          verbs: ['get', 'list'],
        }
      ],
    });

    cluster.addManifest('dashboard-binding', {
      apiVersion: 'rbac.authorization.k8s.io/v1',
      kind: 'ClusterRoleBinding',
      metadata: {
        name: 'eks-console-dashboard-full-access-binding',
      },
      subjects: [
        {
          kind: 'Group',
          name: 'eks-console-dashboard-full-access-group',
          apiGroup: 'rbac.authorization.k8s.io'
        },
      ],
      roleRef: {
        apiGroup: 'rbac.authorization.k8s.io',
        name: 'eks-console-dashboard-full-access-clusterrole',
        kind: 'ClusterRole'
      }
    });
  }
}
