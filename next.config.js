/** @type {import('next').NextConfig} */

const nextConfig = {
    experimental: {
        serverActions: true,
    },
    images: {
        // TODO: Add your S3 bucket domain here once deployed
        // Example: domains: ["twitter-clone-media-bucket-xyz.s3.us-east-1.amazonaws.com"],
        domains: [
            // Add your Amplify S3 bucket domain here after deployment
            "localhost", // For development
        ],
    },
};

module.exports = nextConfig;