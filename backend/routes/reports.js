const express = require('express');
const PDFDocument = require('pdfkit');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get summary stats
router.get('/summary', authenticate, async (req, res) => {
  const { data: events } = await supabase.from('events').select('id, name, status');
  const { count: totalHouses } = await supabase.from('houses').select('*', { count: 'exact', head: true });
  const { count: totalTokens } = await supabase.from('tokens').select('*', { count: 'exact', head: true });
  const { count: distributedTokens } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('status', 'distributed');
  const { count: flaggedTokens } = await supabase.from('tokens').select('*', { count: 'exact', head: true }).eq('is_flagged', true);

  res.json({ totalHouses, totalTokens, distributedTokens, pendingTokens: totalTokens - distributedTokens, flaggedTokens, events });
});

// Export tokens CSV
router.get('/export/csv/:eventId', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { data: tokens, error } = await supabase
    .from('tokens')
    .select('token_code, status, distributed_at, is_flagged, houses(owner_name, address, ward, phone), events(name)')
    .eq('event_id', req.params.eventId);

  if (error) return res.status(500).json({ error: error.message });

  const headers = ['Token Code', 'Owner Name', 'Address', 'Ward', 'Phone', 'Event', 'Status', 'Distributed At', 'Flagged'];
  const rows = tokens.map(t => [
    t.token_code, t.houses?.owner_name, t.houses?.address, t.houses?.ward,
    t.houses?.phone, t.events?.name, t.status, t.distributed_at || '', t.is_flagged ? 'Yes' : 'No'
  ]);

  const csv = [headers, ...rows].map(row => row.map(v => `"${v || ''}"`).join(',')).join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="event-${req.params.eventId}-report.csv"`);
  res.send(csv);
});

// Export PDF report
router.get('/export/pdf/:eventId', authenticate, requireRole('admin', 'supervisor'), async (req, res) => {
  const { data: event } = await supabase.from('events').select('*').eq('id', req.params.eventId).single();
  const { data: tokens } = await supabase
    .from('tokens')
    .select('token_code, status, distributed_at, is_flagged, houses(owner_name, ward)')
    .eq('event_id', req.params.eventId);

  const total = tokens.length;
  const distributed = tokens.filter(t => t.status === 'distributed').length;
  const flagged = tokens.filter(t => t.is_flagged).length;

  const doc = new PDFDocument({ margin: 50 });
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="report-${req.params.eventId}.pdf"`);
  doc.pipe(res);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text('Relief Distribution Report', { align: 'center' });
  doc.moveDown();
  doc.fontSize(14).font('Helvetica').text(`Event: ${event?.name}`);
  doc.text(`Period: ${event?.start_date} to ${event?.end_date}`);
  doc.text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  // Stats
  doc.fontSize(12).font('Helvetica-Bold').text('Summary');
  doc.font('Helvetica');
  doc.text(`Total Tokens: ${total}`);
  doc.text(`Distributed: ${distributed}`);
  doc.text(`Pending: ${total - distributed}`);
  doc.text(`Flagged: ${flagged}`);
  doc.moveDown();

  // Token list
  doc.font('Helvetica-Bold').text('Distribution Records');
  doc.font('Helvetica').fontSize(10);
  tokens.forEach((t, i) => {
    if (i > 0 && i % 40 === 0) doc.addPage();
    doc.text(`${t.token_code} | ${t.houses?.owner_name} | ${t.houses?.ward} | ${t.status} | ${t.distributed_at || 'Pending'} | ${t.is_flagged ? '⚠ FLAGGED' : 'OK'}`);
  });

  doc.end();
});

module.exports = router;
