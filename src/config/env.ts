import { getEnvConfig as getManagedEnvConfig } from './envManager';

type Credentials = { username: string; password: string };
type BrokerProfile = 'NO_COMM' | 'INTER_COMM' | 'BDE_COMM' | 'INTRO_COMM';

type EnvConfig = {
  mlisPortalUrl: string;
  salesforceLightningUrl: string;
  broker: Credentials;
  salesforce: Credentials;
};

export function getEnvConfig(): EnvConfig {
  const managed = getManagedEnvConfig();
  return {
    mlisPortalUrl: managed.portalUrl,
    salesforceLightningUrl: managed.salesforceUrl,
    broker: {
      username: managed.brokerUsername,
      password: managed.brokerPassword,
    },
    salesforce: {
      username: managed.salesforceUsername,
      password: managed.salesforcePassword,
    },
  };
}

export function getBrokerCredentials(): Credentials {
  return getEnvConfig().broker;
}

function normalizeEnvName(value: string | undefined): string {
  const env = (value ?? '').trim();
  return env ? env.toUpperCase() : 'SIT1';
}

export function getBrokerCredentialsForProfile(profile: BrokerProfile): Credentials {
  const envName = normalizeEnvName(process.env.TEST_ENV);
  const normalizedProfile = profile.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  const usernameVar = `SALEFORCE_${envName}_${normalizedProfile}_BROKERUSER`;
  const passwordVar = `SALEFORCE_${envName}_${normalizedProfile}_BROKERPASSWORD`;

  const username = process.env[usernameVar];
  const password = process.env[passwordVar];

  if (username && password) {
    return { username, password };
  }

  return getBrokerCredentials();
}

export function getSalesforceCredentials(): Credentials {
  return getEnvConfig().salesforce;
}

export function getMlisPortalUrl(): string {
  return getEnvConfig().mlisPortalUrl;
}

export function getSalesforceLightningUrl(): string {
  return getEnvConfig().salesforceLightningUrl;
}
