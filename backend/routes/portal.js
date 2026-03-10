const express = require('express');
const supabase = require('../utils/supabase');

const router = express.Router();

// In-memory OTP store
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Send OTP via Brevo (Sendinblue) API
// Free tier: 300 emails/day to ANY email address — no domain needed
async function sendOTPEmail(toEmail, otp, ownerName) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': process.env.BREVO_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      sender: {
        name: 'ReliefOps',
        email: process.env.BREVO_SENDER_EMAIL,
      },
      to: [{ email: toEmail, name: ownerName }],
      subject: 'Your ReliefOps OTP Code',
      htmlContent: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">&#128737; ReliefOps</h1>
            <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Digital Relief Distribution System</p>
          </div>
          <div style="background: #fff; border-radius: 10px; padding: 24px; text-align: center;">
            <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Hello <strong>${ownerName}</strong>,</p>
            <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Your one-time password to access your relief token is:</p>
            <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
              <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1d4ed8;">${otp}</span>
            </div>
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.
            </p>
          </div>
          <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px;">
            If you did not request this, please contact your ward office.
          </p>
        </div>
      `,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || `Brevo API error: ${response.status}`);
  }
  return data;
}

// Step 1: Request OTP by phone number
router.post('/request-otp', async (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });

  // Find house with this phone number
  const { data: house, error } = await supabase
    .from('houses')
    .select('id, owner_name, phone, email')
    .eq('phone', phone.trim())
    .single();

  if (error || !house) {
    return res.status(404).json({ error: 'No household found with this phone number' });
  }

  if (!house.email) {
    return res.status(400).json({ error: 'No email registered for this household. Please contact your ward office.' });
  }

  // Generate OTP
  const otp = generateOTP();
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

  // Store in memory
  otpStore.set(phone.trim(), {
    otp,
    expiresAt,
    email: house.email,
    houseId: house.id,
    ownerName: house.owner_name,
  });

  // Send via Brevo
  try {
    await sendOTPEmail(house.email, otp, house.owner_name);
    console.log(`[OTP SENT] Phone: ${phone} | Email: ${house.email}`);
  } catch (emailErr) {
    console.error('[OTP EMAIL FAILED]', emailErr.message);
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }
    // Dev fallback — show OTP in response
    console.log(`[DEV FALLBACK] OTP for ${phone}: ${otp}`);
  }

  res.json({
    success: true,
    message: 'OTP sent to your registered email address',
    maskedEmail: house.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    // Show OTP only in development mode
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  });
});

// Step 2: Verify OTP and return tokens
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const stored = otpStore.get(phone.trim());
  if (!stored) {
    return res.status(400).json({ error: 'No OTP requested for this number. Please request again.' });
  }
  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone.trim());
    return res.status(400).json({ error: 'OTP expired. Please request a new one.' });
  }
  if (stored.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
  }

  // Valid — clear OTP (one time use)
  otpStore.delete(phone.trim());

  // Fetch tokens for this household
  const { data: tokens, error: tokenError } = await supabase
    .from('tokens')
    .select(`
      id,
      token_code,
      qr_code,
      status,
      distributed_at,
      events (
        id, name, description,
        start_date, end_date,
        status, items
      ),
      houses (
        owner_name, address,
        ward, members_count
      )
    `)
    .eq('house_id', stored.houseId)
    .order('created_at', { ascending: false });

  if (tokenError) return res.status(500).json({ error: 'Failed to fetch tokens' });

  // Sort — active events first
  const sorted = [...tokens].sort((a, b) => {
    if (a.events?.status === 'active' && b.events?.status !== 'active') return -1;
    if (b.events?.status === 'active' && a.events?.status !== 'active') return 1;
    return 0;
  });

  res.json({
    success: true,
    ownerName: stored.ownerName,
    tokens: sorted,
  });
});

module.exports = router;