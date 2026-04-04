require('dotenv').config({ path: __dirname + '/.env.local' });

const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('./db'); // Now using Supabase client

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Serve frontend (index.html in dist folder at parent directory)
app.use(express.static(path.join(__dirname, '..', 'dist')));

const PORT = Number(process.env.PORT || 3000);
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';

const ROOM_MULT = {
  standard: 1.0,
  deluxe: 1.35,
  suite: 1.85
};

function apiError(res, status, message){
  return res.status(status).json({ error: message });
}

function signToken(user){
  return jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

async function getUserById(id){
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email, role, created_at')
    .eq('id', id)
    .single();
  
  if (error) return null;
  return data;
}

function requireAuth(req, res, next){
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if(!token) return apiError(res, 401, 'Unauthorized');
  try{
    req.auth = jwt.verify(token, JWT_SECRET);
    return next();
  }catch{
    return apiError(res, 401, 'Invalid token');
  }
}

function requireAdmin(req, res, next){
  if(req.auth?.role !== 'admin') return apiError(res, 403, 'Admin only');
  next();
}

function uid(prefix='NS'){
  const rand = Math.random().toString(16).slice(2, 10).toUpperCase();
  const ts = Date.now().toString(36).toUpperCase();
  return `${prefix}-${ts}-${rand}`;
}

function nightsBetween(checkin, checkout){
  const a = new Date(checkin);
  const b = new Date(checkout);
  const diff = Math.round((b - a) / (1000*60*60*24));
  return diff;
}

function clamp(n, min, max){
  return Math.max(min, Math.min(max, n));
}

function parseJSONField(v, fallback){
  if(v == null) return fallback;
  if(typeof v === 'object') return v;
  try{ return JSON.parse(v); }catch{ return fallback; }
}

function bookingRowToDTO(row){
  return {
    bookingCode: row.booking_code,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
    status: row.status,
    createdBy: { email: row.user_email, name: row.user_name },
    hotel: {
      id: row.hotel_id,
      name: row.hotel_name,
      location: row.hotel_location,
      city: row.hotel_city
    },
    roomTier: row.room_tier,
    guest: { name: row.guest_name, email: row.guest_email, phone: row.guest_phone },
    stay: {
      checkin: new Date(row.checkin).toISOString().slice(0,10),
      checkout: new Date(row.checkout).toISOString().slice(0,10),
      nights: row.nights,
      guests: row.guests
    },
    pricing: { ratePerNight: row.rate_per_night, total: row.total, currency: 'PKR' },
    requests: row.requests || ''
  };
}

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const { data, error } = await supabase.from('hotels').select('id').limit(1);
    if (error) throw error;
    res.json({ ok: true, message: 'Database connected' });
  } catch (err) {
    console.error('Health check failed:', err);
    res.status(500).json({ ok: false, error: 'Database connection failed' });
  }
});

// Hotels
app.get('/api/hotels', async (req,res)=>{
  try{
    const { data: rows, error } = await supabase
      .from('hotels')
      .select('*')
      .order('base_price', { ascending: true });
    
    if (error) throw error;

    const hotels = rows.map(r=>({
      id: r.id,
      name: r.name,
      city: r.city,
      location: r.location,
      from: Number(r.base_price),
      rating: Number(r.rating),
      tags: parseJSONField(r.tags, []),
      image: r.image,
      about: r.about,
      highlights: parseJSONField(r.highlights, []),
      nearby: parseJSONField(r.nearby, []),
      amenityBoost: Number(r.amenity_boost || 0)
    }));
    res.json({ hotels });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Failed to load hotels');
  }
});

// Auth
app.post('/api/auth/register', async (req,res)=>{
  try{
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');

    if(!name) return apiError(res, 400, 'Name required');
    if(!email) return apiError(res, 400, 'Email required');
    if(password.length < 8) return apiError(res, 400, 'Password must be at least 8 characters');

    const { data: exists } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if(exists) return apiError(res, 409, 'Email already registered');

    const hash = await bcrypt.hash(password, 10);
    const { data: inserted, error } = await supabase
      .from('users')
      .insert([{ name, email, password_hash: hash, role: 'user' }])
      .select('id')
      .single();

    if (error) throw error;

    const user = { id: inserted.id, name, email, role: 'user' };
    res.json({ user });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Register failed');
  }
});

app.post('/api/auth/login', async (req,res)=>{
  try{
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const asAdmin = !!req.body.asAdmin;

    if(!email || !password) return apiError(res, 400, 'Email and password required');

    const { data: u, error } = await supabase
      .from('users')
      .select('id, name, email, role, password_hash')
      .eq('email', email)
      .single();
    
    if(error || !u) return apiError(res, 404, 'User not found');

    const ok = await bcrypt.compare(password, u.password_hash);
    if(!ok) return apiError(res, 401, 'Wrong password');

    if(asAdmin && u.role !== 'admin') return apiError(res, 403, 'Not an admin account');

    const token = signToken(u);
    res.json({ token, user: { id: u.id, name: u.name, email: u.email, role: u.role } });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Login failed');
  }
});

app.get('/api/auth/me', requireAuth, async (req,res)=>{
  try{
    const user = await getUserById(req.auth.id);
    if(!user) return apiError(res, 401, 'Unauthorized');
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Failed to load session');
  }
});

// Bookings (user)
app.post('/api/bookings', requireAuth, async (req,res)=>{
  try{
    if(req.auth.role !== 'user') return apiError(res, 403, 'Only users can create bookings');

    const user = await getUserById(req.auth.id);
    if(!user) return apiError(res, 401, 'Unauthorized');

    const hotelId = String(req.body.hotelId || '').trim();
    const roomTier = String(req.body.roomTier || '').trim();
    const guestName = String(req.body.guestName || '').trim();
    const guestEmail = String(req.body.guestEmail || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const checkin = String(req.body.checkin || '').trim();
    const checkout = String(req.body.checkout || '').trim();
    const guests = clamp(parseInt(req.body.guests || 1, 10), 1, 6);
    const requests = String(req.body.requests || '').trim();

    if(!hotelId) return apiError(res, 400, 'Hotel required');
    if(!ROOM_MULT[roomTier]) return apiError(res, 400, 'Invalid room tier');
    if(!guestName) return apiError(res, 400, 'Guest name required');
    if(!guestEmail) return apiError(res, 400, 'Guest email required');
    if(!checkin || !checkout) return apiError(res, 400, 'Dates required');

    const nights = nightsBetween(checkin, checkout);
    if(!Number.isFinite(nights) || nights <= 0) return apiError(res, 400, 'Check-out must be after check-in');

    const { data: h, error: hotelError } = await supabase
      .from('hotels')
      .select('id, name, city, location, base_price, amenity_boost, rating')
      .eq('id', hotelId)
      .single();
    
    if(hotelError || !h) return apiError(res, 404, 'Hotel not found');

    const base = Number(h.base_price);
    const mult = ROOM_MULT[roomTier];
    const amenity = 1 + Number(h.amenity_boost || 0);
    const ratePerNight = Math.round(base * mult * amenity);

    const guestAdj = 1 + Math.max(0, (guests - 2)) * 0.08;
    const total = Math.round(nights * ratePerNight * guestAdj);

    const bookingCode = uid('NS');

    const { error: insertError } = await supabase
      .from('bookings')
      .insert([{
        booking_code: bookingCode,
        status: 'pending',
        user_id: user.id,
        hotel_id: hotelId,
        room_tier: roomTier,
        guest_name: guestName,
        guest_email: guestEmail,
        guest_phone: phone || null,
        checkin,
        checkout,
        nights,
        guests,
        rate_per_night: ratePerNight,
        total,
        requests: requests || null
      }]);

    if (insertError) throw insertError;

    const booking = {
      bookingCode,
      createdAt: new Date().toISOString(),
      status: 'pending',
      createdBy: { email: user.email, name: user.name },
      hotel: { id: h.id, name: h.name, location: h.location, city: h.city },
      roomTier,
      guest: { name: guestName, email: guestEmail, phone: phone || '' },
      stay: { checkin, checkout, nights, guests },
      pricing: { ratePerNight, total, currency: 'PKR' },
      requests
    };

    res.json({ booking });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Booking failed');
  }
});

app.get('/api/bookings/mine', requireAuth, async (req,res)=>{
  try{
    const user = await getUserById(req.auth.id);
    if(!user) return apiError(res, 401, 'Unauthorized');

    if(req.auth.role !== 'user') return apiError(res, 403, 'Only users can view this list');

    const { data: rows, error } = await supabase
      .from('bookings')
      .select(`
        *,
        user:users!user_id(name, email),
        hotel:hotels!hotel_id(name, city, location)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bookings = rows.map(b => bookingRowToDTO({
      ...b,
      user_name: b.user.name,
      user_email: b.user.email,
      hotel_name: b.hotel.name,
      hotel_city: b.hotel.city,
      hotel_location: b.hotel.location
    }));

    res.json({ bookings });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Failed to load bookings');
  }
});

// Admin
app.get('/api/admin/bookings', requireAuth, requireAdmin, async (req,res)=>{
  try{
    const { data: rows, error } = await supabase
      .from('bookings')
      .select(`
        *,
        user:users!user_id(name, email),
        hotel:hotels!hotel_id(name, city, location)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const bookings = rows.map(b => bookingRowToDTO({
      ...b,
      user_name: b.user.name,
      user_email: b.user.email,
      hotel_name: b.hotel.name,
      hotel_city: b.hotel.city,
      hotel_location: b.hotel.location
    }));

    res.json({ bookings });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Failed to load admin bookings');
  }
});

app.put('/api/admin/bookings/:code/status', requireAuth, requireAdmin, async (req,res)=>{
  try{
    const code = String(req.params.code || '').trim();
    const status = String(req.body.status || '').trim();
    if(!['approved','declined','pending'].includes(status)) return apiError(res, 400, 'Invalid status');

    const { error } = await supabase
      .from('bookings')
      .update({ status })
      .eq('booking_code', code);
    
    if (error) throw error;

    res.json({ ok: true });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Failed to update booking');
  }
});

app.get('/api/admin/export', requireAuth, requireAdmin, async (req,res)=>{
  try{
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, email, role, created_at')
      .order('id', { ascending: true });
    
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .order('created_at', { ascending: false });

    if (usersError) throw usersError;
    if (bookingsError) throw bookingsError;

    res.json({ users, bookings });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Export failed');
  }
});

app.delete('/api/admin/clear', requireAuth, requireAdmin, async (req,res)=>{
  try{
    await supabase.from('bookings').delete().neq('booking_code', '');
    await supabase.from('users').delete().eq('role', 'user');
    res.json({ ok: true });
  }catch(err){
    console.error(err);
    apiError(res, 500, 'Clear failed');
  }
});

// SPA fallback
app.get('*', (req,res)=>{
  res.sendFile(path.join(__dirname, '..', 'dist', 'index.html'));
});

app.listen(PORT, ()=>{
  console.log(`🚀 Nocturne Stays server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});