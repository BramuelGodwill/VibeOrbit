const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

exports.sendResetEmail = async(toEmail, resetUrl) => {
    console.log('Sending reset email to:', toEmail);

    const { data, error } = await resend.emails.send({
        from: 'VibeOrbit <onboarding@resend.dev>',
        to: toEmail,
        subject: 'VibeOrbit — Reset Your Password',
        html: `
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
                    We received a request to reset the password for your VibeOrbit account.
                    Click the button below to set a new password.
                    This link will expire in <strong style="color:#fff;">1 hour</strong>.
                  </p>
                  <a href="${resetUrl}"
                    style="display:inline-block;background:#fff;color:#000;
                           padding:16px 36px;text-decoration:none;
                           font-weight:700;font-size:15px;border-radius:6px;">
                    Reset Password
                  </a>
                  <p style="color:#555;font-size:12px;margin:28px 0 0;line-height:1.6;">
                    If you did not request a password reset, you can safely ignore this email.
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
    `,
    });

    if (error) {
        console.error('Resend error:', error);
        throw new Error(error.message);
    }

    console.log('Email sent successfully:', data);
};