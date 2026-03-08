const express = require('express');
const supabase = require('../utils/supabase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin only)
router.get('/', authenticate, requireRole('admin'), async (req, res) => {
  const { data, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Create user (admin only)
router.post('/', authenticate, requireRole('admin'), async (req, res) => {
  const { email, password, name, role, ward } = req.body;
  if (!email || !password || !role)
    return res.status(400).json({ error: 'email, password, role required' });

  const { data: authUser, error: authError } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
  if (authError) return res.status(500).json({ error: authError.message });

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .insert([{ id: authUser.user.id, email, name, role, ward }])
    .select()
    .single();

  if (profileError) return res.status(500).json({ error: profileError.message });
  res.status(201).json(profile);
});

// Update user role
router.patch('/:id/role', authenticate, requireRole('admin'), async (req, res) => {
  const { role, ward } = req.body;
  const { data, error } = await supabase.from('profiles').update({ role, ward }).eq('id', req.params.id).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Delete user
router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  await supabase.auth.admin.deleteUser(req.params.id);
  const { error } = await supabase.from('profiles').delete().eq('id', req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ message: 'User deleted' });
});

module.exports = router;
