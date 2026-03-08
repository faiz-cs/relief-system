const express = require('express');
const nodemailer = require('nodemailer');
const supabase = require('../utils/supabase');

const router = express.Router();

// In-memory OTP store { phone: { otp, expiresAt, email, houseId, ownerName } }
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Nodemailer transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Send OTP email
async function sendOTPEmail(toEmail, otp, ownerName) {
  const mailOptions = {
    from: `"Reliefcollection" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your Reliefcollection OTP Code',
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px; background: #f8fafc; border-radius: 12px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #1a1a2e; font-size: 24px; margin: 0;">🛡 Reliefcollection</h1>
          <p style="color: #6b7280; font-size: 14px; margin: 4px 0 0;">Digital Relief Distribution System</p>
        </div>
        <div style="background: #fff; border-radius: 10px; padding: 24px; text-align: center;">
          <p style="color: #374151; font-size: 15px; margin: 0 0 16px;">Hello <strong>${ownerName}</strong>,</p>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">Your one-time password to access your relief token is:</p>
          <div style="background: #eff6ff; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
            <span style="font-size: 40px; font-weight: 700; letter-spacing: 12px; color: #1d4ed8;">${otp}</span>
          </div>
          <p style="color: #9ca3af; font-size: 12px; margin: 0;">This OTP is valid for <strong>5 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <p style="text-align: center; color: #9ca3af; font-size: 11px; margin-top: 20px;">
          If you did not request this, please contact your ward office.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
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

  // Store OTP in memory
  otpStore.set(phone.trim(), {
    otp,
    expiresAt,
    email: house.email,
    houseId: house.id,
    ownerName: house.owner_name,
  });

  // Send OTP via Gmail (Nodemailer)
  try {
    await sendOTPEmail(house.email, otp, house.owner_name);
    console.log(`[OTP SENT] Phone: ${phone} | Email: ${house.email}`);
  } catch (emailErr) {
    console.error('[OTP EMAIL FAILED]', emailErr.message);
    // In dev mode still work, in production fail gracefully
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({ error: 'Failed to send OTP email. Please try again.' });
    }
    console.log(`[DEV FALLBACK] OTP for ${phone}: ${otp}`);
  }

  res.json({
    success: true,
    message: 'OTP sent to your registered email address',
    maskedEmail: house.email.replace(/(.{2})(.*)(@.*)/, '$1***$3'),
    // Show OTP on screen only in development
    devOtp: process.env.NODE_ENV !== 'production' ? otp : undefined,
  });
});

// Step 2: Verify OTP and return tokens
router.post('/verify-otp', async (req, res) => {
  const { phone, otp } = req.body;
  if (!phone || !otp) return res.status(400).json({ error: 'Phone and OTP are required' });

  const stored = otpStore.get(phone.trim());

  if (!stored) {
    return res.status(400).json({ error: 'No OTP requested for this phone number. Please request again.' });
  }

  if (Date.now() > stored.expiresAt) {
    otpStore.delete(phone.trim());
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }

  if (stored.otp !== otp.trim()) {
    return res.status(400).json({ error: 'Incorrect OTP. Please try again.' });
  }

  // OTP is valid — clear it (one time use)
  otpStore.delete(phone.trim());

  // Fetch all tokens for this house across active events
  const { data: tokens, error: tokenError } = await supabase
    .from('tokens')
    .select(`
      id,
      token_code,
      qr_code,
      status,
      distributed_at,
      events (
        id,
        name,
        description,
        start_date,
        end_date,
        status,
        items
      ),
      houses (
        owner_name,
        address,
        ward,
        members_count
      )
    `)
    .eq('house_id', stored.houseId)
    .order('created_at', { ascending: false });

  if (tokenError) return res.status(500).json({ error: 'Failed to fetch tokens' });

  // Filter to show active event tokens first, then rest
  const sorted = [...tokens].sort((a, b) => {
    if (a.events?.status === 'active' && b.events?.status !== 'active') return -1;
    if (b.events?.status === 'active' && a.events?.status !== 'active') return 1;
    return 0;
  });

  res.json({
    success: true,
    ownerName: stored.ownerName,
    tokens: sorted
  });
});

module.exports = router;
