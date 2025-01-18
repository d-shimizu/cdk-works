import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as rds from 'aws-cdk-lib/aws-rds';
import { Construct } from 'constructs';

export class CdkWorksStack extends cdk.Stack {
	  public readonly vpc: ec2.Vpc;
  public readonly auroraCluster: rds.DatabaseCluster;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPCの作成
    this.vpc = new ec2.Vpc(this, 'TestVPC', {
  	  ipAddresses: ec2.IpAddresses.cidr('10.128.0.0/16'),
      maxAzs: 3,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
      ],
    });

    // データベースのセキュリティグループ作成
    const dbSecurityGroup = new ec2.SecurityGroup(this, 'DatabaseSecurityGroup', {
      vpc: this.vpc,
      description: 'Security group for Aurora database',
      allowAllOutbound: true,
    });

    // デフォルトで3306ポートへのアクセスを許可
    dbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(3306),
      'Allow MySQL access'
    );

    // Aurora MySQL v2 用のクラスターパラメータグループ
    const auroraClusterParameterGroupV2 = new rds.ParameterGroup(this, ' ClusterParameterGroupV2', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_11_1
      }),
      parameters: {
        'binlog_format': 'MIXED'
      }
    })

    const auroraClusterParameterGroupV3 = new rds.CfnDBClusterParameterGroup(this, 'AuroraClusterParameterGroupV3', {
      family: 'aurora-mysql8.0',
      description: 'Custom parameter group for Aurora MySQL 3.x',
      parameters: {
        'binlog_format': 'MIXED',
        'character_set_server': 'utf8mb4',
        'character_set_client': 'utf8mb4',
        'character_set_database': 'utf8mb4',
        'character_set_connection': 'utf8mb4',
        'collation_server': 'utf8mb4_bin',
        'time_zone': 'Asia/Tokyo',
      },
    });

    // Aurora MySQL クラスターの作成
    this.auroraCluster = new rds.DatabaseCluster(this, 'AuroraCluster', {
      engine: rds.DatabaseClusterEngine.auroraMysql({
        version: rds.AuroraMysqlEngineVersion.VER_2_11_2,
		//version: rds.AuroraMysqlEngineVersion.of('8.0.mysql_aurora.3.04.2', '3.04.2'),
      }),
      instanceProps: {
        vpc: this.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
        },
        instanceType: ec2.InstanceType.of(
          ec2.InstanceClass.T3,
          ec2.InstanceSize.MEDIUM
        ),
        securityGroups: [dbSecurityGroup],
      },
      instances: 1,
	  //parameterGroup: rds.ParameterGroup.fromParameterGroupName(
      //  this,
      //  'ImportedParameterGroup',
      //  auroraClusterParameterGroupV3.ref
      //),
	  //parameterGroup: auroraClusterParameterGroupV3,
	  parameterGroup: auroraClusterParameterGroupV2,
      credentials: rds.Credentials.fromGeneratedSecret('admin'),
      port: 3306,
      backup: {
        retention: cdk.Duration.days(7),
      },
      deletionProtection: true,
    });

    // VPC関連の出力
    new cdk.CfnOutput(this, 'VpcId', {
      value: this.vpc.vpcId,
      description: 'VPC ID',
    });

    new cdk.CfnOutput(this, 'PublicSubnets', {
      value: this.vpc.publicSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Public Subnet IDs',
    });

    new cdk.CfnOutput(this, 'PrivateSubnets', {
      value: this.vpc.privateSubnets.map(subnet => subnet.subnetId).join(','),
      description: 'Private Subnet IDs',
    });

    // データベース関連の出力
    new cdk.CfnOutput(this, 'ClusterEndpoint', {
      value: this.auroraCluster.clusterEndpoint.hostname,
      description: 'Aurora Cluster Endpoint',
    });

    new cdk.CfnOutput(this, 'ClusterReadEndpoint', {
      value: this.auroraCluster.clusterReadEndpoint.hostname,
      description: 'Aurora Cluster Read Endpoint',
    });

    new cdk.CfnOutput(this, 'SecretName', {
      value: this.auroraCluster.secret?.secretName ?? 'No secret found',
      description: 'Secret Name for Database Credentials',
    });
  }
}
