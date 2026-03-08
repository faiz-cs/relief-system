const express = require('express');
const QRCode = require('qrcode');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all events
router.get('/', authenticate, async (req, res) => {
  const { data, error } = await supabase
    .from('events')
    .select('*, tokens(count)')
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Get single event with stats
router.get('/:id', authenticate, async (req, res) => {
  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('id', req.params.id)
    .single();
  if (error) return res.status(404).json({ error: 'Event not found' });

  const { count: total } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('event_id', req.params.id);
  const { count: distributed } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('event_id', req.params.id).eq('status', 'distributed');
  const { count: flagged } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('event_id', req.params.id).eq('is_flagged', true);

  res.json({ ...event, stats: { total, distributed, pending: total - distributed, flagged } });
});

// Create event and auto-generate tokens
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { name, description, start_date, end_date, wards, items } = req.body;
  if (!name || !start_date || !end_date)
    return res.status(400).json({ error: 'name, start_date, end_date required' });

  // Create event
  const { data: event, error: eventError } = await supabase
    .from('events')
    .insert([{ name, description, start_date, end_date, wards, items, status: 'active', created_by: req.user.id }])
    .select()
    .single();
  if (eventError) return res.status(500).json({ error: eventError.message });

  // Fetch eligible houses
  let houseQuery = supabase.from('houses').select('id, ward');
  if (wards && wards.length > 0) houseQuery = houseQuery.in('ward', wards);
  const { data: houses, error: housesError } = await houseQuery;
  if (housesError) return res.status(500).json({ error: housesError.message });

  // Generate tokens for each house
  const tokenInserts = [];
  for (const house of houses) {
    const tokenCode = `${event.id.slice(0, 8).toUpperCase()}-${house.id.slice(0, 6).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
    const qrData = JSON.stringify({ tokenCode, eventId: event.id, houseId: house.id });
    const qrCodeDataUrl = await QRCode.toDataURL(qrData, { width: 300, margin: 2 });
    tokenInserts.push({ event_id: event.id, house_id: house.id, token_code: tokenCode, qr_code: qrCodeDataUrl, status: 'pending', is_flagged: false });
  }

  // Batch insert tokens
  const { error: tokenError } = await supabase.from('tokens').insert(tokenInserts);
  if (tokenError) return res.status(500).json({ error: tokenError.message });

  res.status(201).json({ event, tokensGenerated: tokenInserts.length });
});

// Update event
router.put('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('events').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Close event
router.patch('/:id/close', authenticate, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('events').update({ status: 'closed' }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
