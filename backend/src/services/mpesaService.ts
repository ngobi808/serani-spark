import axios from 'axios';

const BASE_URL =
  process.env.MPESA_ENV === 'production'
    ? 'https://api.safaricom.co.ke'
    : 'https://sandbox.safaricom.co.ke';

export const MPESA_TRANSACTION_CEILING_KES = 150000; // adjust to your actual Daraja-approved ceiling

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const consumerKey = process.env.MPESA_CONSUMER_KEY!;
  const consumerSecret = process.env.MPESA_CONSUMER_SECRET!;
  const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');

  const { data } = await axios.get(`${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });

  // Daraja tokens last ~1 hour; refresh a little early.
  cachedToken = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 };
  return data.access_token;
}

function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    now.getFullYear().toString() +
    pad(now.getMonth() + 1) +
    pad(now.getDate()) +
    pad(now.getHours()) +
    pad(now.getMinutes()) +
    pad(now.getSeconds())
  );
}

interface StkPushParams {
  phoneNumber: string; // format 2547XXXXXXXX
  amount: number;
  orderReference: string;
}

export async function initiateStkPush({ phoneNumber, amount, orderReference }: StkPushParams) {
  const shortcode = process.env.MPESA_SHORTCODE!;
  const passkey = process.env.MPESA_PASSKEY!;
  const timestamp = generateTimestamp();
  const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

  const token = await getAccessToken();

  const { data } = await axios.post(
    `${BASE_URL}/mpesa/stkpush/v1/processrequest`,
    {
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: Math.round(amount),
      PartyA: phoneNumber,
      PartyB: shortcode,
      PhoneNumber: phoneNumber,
      CallBackURL: process.env.MPESA_CALLBACK_URL,
      AccountReference: orderReference,
      TransactionDesc: `Payment for order ${orderReference}`,
    },
    { headers: { Authorization: `Bearer ${token}` } }
  );

  // data.CheckoutRequestID and data.MerchantRequestID must be stored on the
  // payments row so the callback can be matched back to this attempt.
  return data;
}

/** Shape of the callback body Daraja POSTs to /api/payments/mpesa-callback. */
export interface MpesaCallbackBody {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: { Name: string; Value: string | number }[];
      };
    };
  };
}

/** Pulls the MpesaReceiptNumber and Amount out of a confirmed callback's metadata array. */
export function extractCallbackMetadata(body: MpesaCallbackBody) {
  const items = body.Body.stkCallback.CallbackMetadata?.Item ?? [];
  const get = (name: string) => items.find((i) => i.Name === name)?.Value;

  return {
    mpesaReceiptNumber: get('MpesaReceiptNumber') as string | undefined,
    amount: get('Amount') as number | undefined,
    phoneNumber: get('PhoneNumber') as string | undefined,
  };
}
