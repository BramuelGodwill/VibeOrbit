const https = require('https');

const sendEmail = async(toEmail, subject, htmlContent) => {
    const payload = JSON.stringify({
        sender: { name: 'VibeOrbit', email: 'vibeorbitsupport@gmail.com' },
        to: [{ email: toEmail }],
        subject,
        htmlContent,
    });

    await new Promise((resolve, reject) => {
        const req = https.request({
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'Content-Length': Buffer.byteLength(payload),
            },
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log('Brevo response:', res.statusCode, body);
                if (res.statusCode >= 200 && res.statusCode < 300) resolve(body);
                else reject(new Error('Brevo error: ' + body));
            });
        });
        req.on('error', reject);
        req.write(payload);
        req.end();
    });
};

// ── Send OTP verification email ───────────────────────────────────────────
exports.sendVerificationEmail = async(toEmail, otp) => {
    console.log('Sending OTP to:', toEmail);
    await sendEmail(toEmail, 'VibeOrbit — Verify Your Email', `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
            style="background:#000;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 20px;">
                <h1 style="color:#fff;font-size:28px;margin:0;font-weight:900;letter-spacing:-1px;">
                  VibeOrbit
                </h1>
                <p style="color:#666;font-size:12px;margin:4px 0 0;">Music. Your way.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 40px;">
                <h2 style="color:#fff;font-size:22px;margin:0 0 12px;">Verify Your Email</h2>
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px;">
                  Enter the code below in the VibeOrbit app to verify your email address.
                  This code expires in <strong style="color:#fff;">10 minutes</strong>.
                </p>
                <div style="background:#111;border:1px solid #333;border-radius:12px;padding:24px;text-align:center;margin-bottom:28px;">
                  <p style="color:#888;font-size:12px;margin:0 0 8px;letter-spacing:2px;text-transform:uppercase;">Your verification code</p>
                  <p style="color:#fff;font-size:40px;font-weight:900;letter-spacing:10px;margin:0;">${otp}</p>
                </div>
                <p style="color:#555;font-size:12px;margin:0;line-height:1.6;">
                  If you did not create a VibeOrbit account, ignore this email.
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `);
    console.log('OTP email sent to:', toEmail);
};

// ── Send password reset email ─────────────────────────────────────────────
exports.sendResetEmail = async(toEmail, resetUrl) => {
    console.log('Sending reset email to:', toEmail);
    await sendEmail(toEmail, 'VibeOrbit — Reset Your Password', `
    <!DOCTYPE html>
    <html>
    <head><meta charset="UTF-8"></head>
    <body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:40px 0;">
        <tr><td align="center">
          <table width="560" cellpadding="0" cellspacing="0"
            style="background:#000;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="padding:40px 40px 20px;">
                <h1 style="color:#fff;font-size:28px;margin:0;font-weight:900;letter-spacing:-1px;">
                  VibeOrbit
                </h1>
                <p style="color:#666;font-size:12px;margin:4px 0 0;">Music. Your way.</p>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 40px 40px;">
                <h2 style="color:#fff;font-size:22px;margin:0 0 16px;">Reset Your Password</h2>
                <p style="color:#aaa;font-size:15px;line-height:1.6;margin:0 0 28px;">
                  Click the button below to set a new password.
                  This link expires in <strong style="color:#fff;">1 hour</strong>.
                </p>
                <a href="${resetUrl}"
                  style="display:inline-block;background:#fff;color:#000;
                         padding:16px 36px;text-decoration:none;
                         font-weight:700;font-size:15px;border-radius:6px;">
                  Reset Password
                </a>
                <p style="color:#555;font-size:12px;margin:28px 0 0;line-height:1.6;">
                  If you did not request this, ignore this email.
                </p>
                <hr style="border:none;border-top:1px solid #222;margin:24px 0;">
                <p style="color:#444;font-size:11px;margin:0;">
                  If the button does not work, copy this link:<br>
                  <span style="color:#888;word-break:break-all;">${resetUrl}</span>
                </p>
              </td>
            </tr>
          </table>
        </td></tr>
      </table>
    </body>
    </html>
  `);
    console.log('Reset email sent to:', toEmail);
};