type Env = Record<string, string | undefined>;

const requiredVariables = [
  'DATABASE_URL',
  'DIRECT_URL',
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY'
] as const;

export function validateEnv(config: Env): Env {
  const missing = requiredVariables.filter((key) => !config[key]);

  if (missing.length > 0 && config.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }

  return config;
}

