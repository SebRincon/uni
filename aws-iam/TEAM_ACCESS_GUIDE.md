# AWS IAM Team Access Guide for Amplify Twitter Project

This guide explains how to set up and grant team members access to the AWS Amplify Twitter project in the us-west-2 region.

## Project Details
- **Region**: us-west-2
- **Cognito User Pool ID**: us-west-2_atAWOdqhH
- **Identity Pool ID**: us-west-2:02afa118-2c79-4895-8598-452750e7e5e4
- **AppSync API URL**: https://jpxqzk7w5fef7f57nhxyopgbae.appsync-api.us-west-2.amazonaws.com/graphql
- **S3 Bucket**: amplify-d3o849eq3fpd4i-ma-twitterclonemediabucket8-jx8tlzkfwzr3

## For Project Administrators

### Initial Setup

1. **Create the IAM role and policy**:
   ```bash
   cd aws-iam
   ./create-iam-role.sh
   ```

2. **Add team members to the trust policy**:
   - Edit `amplify-team-role-trust.json`
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID
   - Add user ARNs in the format: `arn:aws:iam::ACCOUNT_ID:user/USERNAME`
   - Re-run the setup script to update the role

### Granting Access to New Team Members

1. Create an IAM user for the team member (if not exists):
   ```bash
   aws iam create-user --user-name TEAM_MEMBER_NAME
   aws iam create-access-key --user-name TEAM_MEMBER_NAME
   ```

2. Add their ARN to `amplify-team-role-trust.json`:
   ```json
   "arn:aws:iam::YOUR_ACCOUNT_ID:user/TEAM_MEMBER_NAME"
   ```

3. Update the role:
   ```bash
   ./create-iam-role.sh
   ```

## For Team Members

### Prerequisites
- AWS CLI installed and configured
- Access keys from your administrator

### Assuming the Role

1. **Configure AWS CLI** (if not already done):
   ```bash
   aws configure
   ```

2. **Assume the team role**:
   ```bash
   aws sts assume-role \
     --role-arn arn:aws:iam::ACCOUNT_ID:role/AmplifyTwitterProjectTeamRole \
     --role-session-name my-amplify-session
   ```

3. **Export the temporary credentials**:
   ```bash
   export AWS_ACCESS_KEY_ID=<AccessKeyId from assume-role output>
   export AWS_SECRET_ACCESS_KEY=<SecretAccessKey from assume-role output>
   export AWS_SESSION_TOKEN=<SessionToken from assume-role output>
   ```

### Using AWS CLI Profile (Recommended)

Add this to your `~/.aws/config`:

```ini
[profile amplify-twitter]
role_arn = arn:aws:iam::ACCOUNT_ID:role/AmplifyTwitterProjectTeamRole
source_profile = default
region = us-west-2
```

Then use:
```bash
aws --profile amplify-twitter amplify list-apps
```

### Working with Amplify CLI

1. **Pull the existing project**:
   ```bash
   amplify pull --appId YOUR_APP_ID --envName YOUR_ENV_NAME
   ```

2. **Use the profile**:
   ```bash
   export AWS_PROFILE=amplify-twitter
   amplify status
   ```

## Permissions Included

The role grants access to:
- **Amplify**: Full access to the Amplify app and backend
- **Cognito**: User management and authentication
- **AppSync**: GraphQL API operations
- **S3**: Media storage bucket access
- **DynamoDB**: Database operations
- **CloudFormation**: Stack management
- **Lambda**: Function execution
- **CloudWatch**: Logs access

## Security Best Practices

1. **Rotate credentials regularly**
2. **Use MFA when possible**
3. **Only assume the role when needed**
4. **Monitor CloudTrail for activity**
5. **Review permissions quarterly**

## Troubleshooting

### "Access Denied" errors
- Verify your user is listed in the trust policy
- Check if the role was updated after adding your user
- Ensure you're using the correct region (us-west-2)

### "Invalid credentials" errors
- Check if your session has expired (default: 1 hour)
- Re-assume the role to get new credentials

### Can't see Amplify resources
- Verify you're in the us-west-2 region
- Check if the resources exist in the AWS console

## Support

For issues or questions:
1. Check CloudTrail logs for detailed error information
2. Contact the project administrator
3. Review IAM policies for missing permissions