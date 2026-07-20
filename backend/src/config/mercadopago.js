import { MercadoPagoConfig } from 'mercadopago';

const mercadopagoConfig = new MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
  options: {
    timeout: 5000
  }
});

export const MERCADOPAGO_CONFIG = {
  supportedCountries: (process.env.MERCADOPAGO_SUPPORTED_COUNTRIES || 'AR,BR,CL,CO,MX,PE,UY').split(','),
  webhookSecret: process.env.MERCADOPAGO_WEBHOOK_SECRET,
  publicKey: process.env.MERCADOPAGO_PUBLIC_KEY
};

export default mercadopagoConfig;
