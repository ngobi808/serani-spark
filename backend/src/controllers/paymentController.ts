import { Request, Response } from 'express';
import { pool } from '../config/db';
import { initiateStkPush, extractCallbackMetadata, MpesaCallbackBody, MPESA_TRANSACTION_CEILING_KES } from '../services/mpesaService';
import { commitReservationsForOrder, releaseReservationsForOrder } from '../services/stockService';

/**
 * POST /api/payments/stk-push
 * Body: { order_id }
 * Looks up the order, re-checks the ceiling, and fires the STK push.
 */
export async function startStkPush(req: Request, res: Response) {
  const { order_id } = req.body;
  if (!order_id) {
    return res.status(400).json({ error: 'order_id is required.' });
  }

  const orderResult = await pool.query(
    `SELECT o.id, o.total_kes, o.status, c.mpesa_phone_number, o.order_reference
     FROM orders o JOIN customers c ON c.id = o.customer_id WHERE o.id = $1`,
    [order_id]
  );
  if (orderResult.rowCount === 0) {
    return res.status(404).json({ error: 'Order not found.' });
  }
  const order = orderResult.rows[0];

  if (order.status !== 'pending_payment') {
    return res.status(409).json({ error: `Order is not awaiting payment (status: ${order.status}).` });
  }

  const total = Number(order.total_kes);
  if (total > MPESA_TRANSACTION_CEILING_KES) {
    return res.status(422).json({
      error: 'Order exceeds the single M-Pesa transaction ceiling.',
      whatsapp_required: true,
    });
  }

  try {
    const stkResponse = await initiateStkPush({
      phoneNumber: order.mpesa_phone_number,
      amount: total,
      orderReference: order.order_reference,
    });

    await pool.query(
      `INSERT INTO payments (order_id, checkout_request_id, merchant_request_id, amount_kes, phone_number, status)
       VALUES ($1,$2,$3,$4,$5,'pending')`,
      [order_id, stkResponse.CheckoutRequestID, stkResponse.MerchantRequestID, total, order.mpesa_phone_number]
    );

    res.json({ message: 'STK push sent. Ask the customer to check their phone.', checkout_request_id: stkResponse.CheckoutRequestID });
  } catch (err: any) {
    console.error('STK push failed', err?.response?.data ?? err);
    res.status(502).json({ error: 'Failed to initiate M-Pesa payment. Please try again.' });
  }
}

/**
 * POST /api/payments/mpesa-callback
 * PUBLIC (Safaricom calls this directly — no auth header available).
 * CRITICAL: this is the ONLY place an order is ever marked 'paid'. Never trust
 * frontend state. Must be idempotent — Daraja can retry callbacks.
 */
export async function handleMpesaCallback(req: Request, res: Response) {
  const body = req.body as MpesaCallbackBody;
  const { stkCallback } = body.Body;
  const { CheckoutRequestID, ResultCode, ResultDesc } = stkCallback;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const paymentResult = await client.query(
      `SELECT id, order_id, status FROM payments WHERE checkout_request_id = $1 FOR UPDATE`,
      [CheckoutRequestID]
    );

    if (paymentResult.rowCount === 0) {
      // Unknown CheckoutRequestID — log and acknowledge so Daraja stops retrying.
      console.warn('Callback for unknown CheckoutRequestID', CheckoutRequestID);
      await client.query('COMMIT');
      return res.status(200).json({ result: 'ignored' });
    }

    const payment = paymentResult.rows[0];

    // Idempotency guard: if we've already processed this payment, don't double-commit stock.
    if (payment.status !== 'pending') {
      await client.query('COMMIT');
      return res.status(200).json({ result: 'already processed' });
    }

    if (ResultCode === 0) {
      const { mpesaReceiptNumber, amount } = extractCallbackMetadata(body);

      await client.query(
        `UPDATE payments SET status = 'confirmed', mpesa_receipt_number = $1, result_code = $2, result_desc = $3, raw_callback_payload = $4, updated_at = now()
         WHERE id = $5`,
        [mpesaReceiptNumber, ResultCode, ResultDesc, JSON.stringify(body), payment.id]
      );

      await client.query(
        `UPDATE orders SET status = 'paid', amount_paid_kes = $1, updated_at = now() WHERE id = $2`,
        [amount, payment.order_id]
      );

      await client.query('COMMIT');

      // Commit stock reservations -> permanent deduction (outside this transaction,
      // it manages its own).
      await commitReservationsForOrder(payment.order_id);
    } else {
      // Payment failed or was cancelled by the customer.
      await client.query(
        `UPDATE payments SET status = 'failed', result_code = $1, result_desc = $2, raw_callback_payload = $3, updated_at = now()
         WHERE id = $4`,
        [ResultCode, ResultDesc, JSON.stringify(body), payment.id]
      );
      await client.query(
        `UPDATE orders SET status = 'failed', updated_at = now() WHERE id = $1`,
        [payment.order_id]
      );
      await client.query('COMMIT');

      await releaseReservationsForOrder(payment.order_id);
    }

    // Daraja expects a 200 acknowledging receipt regardless of ResultCode.
    res.status(200).json({ result: 'received' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('mpesa-callback processing error', err);
    // Still 200 so Safaricom doesn't hammer retries while we investigate;
    // the raw payload was not saved in this branch, so check server logs.
    res.status(200).json({ result: 'error logged' });
  } finally {
    client.release();
  }
}
