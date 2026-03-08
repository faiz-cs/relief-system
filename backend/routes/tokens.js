const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');
const { checkFraud } = require('../utils/fraudDetection');

const router = express.Router();

// Get tokens for an event
router.get('/event/:eventId', authenticate, async (req, res) => {
  const { status, ward, flagged } = req.query;
  let query = supabase
    .from('tokens')
    .select('*, houses(owner_name, address, ward, phone), events(name)')
    .eq('event_id', req.params.eventId);

  if (status) query = query.eq('status', status);
  if (flagged === 'true') query = query.eq('is_flagged', true);
  if (ward) query = query.eq('houses.ward', ward);

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get token by code (for QR scan lookup)
router.get('/scan/:tokenCode', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, houses(*), events(*)')
    .eq('token_code', req.params.tokenCode)
    .single();
  if (error) return res.status(404).json({ error: 'Token not found' });
  res.json(data);
});

// Mark token as distributed (QR scan endpoint)
router.post('/distribute', authenticate, requireRole('admin', 'supervisor', 'distributor'), async (req, res) => {
  const { token_code } = req.body;
  if (!token_code) return res.status(400).json({ error: 'token_code required' });

  const { data: token, error: fetchError } = await supabase
    .from('tokens')
    .select('*, houses(*), events(*)')
    .eq('token_code', token_code)
    .single();

  if (fetchError || !token) return res.status(404).json({ error: 'Token not found' });

  const scannedAt = new Date().toISOString();

  // Run fraud detection
  const fraudResult = await checkFraud(supabase, {
    token: { ...token, distributor_ward: req.user.ward },
    distributorId: req.user.id,
    scannedAt,
  });

  // Block high severity fraud
  if (fraudResult.hasHighSeverity) {
    // Log the attempt
    await supabase.from('fraud_logs').insert([{
      token_id: token.id,
      distributor_id: req.user.id,
      flags: fraudResult.flags,
      scanned_at: scannedAt,
      blocked: true,
    }]);
    return res.status(403).json({ error: 'Distribution blocked', flags: fraudResult.flags });
  }

  // Update token
  const { data: updated, error: updateError } = await supabase
    .from('tokens')
    .update({
      status: 'distributed',
      distributed_at: scannedAt,
      distributed_by: req.user.id,
      is_flagged: fraudResult.isFlagged,
      fraud_flags: fraudResult.flags,
    })
    .eq('id', token.id)
    .select()
    .single();

  if (updateError) return res.status(500).json({ error: updateError.message });

  res.json({ success: true, token: updated, warnings: fraudResult.flags });
});

// Resolve flagged token
router.patch('/:id/resolve', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { resolution_note } = req.body;
  const { data, error } = await supabase
    .from('tokens')
    .update({ is_flagged: false, resolution_note, resolved_by: req.user.id, resolved_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get flagged tokens
router.get('/flagged/all', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { data, error } = await supabase
    .from('tokens')
    .select('*, houses(owner_name, ward), events(name)')
    .eq('is_flagged', true)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
