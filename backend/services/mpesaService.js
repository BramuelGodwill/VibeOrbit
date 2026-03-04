const axios = require('axios');

const SANDBOX_BASE = 'https://sandbox.safaricom.co.ke';

// ── Get OAuth Access Token ────────────────────────────────────────────────
const getAccessToken = async () => {
  const credentials = Buffer.from(
    `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
  ).toString('base64');

  const { data } = await axios.get(
    `${SANDBOX_BASE}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${credentials}` } }
  );

  return data.access_token;
};

// ── Format phone number to 254XXXXXXXXX ───────────────────────────────────
const formatPhone = (phone) => {
  const str = String(phone).trim().replace(/\s+/g, '');
  if (str.startsWith('+254')) return str.slice(1);   // +254 → 254
  if (str.startsWith('254'))  return str;             // already correct
  if (str.startsWith('0'))    return '254' + str.slice(1); // 07... → 254...
  return '254' + str;
};

// ── STK Push ─────────────────────────────────────────────────────────────
exports.stkPush = async (phone, amount = 500) => {
  const token     = await getAccessToken();
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);

  const password  = Buffer.from(
    `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
  ).toString('base64');

  const formattedPhone = formatPhone(phone);

  const { data } = await axios.post(
    `${SANDBOX_BASE}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password:          password,
      Timestamp:         timestamp,
      TransactionType:   'CustomerPayBillOnline',
      Amount:            amount,
      PartyA:            formattedPhone,
      PartyB:            process.env.MPESA_SHORTCODE,
      PhoneNumber:       formattedPhone,
      CallBackURL:       process.env.MPESA_CALLBACK_URL,
      AccountReference:  'VibeOrbit',
      TransactionDesc:   'VibeOrbit Premium Subscription',
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  return data;
};
