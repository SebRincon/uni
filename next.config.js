/** @type {import('next').NextConfig} */

const nextConfig = {
    experimental: {
        serverActions: true,
    },
    images: {
        domains: [
            "localhost", // For development
            "amplify-d3o849eq3fpd4i-ma-twitterclonemediabucket8-jx8tlzkfwzr3.s3.us-west-2.amazonaws.com", // S3 bucket
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.s3.**.amazonaws.com',
                pathname: '/**',
            },
        ],
    },
};

module.exports = nextConfig;