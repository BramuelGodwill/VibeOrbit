const router = require('express').Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const IntaSend = require('intasend-node');

const intasend = new IntaSend(
    process.env.INTASEND_PUBLISHABLE_KEY,
    process.env.INTASEND_SECRET_KEY,
    true // live mode
);

// ── Auto-poll pending payments every 2 minutes ────────────────────────────
const checkPendingPayments = async() => {
    try {
        const result = await pool.query(
            "SELECT * FROM subscriptions WHERE status='pending' AND created_at > NOW() - INTERVAL '24 hours'"
        );
        if (result.rows.length === 0) return;

        console.log('Checking', result.rows.length, 'pending payments...');

        for (let i = 0; i < result.rows.length; i++) {
            const sub = result.rows[i];
            try {
                const collection = intasend.collection();
                const status = await collection.status(sub.mpesa_receipt);

                console.log('Invoice', sub.mpesa_receipt, 'status:', status.invoice.state);

                if (status.invoice.state === 'COMPLETE' || status.invoice.state === 'COMPLETED') {
                    // Mark subscription complete
                    await pool.query(
                        "UPDATE subscriptions SET status='completed' WHERE id=$1", [sub.id]
                    );
                    // Upgrade user to premium
                    await pool.query(
                        'UPDATE users SET is_premium=true WHERE id=$1', [sub.user_id]
                    );
                    console.log('Auto-upgraded user', sub.user_id, 'to premium!');
                } else if (status.invoice.state === 'FAILED' || status.invoice.state === 'CANCELLED') {
                    await pool.query(
                        "UPDATE subscriptions SET status='failed' WHERE id=$1", [sub.id]
                    );
                }
            } catch (err) {
                console.error('Error checking invoice', sub.mpesa_receipt, err.message);
            }
        }
    } catch (err) {
        console.error('Polling error:', err.message);
    }
};

// Start polling every 2 minutes
setInterval(checkPendingPayments, 2 * 60 * 1000);
// Also run once on startup
setTimeout(checkPendingPayments, 10000);

// ── Initiate M-Pesa STK Push ───────────────────────────────────────────────
router.post('/mpesa', authMiddleware, async(req, res) => {
    const { phone, amount, firstName, email } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    try {
        let formattedPhone = String(phone).trim().replace(/\s+/g, '');
        if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.slice(1);
        else if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

        if (!formattedPhone.startsWith('2547') && !formattedPhone.startsWith('2541')) {
            return res.status(400).json({
                error: 'Please use a Safaricom M-Pesa number (07xx or 01xx)',
            });
        }

        console.log('Initiating STK push to:', formattedPhone);

        const collection = intasend.collection();
        const response = await collection.mpesaStkPush({
            first_name: firstName || 'VibeOrbit',
            last_name: 'User',
            email: email || 'user@vibeorbit.com',
            host: 'https://vibeorbit.vercel.app',
            amount: amount || 10,
            phone_number: formattedPhone,
            api_ref: 'VibeOrbit-Premium-' + req.userId,
            redirect_url: 'https://vibeorbit.vercel.app/profile',
        });

        console.log('IntaSend response:', JSON.stringify(response));

        const invoiceId = response.invoice ?
            response.invoice.invoice_id :
            response.id;

        if (!invoiceId) {
            return res.status(500).json({ error: 'Failed to create payment. Try again.' });
        }

        await pool.query(
            `INSERT INTO subscriptions (user_id, phone_number, amount, status, mpesa_receipt)
       VALUES ($1, $2, $3, 'pending', $4)`, [req.userId, formattedPhone, amount || 10, invoiceId]
        );

        res.json({
            message: 'M-Pesa prompt sent! Enter your PIN on your phone.',
            invoiceId: invoiceId,
        });

    } catch (err) {
        console.error('IntaSend error:', err);
        res.status(500).json({ error: err.message || 'Payment failed. Try again.' });
    }
});

// ── Webhook (backup — works once IntaSend is verified) ────────────────────
router.post('/callback', async(req, res) => {
    try {
        console.log('Webhook received:', JSON.stringify(req.body));
        const body = req.body || {};
        const invoiceId = body.invoice_id || (body.invoice && body.invoice.invoice_id);
        const state = body.state || (body.invoice && body.invoice.state);

        if (invoiceId && (state === 'COMPLETE' || state === 'COMPLETED')) {
            await pool.query(
                "UPDATE subscriptions SET status='completed' WHERE mpesa_receipt=$1", [invoiceId]
            );
            await pool.query(
                `UPDATE users SET is_premium=true
         WHERE id=(SELECT user_id FROM subscriptions WHERE mpesa_receipt=$1 LIMIT 1)`, [invoiceId]
            );
            console.log('Webhook upgraded user to premium:', invoiceId);
        }
        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook error:', err);
        res.json({ status: 'ok' });
    }
});

// ── Poll payment status (called by frontend every 5s) ─────────────────────
router.get('/status/:invoiceId', authMiddleware, async(req, res) => {
    try {
        // First check database
        const result = await pool.query(
            'SELECT status FROM subscriptions WHERE mpesa_receipt=$1 AND user_id=$2', [req.params.invoiceId, req.userId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Invoice not found' });

        // If still pending, check IntaSend directly right now
        if (result.rows[0].status === 'pending') {
            try {
                const collection = intasend.collection();
                const status = await collection.status(req.params.invoiceId);
                const state = status.invoice.state;

                if (state === 'COMPLETE' || state === 'COMPLETED') {
                    await pool.query(
                        "UPDATE subscriptions SET status='completed' WHERE mpesa_receipt=$1", [req.params.invoiceId]
                    );
                    await pool.query(
                        'UPDATE users SET is_premium=true WHERE id=$1', [req.userId]
                    );
                    return res.json({ status: 'completed' });
                }
            } catch {}
        }

        res.json({ status: result.rows[0].status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

module.exports = router;