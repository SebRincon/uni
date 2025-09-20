# Setup Guide for kishanyern1

## Your AWS Access is Ready!

Your IAM user has been created and configured to access the Amplify Twitter project.

## Console Access (Web Browser)

1. **Sign in to AWS Console**:
   - URL: https://625250616301.signin.aws.amazon.com/console
   - Username: kishanyern1
   - Password: (provided separately)

2. **Switch to the Amplify Project Role**:
   - After logging in, click your username (top right corner)
   - Click "Switch role"
   - Enter:
     - Account: 625250616301
     - Role: AmplifyTwitterProjectTeamRole
     - Display Name: Amplify Twitter (optional)
     - Color: Choose any color
   - Click "Switch Role"

3. **Access Amplify**:
   - Make sure region is set to **us-west-2** (top right corner)
   - Go to AWS Amplify service
   - You should see the Twitter project

## CLI Access (Command Line)

### First Time Setup

1. **Configure AWS CLI with your credentials**:
   ```bash
   aws configure
   ```
   Enter:
   - AWS Access Key ID: (from your credentials file)
   - AWS Secret Access Key: (from your credentials file)
   - Default region: us-west-2
   - Output format: json

2. **Add Amplify profile to ~/.aws/config**:
   ```ini
   [profile amplify-twitter]
   role_arn = arn:aws:iam::625250616301:role/AmplifyTwitterProjectTeamRole
   source_profile = default
   region = us-west-2
   ```

3. **Test your access**:
   ```bash
   # Test role assumption
   aws --profile amplify-twitter sts get-caller-identity
   
   # List Amplify apps
   aws --profile amplify-twitter amplify list-apps
   ```

### Working with the Project

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd twitter
   ```

2. **Use Amplify CLI with your profile**:
   ```bash
   export AWS_PROFILE=amplify-twitter
   amplify status
   ```

## Quick Links (After Switching Role)

- Amplify: https://us-west-2.console.aws.amazon.com/amplify/
- AppSync: https://us-west-2.console.aws.amazon.com/appsync/
- Cognito: https://us-west-2.console.aws.amazon.com/cognito/
- DynamoDB: https://us-west-2.console.aws.amazon.com/dynamodbv2/
- S3: https://s3.console.aws.amazon.com/s3/

## Troubleshooting

### "Access Denied" in Console?
- Make sure you've switched to the role
- Check that region is us-west-2
- The top bar should show "AmplifyTwitterProjectTeamRole"

### "Access Denied" in CLI?
- Make sure you're using the amplify-twitter profile
- Your ~/.aws/config should have the profile configured
- Test with: `aws --profile amplify-twitter sts get-caller-identity`

### Can't find the Amplify app?
- Ensure region is us-west-2
- Make sure you've switched roles
- Look for an app named "twitter" or similar

## Important Notes

- Always use the `amplify-twitter` profile when working with this project
- Your direct user permissions are limited - you must assume the role
- The role provides full access to Amplify resources in us-west-2 only