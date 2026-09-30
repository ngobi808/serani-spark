/**
 * Thin wrapper around Resend's API. No SDK dependency - a plain fetch call,
 * since it's one endpoint.
 *
 * If RESEND_API_KEY isn't set, this logs and returns instead of throwing, so
 * order creation and password reset both keep working before email is
 * configured, or if Resend has an outage. Email is a nice-to-have on top of
 * the WhatsApp confirmation flow, never a hard dependency for checkout.
 */

const FROM_ADDRESS = process.env.EMAIL_FROM || 'Serani Spark <onboarding@resend.dev>';

export async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(`RESEND_API_KEY not set - skipping email to ${to}: "${subject}"`);
    return;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
    });
    if (!res.ok) {
      console.error('Resend send failed', res.status, await res.text().catch(() => ''));
    }
  } catch (err) {
    // Never let an email failure break the request that triggered it.
    console.error('Resend send threw', err);
  }
}

export function passwordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset your Serani Spark password',
    html: `
      <p>Someone requested a password reset for this email address on Serani Spark.</p>
      <p><a href="${resetUrl}">Click here to set a new password</a>. This link works for 1 hour.</p>
      <p>If you didn't request this, you can ignore this email.</p>
    `,
  };
}

export function orderConfirmationEmail(orderReference: string, totalKes: number): { subject: string; html: string } {
  return {
    subject: `Order confirmed - ${orderReference}`,
    html: `
      <p>Thank you for your order!</p>
      <p><strong>Order reference:</strong> ${orderReference}<br/>
         <strong>Amount paid:</strong> KSh ${totalKes.toLocaleString()}</p>
      <p>Serani Spark will be in touch shortly to arrange delivery.</p>
    `,
  };
}
