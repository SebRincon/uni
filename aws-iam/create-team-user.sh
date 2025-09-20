#!/bin/bash

# Script to create a new IAM user for Amplify Twitter project team access

# Check if username is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./create-team-user.sh <username>"
    echo "Example: ./create-team-user.sh john-doe"
    exit 1
fi

USERNAME=$1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="AmplifyTwitterProjectTeamRole"

echo "Creating IAM user: $USERNAME"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Create the IAM user
echo "1. Creating IAM user..."
aws iam create-user --user-name $USERNAME

if [ $? -ne 0 ]; then
    echo "Failed to create user. User might already exist."
    exit 1
fi

# Create access keys for the user
echo ""
echo "2. Creating access keys..."
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name $USERNAME)

if [ $? -ne 0 ]; then
    echo "Failed to create access keys."
    exit 1
fi

# Extract access key details
ACCESS_KEY_ID=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.AccessKeyId')
SECRET_ACCESS_KEY=$(echo $ACCESS_KEY_OUTPUT | jq -r '.AccessKey.SecretAccessKey')

# Create a basic policy for CLI access
echo ""
echo "3. Attaching basic IAM permissions..."
aws iam attach-user-policy \
    --user-name $USERNAME \
    --policy-arn arn:aws:iam::aws:policy/IAMUserChangePassword

# Update the trust policy to include the new user
echo ""
echo "4. Updating role trust policy..."
USER_ARN="arn:aws:iam::$ACCOUNT_ID:user/$USERNAME"

# Read the current trust policy
CURRENT_TRUST_POLICY=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.AssumeRolePolicyDocument' 2>/dev/null)

if [ $? -eq 0 ]; then
    # Update the trust policy to add the new user
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

# Create user credentials file
echo ""
echo "5. Creating credentials file..."
cat > ${USERNAME}-credentials.txt << EOF
AWS Amplify Twitter Project Access Credentials
=============================================

Username: $USERNAME
Access Key ID: $ACCESS_KEY_ID
Secret Access Key: $SECRET_ACCESS_KEY
Account ID: $ACCOUNT_ID
Region: us-west-2

Role to Assume: arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME

Quick Setup Commands:
--------------------

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
echo "User created successfully!"
echo "================================================================"
echo ""
echo "Credentials saved to: ${USERNAME}-credentials.txt"
echo ""
echo "IMPORTANT NEXT STEPS:"
echo "1. Send ${USERNAME}-credentials.txt to the user securely"
echo "2. Tell them to change their password on first login"
echo "3. Delete the credentials file after sending"
echo ""
echo "The user can now assume the role: $ROLE_NAME"
echo ""

# Optional: Create a user-specific README
cat > ${USERNAME}-README.md << EOF
# Welcome to the AWS Amplify Twitter Project

## Your Access Details
- **Username**: $USERNAME
- **Account ID**: $ACCOUNT_ID
- **Default Region**: us-west-2
- **Role**: AmplifyTwitterProjectTeamRole

## First Time Setup

1. **Install AWS CLI** (if not already installed):
   - macOS: \`brew install awscli\`
   - Windows: Download from AWS website
   - Linux: \`pip install awscli\`

2. **Configure AWS CLI**:
   \`\`\`bash
   aws configure
   \`\`\`
   Use the credentials provided in your credentials file.

3. **Set up the Amplify profile** in ~/.aws/config:
   \`\`\`ini
   [profile amplify-twitter]
   role_arn = arn:aws:iam::$ACCOUNT_ID:role/AmplifyTwitterProjectTeamRole
   source_profile = default
   region = us-west-2
   \`\`\`

4. **Test your access**:
   \`\`\`bash
   aws --profile amplify-twitter amplify list-apps
   \`\`\`

## Working with the Project

### Clone the repository
\`\`\`bash
git clone <repository-url>
cd twitter
\`\`\`

### Use Amplify CLI
\`\`\`bash
export AWS_PROFILE=amplify-twitter
amplify status
\`\`\`

### Access Resources
- **Amplify Console**: https://us-west-2.console.aws.amazon.com/amplify/
- **AppSync Console**: https://us-west-2.console.aws.amazon.com/appsync/
- **Cognito Console**: https://us-west-2.console.aws.amazon.com/cognito/

## Need Help?
Contact your project administrator if you have any issues.
EOF

echo "User guide created: ${USERNAME}-README.md"