#!/bin/bash

# Script to create a new IAM user with both programmatic and console access

# Check if username is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./create-team-user-with-console.sh <username>"
    echo "Example: ./create-team-user-with-console.sh john-doe"
    exit 1
fi

USERNAME=$1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="AmplifyTwitterProjectTeamRole"

# Generate a random password
generate_password() {
    echo $(openssl rand -base64 12 | tr -d "=+/" | cut -c1-16)
}

TEMP_PASSWORD=$(generate_password)

echo "Creating IAM user with console access: $USERNAME"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Create the IAM user
echo "1. Creating IAM user..."
aws iam create-user --user-name $USERNAME

if [ $? -ne 0 ]; then
    echo "Failed to create user. User might already exist."
    exit 1
fi

# Create login profile (console access)
echo ""
echo "2. Creating console login profile..."
aws iam create-login-profile \
    --user-name $USERNAME \
    --password "$TEMP_PASSWORD" \
    --password-reset-required

if [ $? -ne 0 ]; then
    echo "Failed to create login profile."
    exit 1
fi

# Create access keys for programmatic access
echo ""
echo "3. Creating access keys for CLI/SDK access..."
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $USERNAME)

if [ $? -ne 0 ]; then
    echo "Failed to create access keys."
    exit 1
fi

# Extract access key details
ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

# Create a policy for console access to assume the role
echo ""
echo "4. Creating inline policy for role assumption..."
cat > assume-role-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "sts:AssumeRole"
            ],
            "Resource": "arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
        },
        {
            "Effect": "Allow",
            "Action": [
                "iam:GetRole",
                "iam:ListRoles",
                "iam:GetUser"
            ],
            "Resource": "*"
        }
    ]
}
EOF

# Attach the inline policy
aws iam put-user-policy \
    --user-name $USERNAME \
    --policy-name AssumeAmplifyRole \
    --policy-document file://assume-role-policy.json

# Clean up temporary file
rm -f assume-role-policy.json

# Attach basic permissions
echo ""
echo "5. Attaching basic IAM permissions..."
aws iam attach-user-policy \
    --user-name $USERNAME \
    --policy-arn arn:aws:iam::aws:policy/IAMUserChangePassword

aws iam attach-user-policy \
    --user-name $USERNAME \
    --policy-arn arn:aws:iam::aws:policy/IAMReadOnlyAccess

# Update the trust policy to include the new user
echo ""
echo "6. Updating role trust policy..."
USER_ARN="arn:aws:iam::$ACCOUNT_ID:user/$USERNAME"

# Read the current trust policy
CURRENT_TRUST_POLICY=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.AssumeRolePolicyDocument' 2>/dev/null)

if [ $? -eq 0 ]; then
    echo "Adding user to role trust policy..."
    
    # Create a Python script to update the JSON
    cat > update_trust_policy.py << 'EOF'
import json
import sys

user_arn = sys.argv[1]
policy = json.loads(sys.argv[2])

# Find the statement that allows specific users
for statement in policy['Statement']:
    if 'Principal' in statement and 'AWS' in statement['Principal']:
        if isinstance(statement['Principal']['AWS'], list):
            if user_arn not in statement['Principal']['AWS']:
                statement['Principal']['AWS'].append(user_arn)
        elif isinstance(statement['Principal']['AWS'], str):
            # Convert to list if it's a single string
            if statement['Principal']['AWS'] != user_arn:
                statement['Principal']['AWS'] = [statement['Principal']['AWS'], user_arn]

print(json.dumps(policy, indent=2))
EOF

    # Update the trust policy
    UPDATED_POLICY=$(python3 update_trust_policy.py "$USER_ARN" "$CURRENT_TRUST_POLICY")
    
    # Apply the updated trust policy
    aws iam update-assume-role-policy \
        --role-name $ROLE_NAME \
        --policy-document "$UPDATED_POLICY"
    
    if [ $? -eq 0 ]; then
        echo "User added to role trust policy successfully!"
    else
        echo "Warning: Failed to add user to role trust policy. You may need to do this manually."
    fi
    
    # Clean up
    rm -f update_trust_policy.py
else
    echo "Warning: Role not found. Please run create-iam-role.sh first."
fi

# Get the console sign-in URL
SIGNIN_URL="https://${ACCOUNT_ID}.signin.aws.amazon.com/console"

# Create user credentials file
echo ""
echo "7. Creating credentials file..."
cat > ${USERNAME}-credentials.txt << EOF
AWS Amplify Twitter Project Access Credentials
=============================================

=== CONSOLE ACCESS ===
Sign-in URL: $SIGNIN_URL
Username: $USERNAME
Temporary Password: $TEMP_PASSWORD
(You must change this password on first login)

=== PROGRAMMATIC ACCESS (CLI/SDK) ===
Access Key ID: $ACCESS_KEY_ID
Secret Access Key: $SECRET_ACCESS_KEY

=== PROJECT DETAILS ===
Account ID: $ACCOUNT_ID
Region: us-west-2
Role to Assume: arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME

=== CONSOLE INSTRUCTIONS ===
1. Go to: $SIGNIN_URL
2. Sign in with username and temporary password
3. Change your password when prompted
4. To access Amplify resources:
   a. Click your username (top right) → "Switch role"
   b. Account: $ACCOUNT_ID
   c. Role: $ROLE_NAME
   d. Display Name: Amplify Twitter (optional)
   e. Color: Choose any (optional)
   f. Click "Switch Role"

=== QUICK LINKS (after switching role) ===
Amplify Console: https://us-west-2.console.aws.amazon.com/amplify/
AppSync Console: https://us-west-2.console.aws.amazon.com/appsync/
Cognito Console: https://us-west-2.console.aws.amazon.com/cognito/
S3 Console: https://s3.console.aws.amazon.com/s3/
DynamoDB Console: https://us-west-2.console.aws.amazon.com/dynamodbv2/

=== CLI SETUP ===
1. Configure AWS CLI:
   aws configure
   # Enter the Access Key ID and Secret Access Key above
   # Set default region to: us-west-2
   # Set output format to: json

2. Add to ~/.aws/config:
   [profile amplify-twitter]
   role_arn = arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME
   source_profile = default
   region = us-west-2

3. Test access:
   aws --profile amplify-twitter amplify list-apps

IMPORTANT: Keep these credentials secure! This is the only time they will be shown.
EOF

# Set permissions on credentials file
chmod 600 ${USERNAME}-credentials.txt

echo ""
echo "================================================================"
echo "User created successfully with console access!"
echo "================================================================"
echo ""
echo "Credentials saved to: ${USERNAME}-credentials.txt"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Send ${USERNAME}-credentials.txt to the user securely"
echo "2. Tell them to sign in and change their password"
echo "3. Show them how to switch roles in the console"
echo "4. Delete the credentials file after sending"
echo ""

# Create a visual guide for console access
cat > ${USERNAME}-console-guide.md << EOF
# AWS Console Access Guide for $USERNAME

## First Time Login

1. **Go to AWS Console**: $SIGNIN_URL
2. **Enter credentials**:
   - Username: $USERNAME
   - Password: (provided separately)
3. **Change your password** when prompted

## Accessing Amplify Resources

After logging in, you need to switch to the Amplify project role:

### Method 1: Quick Switch
1. Click your username (top right corner)
2. Click "Switch role"
3. Enter:
   - **Account**: $ACCOUNT_ID
   - **Role**: $ROLE_NAME
   - **Display Name**: Amplify Twitter (optional)
   - **Color**: Any color you prefer
4. Click "Switch Role"

### Method 2: Direct Link
Bookmark this link for quick access:
https://signin.aws.amazon.com/switchrole?account=$ACCOUNT_ID&roleName=$ROLE_NAME&displayName=Amplify%20Twitter

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
EOF

echo "Console guide created: ${USERNAME}-console-guide.md"
echo ""
echo "The user can now:"
echo "1. Sign in to AWS Console at: $SIGNIN_URL"
echo "2. Switch to role: $ROLE_NAME"
echo "3. Access all Amplify resources in us-west-2"