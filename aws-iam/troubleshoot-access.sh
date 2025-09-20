#!/bin/bash

# Script to troubleshoot IAM user access issues for Amplify project

# Check if username is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./troubleshoot-access.sh <username>"
    echo "Example: ./troubleshoot-access.sh john-doe"
    exit 1
fi

USERNAME=$1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="AmplifyTwitterProjectTeamRole"
USER_ARN="arn:aws:iam::$ACCOUNT_ID:user/$USERNAME"
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

echo "Troubleshooting access for user: $USERNAME"
echo "Account ID: $ACCOUNT_ID"
echo "Region: us-west-2"
echo ""

# Check 1: User exists
echo "1. Checking if user exists..."
aws iam get-user --user-name $USERNAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ User exists"
else
    echo "✗ User not found"
    echo "  → Run: ./create-team-user-with-console.sh $USERNAME"
    exit 1
fi

# Check 2: Access keys
echo ""
echo "2. Checking access keys..."
ACCESS_KEYS=$(aws iam list-access-keys --user-name $USERNAME --query 'AccessKeyMetadata[].AccessKeyId' --output text)
if [ -n "$ACCESS_KEYS" ]; then
    echo "✓ Access keys found: $ACCESS_KEYS"
else
    echo "✗ No access keys found"
    echo "  → Run: aws iam create-access-key --user-name $USERNAME"
fi

# Check 3: Console access
echo ""
echo "3. Checking console access..."
aws iam get-login-profile --user-name $USERNAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Console access enabled"
else
    echo "✗ Console access not configured"
    echo "  → Set password: aws iam create-login-profile --user-name $USERNAME --password 'TempPassword123!' --password-reset-required"
fi

# Check 4: Role exists
echo ""
echo "4. Checking if role exists..."
aws iam get-role --role-name $ROLE_NAME > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✓ Role exists"
else
    echo "✗ Role not found"
    echo "  → Run: ./create-iam-role.sh"
    exit 1
fi

# Check 5: User in trust policy
echo ""
echo "5. Checking if user can assume role..."
TRUST_POLICY=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.AssumeRolePolicyDocument' --output json)

echo "$TRUST_POLICY" | jq -r '.Statement[].Principal.AWS' | grep -q "$USER_ARN\|:root"
if [ $? -eq 0 ]; then
    echo "✓ User is in trust policy"
else
    echo "✗ User not in trust policy"
    echo "  → Run: ./update-user-permissions.sh $USERNAME"
fi

# Check 6: User policies
echo ""
echo "6. Checking user policies..."
echo "Inline policies:"
INLINE_POLICIES=$(aws iam list-user-policies --user-name $USERNAME --query 'PolicyNames[]' --output text)
if [ -n "$INLINE_POLICIES" ]; then
    for POLICY in $INLINE_POLICIES; do
        echo "  - $POLICY"
    done
else
    echo "  None found"
fi

echo "Attached policies:"
ATTACHED_POLICIES=$(aws iam list-attached-user-policies --user-name $USERNAME --query 'AttachedPolicies[].[PolicyName,PolicyArn]' --output text)
if [ -n "$ATTACHED_POLICIES" ]; then
    echo "$ATTACHED_POLICIES" | while read NAME ARN; do
        echo "  - $NAME"
    done
else
    echo "  None found"
fi

# Check 7: Test role assumption
echo ""
echo "7. Testing role assumption..."
echo "Attempting to assume role..."

# Try to assume the role
ASSUME_OUTPUT=$(aws sts assume-role \
    --role-arn $ROLE_ARN \
    --role-session-name test-session \
    --duration-seconds 900 \
    2>&1)

if [ $? -eq 0 ]; then
    echo "✓ Successfully assumed role"
    
    # Extract temporary credentials
    TEMP_ACCESS_KEY=$(echo "$ASSUME_OUTPUT" | jq -r '.Credentials.AccessKeyId')
    TEMP_SECRET_KEY=$(echo "$ASSUME_OUTPUT" | jq -r '.Credentials.SecretAccessKey')
    TEMP_SESSION_TOKEN=$(echo "$ASSUME_OUTPUT" | jq -r '.Credentials.SessionToken')
    
    # Test Amplify access with temporary credentials
    echo ""
    echo "8. Testing Amplify access with assumed role..."
    AWS_ACCESS_KEY_ID=$TEMP_ACCESS_KEY \
    AWS_SECRET_ACCESS_KEY=$TEMP_SECRET_KEY \
    AWS_SESSION_TOKEN=$TEMP_SESSION_TOKEN \
    aws amplify list-apps --region us-west-2 > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        echo "✓ Amplify access successful"
    else
        echo "✗ Amplify access failed"
        echo "  → Check if the role has the correct policies attached"
    fi
else
    echo "✗ Failed to assume role"
    echo "Error: $ASSUME_OUTPUT"
    echo ""
    echo "Common issues:"
    echo "1. User not in trust policy → Run: ./update-user-permissions.sh $USERNAME"
    echo "2. Using wrong credentials → Check AWS CLI configuration"
    echo "3. MFA required → Configure MFA for the user"
fi

# Check 8: Role policies
echo ""
echo "9. Checking role policies..."
ROLE_POLICIES=$(aws iam list-attached-role-policies --role-name $ROLE_NAME --query 'AttachedPolicies[].[PolicyName]' --output text)
if [ -n "$ROLE_POLICIES" ]; then
    echo "Attached to role:"
    echo "$ROLE_POLICIES" | while read POLICY; do
        echo "  - $POLICY"
    done
else
    echo "✗ No policies attached to role"
    echo "  → Run: ./create-iam-role.sh to recreate role with policies"
fi

# Generate fix command
echo ""
echo "================================================================"
echo "Summary and Recommendations:"
echo "================================================================"

if [ -n "$INLINE_POLICIES" ] || [ -n "$ATTACHED_POLICIES" ]; then
    if echo "$TRUST_POLICY" | jq -r '.Statement[].Principal.AWS' | grep -q "$USER_ARN\|:root"; then
        echo "User setup looks correct. Try:"
        echo ""
        echo "1. Have the user run:"
        echo "   aws configure --profile amplify-twitter"
        echo "   # Enter their Access Key ID and Secret Access Key"
        echo ""
        echo "2. Test with:"
        echo "   aws --profile amplify-twitter sts assume-role --role-arn $ROLE_ARN --role-session-name test"
        echo ""
        echo "3. For Amplify CLI:"
        echo "   export AWS_PROFILE=amplify-twitter"
        echo "   amplify status"
    else
        echo "User needs to be added to trust policy:"
        echo "→ Run: ./update-user-permissions.sh $USERNAME"
    fi
else
    echo "User needs permissions setup:"
    echo "→ Run: ./update-user-permissions.sh $USERNAME"
fi

echo ""
echo "For console access issues:"
echo "1. Ensure user logs in to: https://$ACCOUNT_ID.signin.aws.amazon.com/console"
echo "2. After login, switch role to: $ROLE_NAME"
echo "3. Set region to: us-west-2"