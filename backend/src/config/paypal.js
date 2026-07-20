import { Client, Environment, LogLevel } from '@paypal/paypal-server-sdk';

const isProduction = process.env.PAYPAL_MODE === 'live';

const paypalClient = new Client({
  clientCredentialsAuthCredentials: {
    oAuthClientId: process.env.PAYPAL_CLIENT_ID,
    oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
  },
  environment: isProduction ? Environment.Production : Environment.Sandbox,
  logging: {
    logLevel: isProduction ? LogLevel.Warn : LogLevel.Info,
    logRequest: { logBody: !isProduction },
    logResponse: { logBody: !isProduction }
  },
  timeout: 10000
});

export const PAYPAL_CONFIG = {
  mode: process.env.PAYPAL_MODE || 'sandbox',
  webhookId: process.env.PAYPAL_WEBHOOK_ID,
  isProduction
};

export default paypalClient;
