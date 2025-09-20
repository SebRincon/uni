#!/bin/bash

# Script to delete an IAM user and remove them from the Amplify project

# Check if username is provided
if [ $# -eq 0 ]; then
    echo "Usage: ./delete-user.sh <username>"
    echo "Example: ./delete-user.sh john-doe"
    exit 1
fi

USERNAME=$1
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
ROLE_NAME="AmplifyTwitterProjectTeamRole"
USER_ARN="arn:aws:iam::$ACCOUNT_ID:user/$USERNAME"

echo "Preparing to delete user: $USERNAME"
echo "AWS Account ID: $ACCOUNT_ID"
echo ""

# Check if user exists
aws iam get-user --user-name $USERNAME > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: User $USERNAME not found"
    exit 1
fi

# Confirm deletion
echo "WARNING: This will permanently delete the IAM user and all their access."
echo "Are you sure you want to delete user: $USERNAME? (yes/no)"
read -r CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Deletion cancelled."
    exit 0
fi

echo ""
echo "Starting deletion process..."

# Step 1: Remove user from role trust policy
echo ""
echo "1. Removing user from role trust policy..."

CURRENT_TRUST_POLICY=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.AssumeRolePolicyDocument' 2>/dev/null)

if [ $? -eq 0 ]; then
    # Create Python script to remove user from trust policy
    cat > remove_from_trust_policy.py << 'EOF'
import json
import sys

user_arn = sys.argv[1]
policy = json.loads(sys.argv[2])

modified = False

# Remove user from trust policy
for statement in policy['Statement']:
    if 'Principal' in statement and 'AWS' in statement['Principal']:
        principals = statement['Principal']['AWS']
        if isinstance(principals, str):
            if principals == user_arn:
                # Remove the entire statement if it only contains this user
                policy['Statement'].remove(statement)
                modified = True
        elif isinstance(principals, list):
            if user_arn in principals:
                principals.remove(user_arn)
                modified = True
                # If list is now empty, remove the statement
                if len(principals) == 0:
                    policy['Statement'].remove(statement)

print(json.dumps({"modified": modified, "policy": policy}))
EOF

    # Remove from trust policy
    RESULT=$(python3 remove_from_trust_policy.py "$USER_ARN" "$CURRENT_TRUST_POLICY")
    MODIFIED=$(echo $RESULT | jq -r '.modified')
    UPDATED_POLICY=$(echo $RESULT | jq -r '.policy')

    if [ "$MODIFIED" = "true" ]; then
        aws iam update-assume-role-policy \
            --role-name $ROLE_NAME \
            --policy-document "$UPDATED_POLICY"
        
        if [ $? -eq 0 ]; then
            echo "✓ User removed from role trust policy"
        else
            echo "✗ Failed to update trust policy"
        fi
    else
        echo "✓ User not in trust policy"
    fi
    
    rm -f remove_from_trust_policy.py
fi

# Step 2: Delete access keys
echo ""
echo "2. Deleting access keys..."

ACCESS_KEYS=$(aws iam list-access-keys --user-name $USERNAME --query 'AccessKeyMetadata[].AccessKeyId' --output text)

if [ -n "$ACCESS_KEYS" ]; then
    for KEY in $ACCESS_KEYS; do
        aws iam delete-access-key --user-name $USERNAME --access-key-id $KEY
        echo "✓ Deleted access key: $KEY"
    done
else
    echo "✓ No access keys found"
fi

# Step 3: Delete login profile (console access)
echo ""
echo "3. Deleting console login profile..."

aws iam delete-login-profile --user-name $USERNAME 2>/dev/null
if [ $? -eq 0 ]; then
    echo "✓ Console access removed"
else
    echo "✓ No console access configured"
fi

# Step 4: Delete inline policies
echo ""
echo "4. Deleting inline policies..."

INLINE_POLICIES=$(aws iam list-user-policies --user-name $USERNAME --query 'PolicyNames[]' --output text)

if [ -n "$INLINE_POLICIES" ]; then
    for POLICY in $INLINE_POLICIES; do
        aws iam delete-user-policy --user-name $USERNAME --policy-name $POLICY
        echo "✓ Deleted inline policy: $POLICY"
    done
else
    echo "✓ No inline policies found"
fi

# Step 5: Detach managed policies
echo ""
echo "5. Detaching managed policies..."

ATTACHED_POLICIES=$(aws iam list-attached-user-policies --user-name $USERNAME --query 'AttachedPolicies[].PolicyArn' --output text)

if [ -n "$ATTACHED_POLICIES" ]; then
    for POLICY_ARN in $ATTACHED_POLICIES; do
        aws iam detach-user-policy --user-name $USERNAME --policy-arn $POLICY_ARN
        echo "✓ Detached policy: $POLICY_ARN"
    done
else
    echo "✓ No attached policies found"
fi

# Step 6: Remove from groups
echo ""
echo "6. Removing from groups..."

GROUPS=$(aws iam list-groups-for-user --user-name $USERNAME --query 'Groups[].GroupName' --output text)

if [ -n "$GROUPS" ]; then
    for GROUP in $GROUPS; do
        aws iam remove-user-from-group --user-name $USERNAME --group-name $GROUP
        echo "✓ Removed from group: $GROUP"
    done
else
    echo "✓ Not a member of any groups"
fi

# Step 7: Delete MFA devices
echo ""
echo "7. Checking for MFA devices..."

MFA_DEVICES=$(aws iam list-mfa-devices --user-name $USERNAME --query 'MFADevices[].SerialNumber' --output text)

if [ -n "$MFA_DEVICES" ]; then
    for MFA_SERIAL in $MFA_DEVICES; do
        aws iam deactivate-mfa-device --user-name $USERNAME --serial-number $MFA_SERIAL
        aws iam delete-virtual-mfa-device --serial-number $MFA_SERIAL 2>/dev/null
        echo "✓ Removed MFA device: $MFA_SERIAL"
    done
else
    echo "✓ No MFA devices found"
fi

# Step 8: Delete the user
echo ""
echo "8. Deleting the user..."

aws iam delete-user --user-name $USERNAME

if [ $? -eq 0 ]; then
    echo "✓ User deleted successfully"
else
    echo "✗ Failed to delete user"
    exit 1
fi

# Step 9: Clean up any credential files
echo ""
echo "9. Cleaning up local files..."

if [ -f "${USERNAME}-credentials.txt" ]; then
    rm -f "${USERNAME}-credentials.txt"
    echo "✓ Removed credentials file"
fi

if [ -f "${USERNAME}-README.md" ]; then
    rm -f "${USERNAME}-README.md"
    echo "✓ Removed README file"
fi

if [ -f "${USERNAME}-console-guide.md" ]; then
    rm -f "${USERNAME}-console-guide.md"
    echo "✓ Removed console guide file"
fi

echo ""
echo "================================================================"
echo "User $USERNAME has been completely deleted!"
echo "================================================================"
echo ""
echo "All the following have been removed:"
echo "- IAM user account"
echo "- Access keys"
echo "- Console login"
echo "- Policies and permissions"
echo "- Role trust relationship"
echo "- Local credential files"