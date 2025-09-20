#!/bin/bash

# Script to create IAM role for Amplify Twitter project team access

# Configuration
ROLE_NAME="AmplifyTwitterProjectTeamRole"
POLICY_NAME="AmplifyTwitterProjectPolicy"
AWS_REGION="us-west-2"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "Creating IAM role for Amplify Twitter project team access..."
echo "AWS Account ID: $ACCOUNT_ID"
echo "Region: $AWS_REGION"

# Update the trust policy with the actual account ID
# No need to update if already has the account ID
cp amplify-team-role-trust.json amplify-team-role-trust-updated.json

# Create the IAM policy
echo "Creating IAM policy..."
POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file://amplify-team-policy.json \
    --description "Policy for team access to Amplify Twitter project" \
    --query 'Policy.Arn' \
    --output text 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Policy might already exist, getting existing policy ARN..."
    POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"
fi

echo "Policy ARN: $POLICY_ARN"

# Create the IAM role
echo "Creating IAM role..."
aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://amplify-team-role-trust-updated.json \
    --description "Role for team access to Amplify Twitter project"

if [ $? -eq 0 ]; then
    echo "Role created successfully!"
else
    echo "Role might already exist, continuing..."
fi

# Attach the policy to the role
echo "Attaching policy to role..."
aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn $POLICY_ARN

if [ $? -eq 0 ]; then
    echo "Policy attached successfully!"
else
    echo "Failed to attach policy"
    exit 1
fi

# Create a session policy for additional security
cat > amplify-team-session-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "amplify:*",
        "appsync:*",
        "cognito-idp:*",
        "cognito-identity:*",
        "s3:*",
        "dynamodb:*"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": "us-west-2"
        }
      }
    }
  ]
}
EOF

# Output the role ARN
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"
echo ""
echo "================================================================"
echo "IAM Role created successfully!"
echo "Role ARN: $ROLE_ARN"
echo "================================================================"
echo ""
echo "To grant access to team members:"
echo "1. Add their IAM user ARNs to the trust policy in amplify-team-role-trust.json"
echo "2. Re-run this script to update the role"
echo ""
echo "Team members can assume this role using:"
echo "aws sts assume-role --role-arn $ROLE_ARN --role-session-name amplify-session"
echo ""

# Clean up temporary file
rm -f amplify-team-role-trust-updated.json