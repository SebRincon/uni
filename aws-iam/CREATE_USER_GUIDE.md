# Creating New IAM Users for Amplify Twitter Project

## Quick Method - Using the Script

```bash
cd aws-iam
./create-team-user.sh username-here
```

This script will:
1. Create the IAM user
2. Generate access keys
3. Add the user to the role trust policy
4. Create credential files for the user

## Manual Method - Step by Step

### 1. Create the IAM User

```bash
# Create user
aws iam create-user --user-name john-doe

# Create access keys
aws iam create-access-key --user-name john-doe
```

Save the output - it contains the Access Key ID and Secret Access Key.

### 2. Update the Trust Policy

Edit `amplify-team-role-trust.json` and add the new user ARN:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": [
          "arn:aws:iam::YOUR_ACCOUNT_ID:user/john-doe"
        ]
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 3. Update the Role

```bash
# Get your account ID
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Update the role with new trust policy
aws iam update-assume-role-policy \
  --role-name AmplifyTwitterProjectTeamRole \
  --policy-document file://amplify-team-role-trust.json
```

### 4. Give User Basic Permissions

```bash
# Allow user to change their password
aws iam attach-user-policy \
  --user-name john-doe \
  --policy-arn arn:aws:iam::aws:policy/IAMUserChangePassword
```

## Using AWS Console (Alternative)

1. Go to IAM Console: https://console.aws.amazon.com/iam/
2. Click "Users" → "Add users"
3. Enter username and select "Access key - Programmatic access"
4. Skip permissions (they'll use role assumption)
5. Create user and download credentials
6. Edit the AmplifyTwitterProjectTeamRole trust relationship to add the user

## What to Send to New Team Members

1. **Credentials file** with:
   - Access Key ID
   - Secret Access Key
   - Account ID
   - Role ARN

2. **Setup instructions**:
   ```bash
   # Configure AWS CLI
   aws configure
   
   # Add to ~/.aws/config
   [profile amplify-twitter]
   role_arn = arn:aws:iam::ACCOUNT_ID:role/AmplifyTwitterProjectTeamRole
   source_profile = default
   region = us-west-2
   ```

3. **Test command**:
   ```bash
   aws --profile amplify-twitter amplify list-apps
   ```

## Security Best Practices

1. **Never share credentials via email or chat**
   - Use a password manager
   - Or encrypted file transfer
   - Or temporary secure link

2. **Enable MFA** (optional but recommended):
   ```bash
   aws iam create-virtual-mfa-device --virtual-mfa-device-name john-doe-mfa
   aws iam enable-mfa-device --user-name john-doe --serial-number <mfa-serial> --authentication-code1 <code1> --authentication-code2 <code2>
   ```

3. **Rotate access keys regularly**:
   ```bash
   # Create new key
   aws iam create-access-key --user-name john-doe
   
   # Delete old key
   aws iam delete-access-key --user-name john-doe --access-key-id OLD_KEY_ID
   ```

## Removing Users

```bash
# Remove from trust policy first (edit amplify-team-role-trust.json)
# Then delete the user
aws iam delete-access-key --user-name john-doe --access-key-id KEY_ID
aws iam delete-user --user-name john-doe
```