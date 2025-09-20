# AWS Console Access Guide for kishanyern1

## First Time Login

1. **Go to AWS Console**: https://625250616301.signin.aws.amazon.com/console
2. **Enter credentials**:
   - Username: kishanyern1
   - Password: (provided separately)
3. **Change your password** when prompted

## Accessing Amplify Resources

After logging in, you need to switch to the Amplify project role:

### Method 1: Quick Switch
1. Click your username (top right corner)
2. Click "Switch role"
3. Enter:
   - **Account**: 625250616301
   - **Role**: AmplifyTwitterProjectTeamRole
   - **Display Name**: Amplify Twitter (optional)
   - **Color**: Any color you prefer
4. Click "Switch Role"

### Method 2: Direct Link
Bookmark this link for quick access:
https://signin.aws.amazon.com/switchrole?account=625250616301&roleName=AmplifyTwitterProjectTeamRole&displayName=Amplify%20Twitter

## What You Can Access

Once you've switched roles, you can access:

- **Amplify App**: View builds, deployments, backend environments
- **AppSync**: GraphQL API, schemas, resolvers
- **Cognito**: User pools, identity pools, user management
- **DynamoDB**: Tables, items, queries
- **S3**: Media storage bucket
- **CloudWatch**: Logs, metrics
- **Lambda**: Functions (if any)

## Navigation Tips

### To view the Amplify app:
1. Make sure you're in **us-west-2** region (top right)
2. Search for "Amplify" in the services search
3. You should see the Twitter project

### To manage users:
1. Go to Cognito service
2. Select "User pools"
3. Find the Twitter app user pool

### To view data:
1. Go to DynamoDB service
2. Select "Tables"
3. Browse the Twitter app tables

## Troubleshooting

**"Access Denied" error?**
- Make sure you've switched to the role
- Check you're in us-west-2 region
- The role indicator should show in the top bar

**Can't find resources?**
- Verify region is us-west-2
- Ensure you've switched roles
- Some resources might be in global scope

## Logging Out

When done:
1. Click your role name (top right)
2. Click "Switch back"
3. Or just sign out completely

## Security Reminder

- Always sign out when done
- Don't share your password
- Enable MFA for extra security
