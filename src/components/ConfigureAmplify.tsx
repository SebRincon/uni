"use client";

import { useEffect } from "react";
import { Amplify } from "aws-amplify";

const amplifyConfig = {
  "auth": {
    "user_pool_id": "us-west-2_4GBLfv0uG",
    "aws_region": "us-west-2",
    "user_pool_client_id": "pkmguc53aldgseh2b0rqfdgb5",
    "identity_pool_id": "us-west-2:d4d24843-ff05-4e37-8133-c68c73a8a7f5",
    "mfa_methods": [],
    "standard_required_attributes": [
      "email",
      "preferred_username"
    ],
    "username_attributes": [
      "email"
    ],
    "user_verification_types": [
      "email"
    ],
    "groups": [],
    "mfa_configuration": "NONE",
    "password_policy": {
      "min_length": 8,
      "require_lowercase": true,
      "require_numbers": true,
      "require_symbols": true,
      "require_uppercase": true
    },
    "unauthenticated_identities_enabled": true
  },
  "data": {
    "url": "https://lt4kgyx72fe35nosrb6gggq5hm.appsync-api.us-west-2.amazonaws.com/graphql",
    "aws_region": "us-west-2",
    "api_key": "da2-nbhyqthnvzeo5frztljs3hwcqy",
    "default_authorization_type": "API_KEY",
    "authorization_types": [
      "AMAZON_COGNITO_USER_POOLS",
      "AWS_IAM"
    ]
  },
  "storage": {
    "aws_region": "us-west-2",
    "bucket_name": "amplify-twitter-sebastian-twitterclonemediabucket8-4wzmntrlglvh",
    "buckets": [
      {
        "name": "twitter-clone-media",
        "bucket_name": "amplify-twitter-sebastian-twitterclonemediabucket8-4wzmntrlglvh",
        "aws_region": "us-west-2",
        "paths": {
          "media/*": {
            "guest": [
              "get",
              "list"
            ],
            "authenticated": [
              "get",
              "list",
              "write",
              "delete"
            ]
          }
        }
      }
    ]
  },
  "version": "1.4"
};

export default function ConfigureAmplifyClientSide() {
  useEffect(() => {
    // Amplify.configure is idempotent, so it's safe to call on every render.
    // The library handles preventing re-configuration internally.
    Amplify.configure(amplifyConfig, { ssr: true });
  }, []);

  return null;
}