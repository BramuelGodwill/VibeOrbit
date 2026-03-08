const router = require('express').Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/auth');
const IntaSend = require('intasend-node');

const intasend = new IntaSend(
    process.env.INTASEND_PUBLISHABLE_KEY,
    process.env.INTASEND_SECRET_KEY,
    true // true = live mode
);

// ── Initiate M-Pesa STK Push ───────────────────────────────────────────────
router.post('/mpesa', authMiddleware, async(req, res) => {
    const { phone, amount, firstName, email } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    try {
        // Format phone to 254XXXXXXXXX
        let formattedPhone = String(phone).trim().replace(/\s+/g, '');
        if (formattedPhone.startsWith('+254')) formattedPhone = formattedPhone.slice(1);
        else if (formattedPhone.startsWith('0')) formattedPhone = '254' + formattedPhone.slice(1);
        else if (!formattedPhone.startsWith('254')) formattedPhone = '254' + formattedPhone;

        // Must be Safaricom (07xx or 01xx)
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

        // Save pending subscription
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
        const msg = err.message || 'Payment failed. Try again.';
        res.status(500).json({ error: msg });
    }
});

// ── IntaSend Webhook — called automatically after payment ─────────────────
router.post('/callback', async(req, res) => {
    try {
        console.log('Webhook received:', JSON.stringify(req.body));

        const body = req.body || {};
        const invoiceId = body.invoice_id ||
            (body.invoice && body.invoice.invoice_id) ||
            body.id;
        const state = body.state ||
            (body.invoice && body.invoice.state) ||
            body.status;

        console.log('Invoice:', invoiceId, 'State:', state);

        if (invoiceId && (state === 'COMPLETE' || state === 'COMPLETED')) {
            await pool.query(
                "UPDATE subscriptions SET status='completed' WHERE mpesa_receipt=$1", [invoiceId]
            );
            await pool.query(
                `UPDATE users SET is_premium=true
         WHERE id=(SELECT user_id FROM subscriptions WHERE mpesa_receipt=$1 LIMIT 1)`, [invoiceId]
            );
            console.log('User upgraded to premium. Invoice:', invoiceId);
        }

        res.json({ status: 'ok' });
    } catch (err) {
        console.error('Webhook error:', err);
        res.json({ status: 'ok' });
    }
});

// ── Poll payment status ────────────────────────────────────────────────────
router.get('/status/:invoiceId', authMiddleware, async(req, res) => {
    try {
        const result = await pool.query(
            'SELECT status FROM subscriptions WHERE mpesa_receipt=$1 AND user_id=$2', [req.params.invoiceId, req.userId]
        );
        if (!result.rows[0]) return res.status(404).json({ error: 'Invoice not found' });
        res.json({ status: result.rows[0].status });
    } catch (err) {
        res.status(500).json({ error: 'Failed to check status' });
    }
});

module.exports = router;