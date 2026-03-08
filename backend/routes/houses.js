const express = require('express');
const multer = require('multer');
const { parse } = require('csv-parse/sync');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Get all houses
router.get('/', authenticate, async (req, res) => {
  const { ward, search, page = 1, limit = 50 } = req.query;
  let query = supabase.from('houses').select('*', { count: 'exact' });

  if (ward) query = query.eq('ward', ward);
  if (search) query = query.ilike('owner_name', `%${search}%`);

  const from = (page - 1) * limit;
  query = query.range(from, from + limit - 1).order('created_at', { ascending: false });

  const { data, error, count } = await query;
  if (error) return res.status(500).json({ error: error.message });
  res.json({ data, count, page: Number(page), limit: Number(limit) });
});

// Get single house
router.get('/:id', authenticate, async (req, res) => {
  const { data, error } = await supabase.from('houses').select('*').eq('id', req.params.id).single();
  if (error) return res.status(404).json({ error: 'House not found' });
  res.json(data);
});

// Create house
router.post('/', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { owner_name, address, ward, members_count, phone, ration_card_number } = req.body;
  if (!owner_name || !address || !ward)
    return res.status(400).json({ error: 'owner_name, address, ward are required' });

  const { data, error } = await supabase.from('houses').insert([{ owner_name, address, ward, members_count, phone, ration_card_number }]).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

// Update house
router.put('/:id', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { data, error } = await supabase.from('houses').update(req.body).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete house
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  const { error } = await supabase.from('houses').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'House deleted' });
});

// CSV bulk import
router.post('/import/csv', authenticate, requireRole('admin', 'supervisor'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let records;
  try {
    records = parse(req.file.buffer.toString(), {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (err) {
    return res.status(400).json({ error: 'Invalid CSV format' });
  }

  const inserted = [];
  const skipped = [];

  for (const row of records) {
    if (!row.owner_name || !row.address || !row.ward) {
      skipped.push({ row, reason: 'Missing required fields' });
      continue;
    }
    const { data, error } = await supabase
      .from('houses')
      .insert([{ owner_name: row.owner_name, address: row.address, ward: row.ward, members_count: row.members_count || 1, phone: row.phone, ration_card_number: row.ration_card_number }])
      .select()
      .single();
    if (error) skipped.push({ row, reason: error.message });
    else inserted.push(data);
  }

  res.json({ inserted: inserted.length, skipped: skipped.length, skippedRecords: skipped });
});

module.exports = router;
