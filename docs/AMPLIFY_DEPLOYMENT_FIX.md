# Amplify Gen 2 Backend Deployment Fix

## Issue Summary

When deploying the Twitter clone application to AWS Amplify, the backend resources (Authentication, Data, Storage) were not being deployed despite the frontend building successfully. The deployment consistently failed with a CDK bootstrap permission error.

### Error Message
```
[BootstrapDetectionError] Unable to detect CDK bootstrap stack due to permission issues.
∟ Caused by: [ToolkitError] amplify-d3o849eq3fpd4i-main-branch-78015d9ec2: 
This CDK deployment requires bootstrap stack version '6', but during the confirmation 
via SSM parameter /cdk-bootstrap/hnb659fds/version the following error occurred: 

AccessDeniedException: User: arn:aws:sts::625250616301:assumed-role/AmplifySSRLoggingRole-f26b1fdc-4587-4de9-8b70-5edeb1846cbe/BuildSession 
is not authorized to perform: ssm:GetParameter on resource: 
arn:aws:ssm:us-west-2:625250616301:parameter/cdk-bootstrap/hnb659fds/version 
because no identity-based policy allows the ssm:GetParameter action
```

## Root Cause

The Amplify app was using an incorrect service role (`AmplifySSRLoggingRole`) that lacked the necessary permissions to:
1. Access SSM parameters required for CDK bootstrap detection
2. Deploy backend resources using AWS CDK
3. Create and manage CloudFormation stacks for backend services

## Solution

### 1. Created Proper Amplify Build Configuration

Added `amplify.yml` to the project root with backend deployment commands:

```yaml
version: 1
backend:
  phases:
    build:
      commands:
        - npm ci --cache .npm --prefer-offline
        - npx ampx pipeline-deploy --branch $AWS_BRANCH --app-id $AWS_APP_ID
frontend:
  phases:
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - .next/cache/**/*
      - .npm/**/*
      - node_modules/**/*
```

### 2. Fixed .gitignore Configuration

Updated `.gitignore` to properly handle Amplify files:

```gitignore
# amplify
.amplify
amplify_outputs*
amplifyconfiguration*
```

This ensures:
- Source code in `amplify/` directory is committed (required for deployment)
- Generated files (`amplify_outputs.json`, etc.) are ignored

### 3. Created New Service Role with Proper Permissions

Using AWS CLI, created a new service role with the required permissions:

```bash
# Create trust policy
cat > /tmp/amplify-trust-policy.json << EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "amplify.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
  --role-name AmplifyBackendDeployRole-twitter \
  --assume-role-policy-document file:///tmp/amplify-trust-policy.json

# Attach the AWS managed policy for Amplify backend deployments
aws iam attach-role-policy \
  --role-name AmplifyBackendDeployRole-twitter \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmplifyBackendDeployFullAccess
```

### 4. Updated Amplify App Configuration

Updated the Amplify app to use the new service role:

```bash
aws amplify update-app \
  --app-id d3o849eq3fpd4i \
  --iam-service-role-arn arn:aws:iam::625250616301:role/AmplifyBackendDeployRole-twitter \
  --region us-west-2
```

## Key Learnings

1. **Amplify Gen 2 requires specific IAM permissions** - The `AmplifyBackendDeployFullAccess` policy contains all necessary permissions for:
   - SSM parameter access (for CDK bootstrap detection)
   - CloudFormation operations (for stack deployment)
   - S3, DynamoDB, Cognito, and other service operations
   - CDK asset management

2. **No manual CDK bootstrap needed** - With the proper service role, Amplify Gen 2 automatically handles CDK bootstrapping

3. **File structure matters** - The `amplify/` directory must be in the repository and properly configured in `.gitignore`

4. **Build configuration is critical** - The `amplify.yml` file must include the backend deployment phase with `npx ampx pipeline-deploy`

## Verification

After applying these fixes:
1. Backend resources are successfully deployed (Cognito, DynamoDB, S3)
2. The `amplify_outputs.json` file is generated with proper configuration
3. The application can connect to all backend services

## References

- [AWS Amplify Gen 2 Documentation](https://docs.amplify.aws/)
- [Troubleshoot CDKToolkit stack issues](https://docs.amplify.aws/react/build-a-backend/troubleshooting/cdktoolkit-stack/)
- [AWS Managed Policies for Amplify](https://docs.aws.amazon.com/amplify/latest/userguide/security-iam-awsmanpol.html)