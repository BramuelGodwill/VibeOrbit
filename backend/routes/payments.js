const router         = require('express').Router();
const pool           = require('../config/db');
const { stkPush }    = require('../services/mpesaService');
const authMiddleware = require('../middleware/auth');

// ── Initiate STK Push ─────────────────────────────────────────────────────
router.post('/mpesa', authMiddleware, async (req, res) => {
  const { phone, amount } = req.body;

  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  try {
    const result = await stkPush(phone, amount || 500);

    // Save pending subscription record
    await pool.query(
      'INSERT INTO subscriptions (user_id, phone_number, amount, status) VALUES ($1, $2, $3, $4)',
      [req.userId, phone, amount || 500, 'pending']
    );

    res.json({
      message: 'Check your phone for the M-Pesa payment prompt',
      checkoutRequestId: result.CheckoutRequestID,
    });
  } catch (err) {
    console.error('M-Pesa error:', err.response?.data || err.message);
    res.status(500).json({
      error: 'Payment initiation failed',
      details: err.response?.data?.errorMessage || err.message,
    });
  }
});

// ── M-Pesa Callback (called by Safaricom after payment) ───────────────────
router.post('/callback', async (req, res) => {
  try {
    const stkCallback = req.body?.Body?.stkCallback;

    if (!stkCallback) {
      return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }

    if (stkCallback.ResultCode === 0) {
      // Payment was successful
      const items   = stkCallback.CallbackMetadata?.Item || [];
      const receipt = items.find(i => i.Name === 'MpesaReceiptNumber')?.Value;
      const phone   = items.find(i => i.Name === 'PhoneNumber')?.Value;
      const amount  = items.find(i => i.Name === 'Amount')?.Value;

      if (receipt && phone) {
        const last9 = String(phone).slice(-9);

        // Update subscription status
        await pool.query(
          `UPDATE subscriptions
           SET status='completed', mpesa_receipt=$1
           WHERE phone_number LIKE $2 AND status='pending'`,
          [receipt, `%${last9}`]
        );

        // Mark user as premium
        await pool.query(
          `UPDATE users SET is_premium=true
           WHERE id = (
             SELECT user_id FROM subscriptions
             WHERE mpesa_receipt=$1 LIMIT 1
           )`,
          [receipt]
        );
      }
    } else {
      // Payment failed or cancelled
      const phone = req.body?.Body?.stkCallback?.CallbackMetadata?.Item
        ?.find(i => i.Name === 'PhoneNumber')?.Value;
      if (phone) {
        const last9 = String(phone).slice(-9);
        await pool.query(
          `UPDATE subscriptions SET status='failed'
           WHERE phone_number LIKE $1 AND status='pending'`,
          [`%${last9}`]
        ).catch(() => {});
      }
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
  } catch (err) {
    console.error('M-Pesa callback error:', err);
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' }); // Always respond 200 to Safaricom
  }
});

module.exports = router;
