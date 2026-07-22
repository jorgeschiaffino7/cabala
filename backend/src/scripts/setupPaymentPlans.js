import dotenv from 'dotenv';
dotenv.config();

import { MercadoPagoConfig, PreApprovalPlan } from 'mercadopago';
import {
  Client,
  Environment,
  SubscriptionsController,
  IntervalUnit,
  TenureType,
  PlanRequestStatus
} from '@paypal/paypal-server-sdk';
import { supabaseAdmin } from '../config/supabase.js';

// Crear configs DESPUÉS de que dotenv haya cargado las variables
function createMercadoPagoConfig() {
  return new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
    options: { timeout: 10000 }
  });
}

function createPayPalClient() {
  const isProduction = process.env.PAYPAL_MODE === 'live';
  return new Client({
    clientCredentialsAuthCredentials: {
      oAuthClientId: process.env.PAYPAL_CLIENT_ID,
      oAuthClientSecret: process.env.PAYPAL_CLIENT_SECRET
    },
    environment: isProduction ? Environment.Production : Environment.Sandbox,
    timeout: 10000
  });
}

const PAYPAL_CONFIG = {
  get isProduction() {
    return process.env.PAYPAL_MODE === 'live';
  }
};

const BRAND = 'Gematria Bot';

function parseArgs(argv) {
  const options = { provider: 'all', dryRun: false, force: false };

  for (const arg of argv) {
    if (arg.startsWith('--provider=')) {
      options.provider = arg.split('=')[1];
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--force') {
      options.force = true;
    }
  }

  if (!['all', 'mercadopago', 'paypal'].includes(options.provider)) {
    throw new Error('Proveedor inválido. Usa: all, mercadopago o paypal');
  }

  return options;
}

function getPayPalApiBase() {
  return PAYPAL_CONFIG.isProduction
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';
}

async function getPayPalAccessToken() {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64');

  const response = await fetch(`${getPayPalApiBase()}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error obteniendo token de PayPal: ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function fetchPaidPlans() {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('id, name, price_cents, mercadopago_plan_id, paypal_plan_id')
    .gt('price_cents', 0)
    .eq('is_active', true)
    .order('price_cents', { ascending: true });

  if (error) {
    throw new Error(`Error leyendo planes de Supabase: ${error.message}`);
  }

  if (!data?.length) {
    throw new Error('No se encontraron planes de pago activos en subscription_plans');
  }

  return data;
}

async function updatePlanProviderId(planId, column, providerPlanId) {
  const { error } = await supabaseAdmin
    .from('subscription_plans')
    .update({ [column]: providerPlanId })
    .eq('id', planId);

  if (error) {
    throw new Error(`Error actualizando ${column} en Supabase: ${error.message}`);
  }
}

async function setupMercadoPagoPlans(plans, options) {
  console.log('\n--- Mercado Pago ---');

  if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
    throw new Error('Falta MERCADOPAGO_ACCESS_TOKEN en .env');
  }

  const mercadopagoConfig = createMercadoPagoConfig();
  const preApprovalPlan = new PreApprovalPlan(mercadopagoConfig);
  const currencyId = process.env.MERCADOPAGO_CURRENCY_ID || 'ARS';
  const backUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard`;

  // Precios específicos para MP (override desde env o defaults en ARS)
  const mpPrices = {
    'Estudio': parseFloat(process.env.MERCADOPAGO_PRICE_ESTUDIO) || plan.price_cents / 100,
    'Avanzado': parseFloat(process.env.MERCADOPAGO_PRICE_AVANZADO) || plan.price_cents / 100
  };

  for (const plan of plans) {
    if (plan.mercadopago_plan_id && !options.force) {
      console.log(`⏭️  ${plan.name}: ya tiene mercadopago_plan_id (${plan.mercadopago_plan_id})`);
      continue;
    }

    const amount = mpPrices[plan.name] || plan.price_cents / 100;
    const reason = `${BRAND} - ${plan.name}`;

    console.log(`📋 ${plan.name}: ${amount} ${currencyId}/mes`);

    if (options.dryRun) {
      console.log('   [dry-run] Se crearía preapproval_plan y se guardaría en Supabase');
      continue;
    }

    const response = await preApprovalPlan.create({
      body: {
        reason,
        back_url: backUrl,
        auto_recurring: {
          frequency: 1,
          frequency_type: 'months',
          transaction_amount: amount,
          currency_id: currencyId
        }
      }
    });

    if (!response?.id) {
      throw new Error(`Mercado Pago no devolvió ID para el plan ${plan.name}`);
    }

    await updatePlanProviderId(plan.id, 'mercadopago_plan_id', response.id);
    console.log(`✅ ${plan.name}: mercadopago_plan_id = ${response.id}`);
  }
}

async function getOrCreatePayPalProduct(options) {
  if (process.env.PAYPAL_PRODUCT_ID) {
    console.log(`📦 Producto PayPal existente: ${process.env.PAYPAL_PRODUCT_ID}`);
    return process.env.PAYPAL_PRODUCT_ID;
  }

  if (options.dryRun) {
    console.log('📦 [dry-run] Se crearía producto PayPal "Gematria Bot"');
    return 'PROD-DRY-RUN';
  }

  const token = await getPayPalAccessToken();
  const response = await fetch(`${getPayPalApiBase()}/v1/catalogs/products`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'PayPal-Request-Id': `gematria-product-${Date.now()}`
    },
    body: JSON.stringify({
      name: BRAND,
      description: 'Suscripciones mensuales de Gematria Bot',
      type: 'SERVICE',
      category: 'SOFTWARE'
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Error creando producto PayPal: ${errorBody}`);
  }

  const product = await response.json();
  console.log(`📦 Producto PayPal creado: ${product.id}`);
  console.log(`   Tip: agrega PAYPAL_PRODUCT_ID=${product.id} a .env para reutilizarlo`);
  return product.id;
}

async function setupPayPalPlans(plans, options) {
  console.log('\n--- PayPal ---');

  if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
    throw new Error('Faltan PAYPAL_CLIENT_ID o PAYPAL_CLIENT_SECRET en .env');
  }

  const paypalClient = createPayPalClient();
  const subscriptionsController = new SubscriptionsController(paypalClient);
  const productId = await getOrCreatePayPalProduct(options);
  const currencyCode = process.env.PAYPAL_CURRENCY_CODE || 'USD';

  for (const plan of plans) {
    if (plan.paypal_plan_id && !options.force) {
      console.log(`⏭️  ${plan.name}: ya tiene paypal_plan_id (${plan.paypal_plan_id})`);
      continue;
    }

    const amount = (plan.price_cents / 100).toFixed(2);
    const planName = `${BRAND} - ${plan.name}`;

    console.log(`📋 ${plan.name}: ${amount} ${currencyCode}/mes`);

    if (options.dryRun) {
      console.log('   [dry-run] Se crearía billing plan y se guardaría en Supabase');
      continue;
    }

    const createResponse = await subscriptionsController.createBillingPlan({
      prefer: 'return=representation',
      paypalRequestId: `gematria-plan-${plan.name}-${Date.now()}`,
      body: {
        productId,
        name: planName,
        description: `Plan ${plan.name} - suscripción mensual`,
        status: PlanRequestStatus.Active,
        billingCycles: [
          {
            frequency: {
              intervalUnit: IntervalUnit.Month,
              intervalCount: 1
            },
            tenureType: TenureType.Regular,
            sequence: 1,
            totalCycles: 0,
            pricingScheme: {
              fixedPrice: {
                value: amount,
                currencyCode
              }
            }
          }
        ],
        paymentPreferences: {
          autoBillOutstanding: true,
          paymentFailureThreshold: 3
        }
      }
    });

    const billingPlan = createResponse.result;
    if (!billingPlan?.id) {
      throw new Error(`PayPal no devolvió ID para el plan ${plan.name}`);
    }

    if (billingPlan.status !== 'ACTIVE') {
      await subscriptionsController.activateBillingPlan(billingPlan.id);
    }

    await updatePlanProviderId(plan.id, 'paypal_plan_id', billingPlan.id);
    console.log(`✅ ${plan.name}: paypal_plan_id = ${billingPlan.id}`);
  }
}

async function printSummary() {
  const { data, error } = await supabaseAdmin
    .from('subscription_plans')
    .select('name, price_cents, mercadopago_plan_id, paypal_plan_id')
    .gt('price_cents', 0)
    .order('price_cents', { ascending: true });

  if (error) {
    console.error('No se pudo leer resumen:', error.message);
    return;
  }

  console.log('\n--- Resumen en Supabase ---');
  for (const plan of data) {
    console.log(
      `${plan.name}: MP=${plan.mercadopago_plan_id || 'NULL'} | PayPal=${plan.paypal_plan_id || 'NULL'}`
    );
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  console.log('🚀 Setup de planes de pago');
  console.log(`   Proveedor: ${options.provider}`);
  if (options.dryRun) console.log('   Modo: dry-run (sin llamadas a APIs ni escritura en BD)');
  if (options.force) console.log('   Modo: force (recrea planes aunque ya tengan ID)');

  const plans = await fetchPaidPlans();
  console.log(`\nPlanes encontrados: ${plans.map(p => p.name).join(', ')}`);

  if (options.provider === 'all' || options.provider === 'mercadopago') {
    await setupMercadoPagoPlans(plans, options);
  }

  if (options.provider === 'all' || options.provider === 'paypal') {
    await setupPayPalPlans(plans, options);
  }

  if (!options.dryRun) {
    await printSummary();
  }

  console.log('\n✅ Proceso finalizado');
}

main().catch((error) => {
  console.error('\n❌ Error:', error.message);
  process.exit(1);
});
