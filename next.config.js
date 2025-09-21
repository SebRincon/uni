/** @type {import('next').NextConfig} */
const path = require('path');

const nextConfig = {
    experimental: {
        serverActions: true,
    },
    env: {
        // Explicitly expose environment variables for serverless functions
        KORN_AI_ENABLED: process.env.KORN_AI_ENABLED,
        CLOUDFLARE_ACCOUNT_ID: process.env.CLOUDFLARE_ACCOUNT_ID,
        CLOUDFLARE_API_TOKEN: process.env.CLOUDFLARE_API_TOKEN,
        CLOUDFLARE_AI_MODEL: process.env.CLOUDFLARE_AI_MODEL,
        CLOUDFLARE_STT_MODEL: process.env.CLOUDFLARE_STT_MODEL || '@cf/openai/whisper',
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        CANVAS_API_KEY: process.env.CANVAS_API_KEY,
        LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY,
        LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET,
        LIVEKIT_URL: process.env.LIVEKIT_URL,
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
