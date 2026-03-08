const express = require('express');
const jwt = require('jsonwebtoken');
const supabase = require('../utils/supabase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Email and password required' });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return res.status(401).json({ error: 'Invalid credentials' });

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  const token = jwt.sign(
    { id: data.user.id, email: data.user.email, role: profile?.role || 'distributor', ward: profile?.ward },
    process.env.JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({ token, user: { id: data.user.id, email: data.user.email, role: profile?.role, ward: profile?.ward, name: profile?.name } });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', req.user.id)
    .single();
  res.json(profile);
});

module.exports = router;
