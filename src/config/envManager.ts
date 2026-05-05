declare const process: { env: Record<string, string | undefined> };

export type EnvName = string;

export type EnvConfig = {
  portalUrl: string;
  salesforceUrl: string;
  brokerUsername: string;
  brokerPassword: string;
  salesforceUsername: string;
  salesforcePassword: string;
};

let cached: EnvConfig | null = null;
let didLog = false;

function normalizeEnvName(value: string | undefined): string {
  const env = (value ?? '').trim();
  return env ? env.toUpperCase() : 'SIT2';
}

function resolveEnvVarName(envName: string, baseName: string): string {
  // Backward compatibility: UAT2 uses unprefixed variables as per existing .env.
  if (envName === 'UAT2') return baseName;
  return `${envName}_${baseName}`;
}

function requiredEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`[env] Missing ${varName}. Set it in .env (or export it in your shell).`);
  }
  return value;
}

function getEnvVarWithOptionalFallback(envName: string, baseName: string): string {
  const primaryVar = resolveEnvVarName(envName, baseName);
  const primaryValue = process.env[primaryVar];
  if (primaryValue) return primaryValue;

  return requiredEnvVar(primaryVar);
}

/**
 * Centralized environment config resolver.
 *
 * Reads process.env.TEST_ENV (defaults to SIT2) and maps to the corresponding
 * .env variable set, returning a structured config object.
 */
export function getEnvConfig(): EnvConfig {
  if (cached) return cached;

  const envName = normalizeEnvName(process.env.TEST_ENV);

  if (!didLog) {
    // Required log statement (exact format).
    // eslint-disable-next-line no-console
    console.log(`Running tests in ${envName} environment`);
    didLog = true;
  }

  cached = {
    portalUrl: getEnvVarWithOptionalFallback(envName, 'MLIS_PORTAL_URL'),
    salesforceUrl: getEnvVarWithOptionalFallback(envName, 'SALESFORCE_LIGHTNING_URL'),
    brokerUsername: getEnvVarWithOptionalFallback(envName, 'BROKER_USERNAME'),
    brokerPassword: getEnvVarWithOptionalFallback(envName, 'BROKER_PASSWORD'),
    salesforceUsername: getEnvVarWithOptionalFallback(envName, 'SALESFORCE_USERNAME'),
    salesforcePassword: getEnvVarWithOptionalFallback(envName, 'SALESFORCE_PASSWORD'),
  };

  return cached;
}
