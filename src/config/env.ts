import { getEnvConfig as getRawEnvConfig } from './envManager';

type Credentials = { username: string; password: string };

export type EnvConfig = {
  mlisPortalUrl: string;
  salesforceLightningUrl: string;
  broker: Credentials;
  salesforce: Credentials;
};

export function getEnvConfig(): EnvConfig {
  const cfg = getRawEnvConfig();
  return {
    mlisPortalUrl: cfg.portalUrl,
    salesforceLightningUrl: cfg.salesforceUrl,
    broker: {
      username: cfg.brokerUsername,
      password: cfg.brokerPassword,
    },
    salesforce: {
      username: cfg.salesforceUsername,
      password: cfg.salesforcePassword,
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
