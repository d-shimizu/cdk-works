#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { CdkWorksStack } from '../lib/cdk-works-stack';

const app = new cdk.App();
new CdkWorksStack(app, 'CdkWorksStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description: 'My Webapp Infrastructure Stack (VPC and Aurora)',
});
