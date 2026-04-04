-- Run this file in your Supabase SQL Editor to set up the database and seed data.
-- This replaces the need for seed.js completely!

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  location TEXT NOT NULL,
  base_price INTEGER NOT NULL,
  rating DECIMAL(3, 1) NOT NULL,
  tags JSONB,
  image TEXT NOT NULL,
  about TEXT NOT NULL,
  highlights JSONB,
  nearby JSONB,
  amenity_boost DECIMAL(4, 2) DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS bookings (
  booking_code VARCHAR(100) PRIMARY KEY,
  status VARCHAR(50) DEFAULT 'pending',
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  hotel_id VARCHAR(50) REFERENCES hotels(id) ON DELETE CASCADE,
  room_tier VARCHAR(50) NOT NULL,
  guest_name VARCHAR(255) NOT NULL,
  guest_email VARCHAR(255) NOT NULL,
  guest_phone VARCHAR(50),
  checkin DATE NOT NULL,
  checkout DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL,
  rate_per_night INTEGER NOT NULL,
  total INTEGER NOT NULL,
  requests TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);

-- Seed admin user (password: Admin@2467)
-- We use a pre-hashed bcrypt password for Admin@2467 so you can log in immediately.
INSERT INTO users (name, email, password_hash, role)
VALUES ('Admin', 'admin@nocturne.stays', '$2a$10$U4K5f3tY5aWJg.o1FjGk/evC.J1OQjLg8Bv1yN3eY8gOq2eW9wG12', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Seed hotels
INSERT INTO hotels (id, name, city, location, base_price, rating, tags, image, about, highlights, nearby, amenity_boost) VALUES
('h1', 'Nebula Inn', 'Karachi', 'Karachi • Clifton • 9 min from Seaview', 8900, 4.3, '["Budget", "City", "Fast Wi-Fi"]'::jsonb, 'https://images.unsplash.com/photo-1554009975-d74653b879f1?w=500&auto=format&fit=crop&q=60', 'A clean, minimalist city hotel with quiet floors, fast Wi-Fi, and a solid restaurant. Perfect for quick business stays and short weekend resets.', '[{"title": "Quiet floors", "desc": "Acoustic insulation + blackout curtains"}, {"title": "Fast Wi-Fi", "desc": "Work-ready bandwidth included"}, {"title": "Breakfast", "desc": "Continental + local options"}, {"title": "Parking", "desc": "Secure underground parking"}]'::jsonb, '["Seaview", "Dolmen Mall", "Boat Basin"]'::jsonb, 0.0),
('h2', 'Aurum Residence', 'Lahore', 'Lahore • Gulberg • 12 min from MM Alam', 12900, 4.5, '["Modern", "Rooftop", "Great value"]'::jsonb, 'https://images.unsplash.com/photo-1535827841776-24afc1e255ac?auto=format&fit=crop&w=1800&q=60', 'Modern interiors with warm lighting, a rooftop lounge, and consistently strong service. A balanced pick for comfort without premium pricing.', '[{"title": "Rooftop lounge", "desc": "Sunset seating + late-night menu"}, {"title": "Gym", "desc": "Cardio + free weights"}, {"title": "Airport pickup", "desc": "Available on request"}, {"title": "Family-friendly", "desc": "Spacious layouts available"}]'::jsonb, '["MM Alam Road", "Liberty Market", "Jilani Park"]'::jsonb, 0.05),
('h3', 'Velvet Quarters', 'Islamabad', 'Islamabad • Blue Area • 6 min from Centaurus', 17800, 4.7, '["Boutique", "Spa", "Quiet"]'::jsonb, 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1800&q=60', 'Boutique feel with a high-end spa, silent corridors, and a refined dark aesthetic. Excellent for couples and long-stay guests.', '[{"title": "Spa & sauna", "desc": "Signature treatments + steam room"}, {"title": "Quiet guarantee", "desc": "Dedicated silent floors"}, {"title": "Restaurant", "desc": "Chef-led seasonal menu"}, {"title": "Late checkout", "desc": "Subject to admin approval"}]'::jsonb, '["Centaurus Mall", "F-6 Markaz", "Faisal Mosque"]'::jsonb, 0.10),
('h4', 'Obsidian Grand', 'Murree', 'Murree • Ridge Road • Forest views', 24500, 4.8, '["Mountain", "Infinity pool", "Premium"]'::jsonb, 'https://images.unsplash.com/photo-1541971875076-8f970d573be6?auto=format&fit=crop&w=1800&q=60', 'A premium mountain property with a heated infinity pool, panoramic views, and an iconic lounge that leans into the nocturne theme.', '[{"title": "Infinity pool", "desc": "Heated + view deck"}, {"title": "Concierge", "desc": "Curated local experiences"}, {"title": "Fireplace lounge", "desc": "Warm drinks + live music nights"}, {"title": "View rooms", "desc": "Forest or ridge panoramas"}]'::jsonb, '["Mall Road", "Patriata", "Pindi Point"]'::jsonb, 0.16),
('h5', 'Eclipse Palace', 'Dubai', 'Dubai • Downtown • Skyline & fountain views', 39900, 4.9, '["Ultra luxury", "Skyline", "Suite-first"]'::jsonb, 'https://images.unsplash.com/photo-1598605272254-16f0c0ecdfa5?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8ODN8fGhvdGVsfGVufDB8fDB8fHww', 'Ultra-luxury skyline stay with suites that feel cinematic: curated fragrance, premium linen, and concierge-level support for every request.', '[{"title": "Suite-first", "desc": "Largest layouts + lounge areas"}, {"title": "Concierge", "desc": "24/7 premium assistance"}, {"title": "Private transfers", "desc": "Luxury pickup available"}, {"title": "Dining", "desc": "Chef tables + rooftop bar"}]'::jsonb, '["Dubai Mall", "Burj Khalifa", "Fountain Walk"]'::jsonb, 0.24)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  city = EXCLUDED.city,
  location = EXCLUDED.location,
  base_price = EXCLUDED.base_price,
  rating = EXCLUDED.rating,
  tags = EXCLUDED.tags,
  image = EXCLUDED.image,
  about = EXCLUDED.about,
  highlights = EXCLUDED.highlights,
  nearby = EXCLUDED.nearby,
  amenity_boost = EXCLUDED.amenity_boost;
