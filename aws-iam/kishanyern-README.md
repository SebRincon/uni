# Welcome to the AWS Amplify Twitter Project

## Your Access Details
- **Username**: kishanyern
- **Account ID**: 625250616301
- **Default Region**: us-west-2
- **Role**: AmplifyTwitterProjectTeamRole

## First Time Setup

1. **Install AWS CLI** (if not already installed):
   - macOS: `brew install awscli`
   - Windows: Download from AWS website
   - Linux: `pip install awscli`

2. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Use the credentials provided in your credentials file.

3. **Set up the Amplify profile** in ~/.aws/config:
   ```ini
   [profile amplify-twitter]
   role_arn = arn:aws:iam::625250616301:role/AmplifyTwitterProjectTeamRole
   source_profile = default
   region = us-west-2
   ```

4. **Test your access**:
   ```bash
   aws --profile amplify-twitter amplify list-apps
   ```

## Working with the Project

### Clone the repository
```bash
git clone <repository-url>
cd twitter
```

### Use Amplify CLI
```bash
export AWS_PROFILE=amplify-twitter
amplify status
```

### Access Resources
- **Amplify Console**: https://us-west-2.console.aws.amazon.com/amplify/
- **AppSync Console**: https://us-west-2.console.aws.amazon.com/appsync/
- **Cognito Console**: https://us-west-2.console.aws.amazon.com/cognito/

## Need Help?
Contact your project administrator if you have any issues.
