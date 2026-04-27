import { getEnvConfig as getManagedEnvConfig } from './envManager';

type Credentials = { username: string; password: string };

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

export function getSalesforceCredentials(): Credentials {
  return getEnvConfig().salesforce;
}

export function getMlisPortalUrl(): string {
  return getEnvConfig().mlisPortalUrl;
}

export function getSalesforceLightningUrl(): string {
  return getEnvConfig().salesforceLightningUrl;
}
