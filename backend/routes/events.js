const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// ── Auto-close events whose end_date has passed ───────────────────────────
// Called before any GET so status is always accurate — no cron job needed
async function autoCloseExpiredEvents() {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const { error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('status', 'active')
    .lt('end_date', today);
  if (error) console.error('[AutoClose] Error:', error.message);
}

// Get all events
router.get('/', authenticate, async (req, res) => {
  // Auto-close expired events every time the list is loaded
  await autoCloseExpiredEvents();

  const { data, error } = await supabase
    .from('events')
    .select('*, tokens(count)')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single event with stats
router.get('/:id', authenticate, async (req, res) => {
  // Also auto-close when viewing a single event detail
  await autoCloseExpiredEvents();

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', req.params.id)
    .single();

  if (error) return res.status(404).json({ error: 'Event not found' });

  const { data: tokens } = await supabase
    .from('tokens')
    .select('status')
    .eq('event_id', req.params.id);

  const stats = {
    total: tokens?.length || 0,
    distributed: tokens?.filter(t => t.status === 'distributed').length || 0,
    pending: tokens?.filter(t => t.status === 'pending').length || 0,
    flagged: tokens?.filter(t => t.status === 'flagged').length || 0,
  };

  res.json({ ...event, stats });
});

// Create event + auto-generate tokens for all houses in assigned wards
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, description, start_date, end_date, wards, items } = req.body;
  if (!name || !start_date || !end_date)
    return res.status(400).json({ error: 'name, start_date, end_date are required' });

  // Create event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert([{ name, description, start_date, end_date, wards, items, status: 'active' }])
    .select()
    .single();

  if (eventError) return res.status(500).json({ error: eventError.message });

  // Fetch all houses (optionally filtered by ward)
  let housesQuery = supabase.from('houses').select('id');
  if (wards && wards.length > 0) housesQuery = housesQuery.in('ward', wards);
  const { data: houses } = await housesQuery;

  if (houses && houses.length > 0) {
    const crypto = require('crypto');
    const QRCode = require('qrcode');

    const tokenInserts = await Promise.all(houses.map(async (house) => {
      const token_code = crypto.randomUUID();
      const qr_code = await QRCode.toDataURL(token_code, { width: 300, margin: 1 });
      return { event_id: event.id, house_id: house.id, token_code, qr_code, status: 'pending' };
    }));

    await supabase.from('tokens').insert(tokenInserts);
  }

  res.status(201).json({ ...event, tokens_generated: houses?.length || 0 });
});

// Close event manually
router.patch('/:id/close', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .update({ status: 'closed' })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;