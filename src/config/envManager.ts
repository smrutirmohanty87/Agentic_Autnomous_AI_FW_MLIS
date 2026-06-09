export type EnvConfig = {
  portalUrl: string;
  salesforceUrl: string;
  brokerUsername: string;
  brokerPassword: string;
  salesforceUsername: string;
  salesforcePassword: string;
};

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`[env] Missing ${name}. Set it in .env (or export it in your shell).`);
  }
  return value;
}

function getActiveEnvironment(): string {
  const value = process.env.TEST_ENV?.trim();
  return value ? value.toUpperCase() : 'UAT2';
}

function envVarName(baseName: string, envName: string): string {
  // Backward compatible default: UAT2 uses the un-prefixed variables.
  // Any other environment uses the convention: <ENV>_<BASE_NAME>
  return envName === 'UAT2' ? baseName : `${envName}_${baseName}`;
}

let _cached: EnvConfig | null = null;
let _cachedEnv: string | null = null;

export function getEnvConfig(): EnvConfig {
  const currentEnv = getActiveEnvironment();
  
  if (_cached && _cachedEnv === currentEnv) {
    return _cached;
  }
  
  if (_cachedEnv !== currentEnv) {
    console.log(`Running tests in ${currentEnv} environment`);
    _cachedEnv = currentEnv;
  }

  const portalUrlVar = envVarName('MLIS_PORTAL_URL', currentEnv);
  const salesforceUrlVar = envVarName('SALESFORCE_LIGHTNING_URL', currentEnv);
  const brokerUsernameVar = envVarName('BROKER_USERNAME', currentEnv);
  const brokerPasswordVar = envVarName('BROKER_PASSWORD', currentEnv);
  const salesforceUsernameVar = envVarName('SALESFORCE_USERNAME', currentEnv);
  const salesforcePasswordVar = envVarName('SALESFORCE_PASSWORD', currentEnv);

  _cached = {
    portalUrl: required(portalUrlVar),
    salesforceUrl: required(salesforceUrlVar),
    brokerUsername: required(brokerUsernameVar),
    brokerPassword: required(brokerPasswordVar),
    salesforceUsername: required(salesforceUsernameVar),
    salesforcePassword: required(salesforcePasswordVar),
  };
  
  return _cached;
}
