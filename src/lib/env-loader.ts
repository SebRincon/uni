// Runtime environment variable loader for Amplify serverless functions
// This ensures environment variables are available in serverless runtime

let envLoaded = false;
let envVars: Record<string, string> = {};

const ENV_VAR_NAMES = [
  'KORN_AI_ENABLED',
  'CLOUDFLARE_ACCOUNT_ID', 
  'CLOUDFLARE_API_TOKEN',
  'CLOUDFLARE_AI_MODEL',
  'CLOUDFLARE_STT_MODEL',
  'GEMINI_API_KEY',
  'CANVAS_API_KEY',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'LIVEKIT_URL',
  'NODE_ENV'
];

export function loadEnvironmentVariables(): Record<string, string> {
  if (envLoaded) {
    return envVars;
  }

  console.log('🔧 Loading environment variables for serverless runtime...');
  
  // Load variables from process.env
  for (const varName of ENV_VAR_NAMES) {
    const value = process.env[varName];
    if (value) {
      envVars[varName] = value;
      console.log(`✅ ${varName}: ${varName.includes('TOKEN') || varName.includes('KEY') ? 'SET (hidden)' : value}`);
    } else {
      console.log(`❌ ${varName}: MISSING`);
    }
  }

  // Log summary
  const loadedCount = Object.keys(envVars).length;
  console.log(`📊 Environment variables loaded: ${loadedCount}/${ENV_VAR_NAMES.length}`);
  
  envLoaded = true;
  return envVars;
}

export function getEnvironmentVariable(name: string): string | undefined {
  const vars = loadEnvironmentVariables();
  return vars[name] || process.env[name];
}

export function requireEnvironmentVariable(name: string): string {
  const value = getEnvironmentVariable(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// Validate Korn AI specific environment variables
export function validateKornAIEnvironment(): { isValid: boolean; missing: string[] } {
  const required = [
    'KORN_AI_ENABLED',
    'CLOUDFLARE_ACCOUNT_ID',
    'CLOUDFLARE_API_TOKEN'
  ];

  loadEnvironmentVariables();
  
  const missing = required.filter(name => !getEnvironmentVariable(name));
  
  return {
    isValid: missing.length === 0,
    missing
  };
}