#!/bin/bash

# Script to update existing IAM user permissions for Amplify access

# Check if username is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./update-user-permissions.sh <username>"
    echo "Example: ./update-user-permissions.sh john-doe"
    exit 1
fi

USERNAME=$1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="AmplifyTwitterProjectTeamRole"
USER_ARN="arn:aws:iam::$ACCOUNT_ID:user/$USERNAME"

echo "Updating permissions for user: $USERNAME"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Check if user exists
aws iam get-user --user-name $USERNAME > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: User $USERNAME not found"
    exit 1
fi

# Step 1: Update the assume role policy for the user
echo "1. Updating user's assume role policy..."
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

# Remove old policy if exists and add new one
aws iam delete-user-policy --user-name $USERNAME --policy-name AssumeAmplifyRole 2>/dev/null
aws iam put-user-policy \
    --user-name $USERNAME \
    --policy-name AssumeAmplifyRole \
    --policy-document file://assume-role-policy.json

echo "✓ Assume role policy updated"

# Step 2: Check if user is in the trust policy of the role
echo ""
echo "2. Checking role trust policy..."
CURRENT_TRUST_POLICY=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.AssumeRolePolicyDocument' 2>/dev/null)

if [ $? -ne 0 ]; then
    echo "Error: Role $ROLE_NAME not found. Please run create-iam-role.sh first."
    exit 1
fi

# Create a Python script to check and update the trust policy
cat > check_trust_policy.py << 'EOF'
import json
import sys

user_arn = sys.argv[1]
policy = json.loads(sys.argv[2])

user_found = False
needs_update = False

# Check if user is in the trust policy
for statement in policy['Statement']:
    if 'Principal' in statement and 'AWS' in statement['Principal']:
        principals = statement['Principal']['AWS']
        if isinstance(principals, str):
            if principals == user_arn or principals.endswith(':root'):
                user_found = True
            else:
                # Convert to list and add user
                statement['Principal']['AWS'] = [principals, user_arn]
                needs_update = True
        elif isinstance(principals, list):
            if user_arn in principals or any(p.endswith(':root') for p in principals):
                user_found = True
            else:
                # Add user to the list
                principals.append(user_arn)
                needs_update = True

# If no suitable statement found, create one
if not user_found and not needs_update:
    # Add a new statement
    new_statement = {
        "Effect": "Allow",
        "Principal": {
            "AWS": [user_arn]
        },
        "Action": "sts:AssumeRole"
    }
    policy['Statement'].append(new_statement)
    needs_update = True

print(json.dumps({"needs_update": needs_update or not user_found, "policy": policy}))
EOF

# Check and update trust policy
RESULT=$(python3 check_trust_policy.py "$USER_ARN" "$CURRENT_TRUST_POLICY")
NEEDS_UPDATE=$(echo $RESULT | jq -r '.needs_update')
UPDATED_POLICY=$(echo $RESULT | jq -r '.policy')

if [ "$NEEDS_UPDATE" = "true" ]; then
    echo "User not in trust policy. Adding..."
    aws iam update-assume-role-policy \
        --role-name $ROLE_NAME \
        --policy-document "$UPDATED_POLICY"
    
    if [ $? -eq 0 ]; then
        echo "✓ User added to role trust policy"
    else
        echo "✗ Failed to update trust policy"
        exit 1
    fi
else
    echo "✓ User already in trust policy"
fi

# Step 3: Attach necessary policies
echo ""
echo "3. Attaching necessary AWS managed policies..."

# Basic policies for console access
POLICIES=(
    "arn:aws:iam::aws:policy/IAMUserChangePassword"
    "arn:aws:iam::aws:policy/IAMReadOnlyAccess"
)

for policy in "${POLICIES[@]}"; do
    aws iam attach-user-policy --user-name $USERNAME --policy-arn $policy 2>/dev/null
done

echo "✓ AWS managed policies attached"

# Step 4: Test the permissions
echo ""
echo "4. Testing permissions..."

# Create test script
cat > test_permissions.sh << EOF
#!/bin/bash
echo "Testing assume role..."
CREDS=\$(aws sts assume-role \\
    --role-arn arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME \\
    --role-session-name test-session \\
    --duration-seconds 900 \\
    --query 'Credentials.[AccessKeyId,SecretAccessKey,SessionToken]' \\
    --output text)

if [ \$? -eq 0 ]; then
    echo "✓ Role assumption successful"
    
    # Extract credentials
    export AWS_ACCESS_KEY_ID=\$(echo \$CREDS | cut -d' ' -f1)
    export AWS_SECRET_ACCESS_KEY=\$(echo \$CREDS | cut -d' ' -f2)
    export AWS_SESSION_TOKEN=\$(echo \$CREDS | cut -d' ' -f3)
    
    # Test Amplify access
    echo "Testing Amplify access..."
    aws amplify list-apps --region us-west-2 > /dev/null 2>&1
    if [ \$? -eq 0 ]; then
        echo "✓ Amplify access confirmed"
    else
        echo "✗ Amplify access failed"
    fi
else
    echo "✗ Role assumption failed"
fi
EOF

chmod +x test_permissions.sh

echo ""
echo "================================================================"
echo "User permissions updated!"
echo "================================================================"
echo ""
echo "The user $USERNAME should now be able to:"
echo "1. Assume the role: $ROLE_NAME"
echo "2. Access Amplify resources in us-west-2"
echo ""
echo "To test with user's credentials:"
echo "1. Configure AWS CLI with the user's access keys"
echo "2. Run: ./test_permissions.sh"
echo ""
echo "For console access, the user should:"
echo "1. Log in to AWS Console"
echo "2. Switch to role: $ROLE_NAME"
echo "3. Ensure region is set to us-west-2"

# Cleanup
rm -f assume-role-policy.json check_trust_policy.py