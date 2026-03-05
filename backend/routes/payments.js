const router = require('express').Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');

// ── Initiate STK Push ─────────────────────────────────────────────────────
router.post('/mpesa', authMiddleware, async(req, res) => {
    const { phone, amount } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    try {
        // Format phone number to 254XXXXXXXXX
        let formattedPhone = String(phone).trim().replace(/\s+/g, '');
        if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.slice(1);
        else if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

        // Get access token
        const credentials = Buffer.from(
            `${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`
        ).toString('base64');

        const tokenRes = await fetch(
            'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', { headers: { Authorization: `Basic ${credentials}` } }
        );

        if (!tokenRes.ok) {
            const err = await tokenRes.text();
            console.error('M-Pesa token error:', err);
            return res.status(500).json({
                error: 'Payment service unavailable. Check your Daraja credentials in Render environment variables.',
            });
        }

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;

        if (!accessToken) {
            return res.status(500).json({
                error: 'Could not get M-Pesa token. Check MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in Render.',
            });
        }

        // Generate password
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(
            `${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
        ).toString('base64');

        // STK Push
        const stkRes = await fetch(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    BusinessShortCode: process.env.MPESA_SHORTCODE,
                    Password: password,
                    Timestamp: timestamp,
                    TransactionType: 'CustomerPayBillOnline',
                    Amount: amount || 10,
                    PartyA: formattedPhone,
                    PartyB: process.env.MPESA_SHORTCODE,
                    PhoneNumber: formattedPhone,
                    CallBackURL: process.env.MPESA_CALLBACK_URL,
                    AccountReference: 'VibeOrbit',
                    TransactionDesc: 'VibeOrbit Premium - KES 10/week',
                }),
            }
        );

        const stkData = await stkRes.json();

        if (!stkRes.ok || stkData.errorCode) {
            console.error('STK Push error:', stkData);
            return res.status(400).json({
                error: stkData.errorMessage || 'Payment failed. Check your M-Pesa sandbox settings.',
            });
        }

        // Save pending subscription
        await pool.query(
            'INSERT INTO subscriptions (user_id, phone_number, amount, status) VALUES ($1, $2, $3, $4)', [req.userId, formattedPhone, amount || 10, 'pending']
        );

        res.json({
            message: '✅ Check your phone for the M-Pesa prompt and enter your PIN',
            checkoutRequestId: stkData.CheckoutRequestID,
        });

    } catch (err: any) {
        console.error('M-Pesa error:', err);
        res.status(500).json({
            error: 'Payment failed. Make sure MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE and MPESA_PASSKEY are set in Render environment variables.',
        });
    }
});

// ── M-Pesa Callback ───────────────────────────────────────────────────────
router.post('/callback', async(req, res) => {
    try {
        const stkCallback = req.body ? .Body ? .stkCallback;
        if (!stkCallback) return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

        if (stkCallback.ResultCode === 0) {
            const items = stkCallback.CallbackMetadata ? .Item || [];
            const receipt = items.find((i: any) => i.Name === 'MpesaReceiptNumber') ? .Value;
            const phone = items.find((i: any) => i.Name === 'PhoneNumber') ? .Value;

            if (receipt && phone) {
                const last9 = String(phone).slice(-9);
                await pool.query(
                    `UPDATE subscriptions SET status='completed', mpesa_receipt=$1
           WHERE phone_number LIKE $2 AND status='pending'`, [receipt, `%${last9}`]
                );
                await pool.query(
                    `UPDATE users SET is_premium=true
           WHERE id = (SELECT user_id FROM subscriptions WHERE mpesa_receipt=$1 LIMIT 1)`, [receipt]
                );
            }
        }
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (err) {
        console.error('Callback error:', err);
        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    }
});

module.exports = router;