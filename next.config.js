/** @type {import('next').NextConfig} */
const path = require('path');

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
    webpack: (config) => {
        // Ensure '@' alias resolves to the src directory in all environments (including Amplify)
        config.resolve = config.resolve || {};
        config.resolve.alias = config.resolve.alias || {};
        config.resolve.alias['@'] = path.resolve(__dirname, 'src');
        return config;
    },
};

module.exports = nextConfig;
