-- ============================================================
-- WanderNest Travel Planning & Mood-Based Tourism Platform
-- Comprehensive Database Schema & Seed Data
-- Aligned with:
--   1. Mood-Based Tourism Recommendation ER Diagram (USER, MOOD, DESTINATION, TRIP_PLAN, FAVORITE, REVIEW)
--   2. WanderNest Interactive Itinerary & Expense Tracker (trips, itinerary_days, itinerary_items, expenses, saved_places)
--   3. Compatibility Views (user, mood, destination, trip_plan, favorite, review)
-- ============================================================

-- Disable foreign key checks during schema definition for safety
SET FOREIGN_KEY_CHECKS = 0;

-- ------------------------------------------------------------
-- 1. USER TABLE (ER Diagram: USER)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  user_id VARCHAR(128) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  preference VARCHAR(255) DEFAULT 'Adventure, Culture, Relaxation',
  profile_image TEXT,
  join_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 2. MOOD TABLE (ER Diagram: MOOD)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS moods (
  mood_id VARCHAR(64) PRIMARY KEY,
  mood_name VARCHAR(100) NOT NULL,
  description TEXT,
  image_icon TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 3. DESTINATION TABLE (ER Diagram: DESTINATION)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS destinations (
  destination_id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  location VARCHAR(255) NOT NULL,
  description TEXT,
  budget DECIMAL(10, 2) DEFAULT 0.00,
  best_season VARCHAR(100),
  mood_type VARCHAR(64),
  image TEXT,
  average_rating DECIMAL(3, 2) DEFAULT 4.50,
  country VARCHAR(128),
  latitude DECIMAL(10, 7),
  longitude DECIMAL(10, 7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (mood_type) REFERENCES moods(mood_id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 4. TRIP_PLAN TABLE (ER Diagram: TRIP_PLAN)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trip_plans (
  trip_id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  destination_id VARCHAR(64),
  travel_date DATE,
  duration_days INT DEFAULT 3,
  estimated_cost DECIMAL(10, 2) DEFAULT 0.00,
  transport_type VARCHAR(100) DEFAULT 'Flight',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE SET NULL
);

-- ------------------------------------------------------------
-- 5. FAVORITE TABLE (ER Diagram: FAVORITE)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS favorites (
  favorite_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  destination_id VARCHAR(64) NOT NULL,
  saved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_user_fav_dest (user_id, destination_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 6. REVIEW TABLE (ER Diagram: REVIEW)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reviews (
  review_id INT AUTO_INCREMENT PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  destination_id VARCHAR(64) NOT NULL,
  rating DECIMAL(2, 1) NOT NULL DEFAULT 5.0,
  comment TEXT,
  review_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
  FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 7. TRIPS TABLE (WanderNest Interactive Itinerary Planner)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  title VARCHAR(255) NOT NULL,
  destination VARCHAR(255) NOT NULL,
  country VARCHAR(128),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  start_date DATE,
  end_date DATE,
  cover_image TEXT,
  budget DECIMAL(10, 2) DEFAULT 0.00,
  currency VARCHAR(10) DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- 8. ITINERARY_DAYS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  day_number INT NOT NULL,
  date DATE,
  title VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 9. ITINERARY_ITEMS TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS itinerary_items (
  id VARCHAR(64) PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  day_number INT DEFAULT 1,
  place_id VARCHAR(128),
  name VARCHAR(255) NOT NULL,
  category ENUM('do', 'eat', 'stay') DEFAULT 'do',
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  address VARCHAR(500),
  photo_url TEXT,
  rating DECIMAL(3, 1) DEFAULT 4.5,
  user_rating INT DEFAULT 0,
  user_notes TEXT,
  order_index INT DEFAULT 0,
  estimated_time VARCHAR(50),
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 10. EXPENSES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS expenses (
  id VARCHAR(64) PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  title VARCHAR(255) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  category ENUM('Food', 'Lodging', 'Activities', 'Transport', 'Other') DEFAULT 'Other',
  date DATE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- 11. SAVED_PLACES TABLE
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS saved_places (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(128) NOT NULL,
  place_id VARCHAR(128) NOT NULL,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(50),
  latitude DECIMAL(10, 7) NOT NULL,
  longitude DECIMAL(10, 7) NOT NULL,
  photo_url TEXT,
  address VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- COMPATIBILITY VIEWS (Supports singular ER naming)
-- ------------------------------------------------------------
CREATE OR REPLACE VIEW user AS SELECT * FROM users;
CREATE OR REPLACE VIEW mood AS SELECT * FROM moods;
CREATE OR REPLACE VIEW destination AS SELECT * FROM destinations;
CREATE OR REPLACE VIEW trip_plan AS SELECT * FROM trip_plans;
CREATE OR REPLACE VIEW favorite AS SELECT * FROM favorites;
CREATE OR REPLACE VIEW review AS SELECT * FROM reviews;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;


-- ============================================================
-- SHOWCASE INITIAL SEED DATA
-- (Idempotent: uses INSERT IGNORE so it won't duplicate on re-run)
-- ============================================================

-- 1. SEED USERS
INSERT IGNORE INTO users (user_id, name, email, password, phone, preference, profile_image, role) VALUES
('admin_root', 'WanderNest Administrator', 'admin@wandernest.com', '$2b$10$AdminHashWanderNest2026SecurePass!', '+1-555-0199', 'Adventure, Culture, Luxury', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80', 'admin'),
('user_alex_rivers', 'Alex Rivers', 'alex.traveler@example.com', '$2b$10$UserHashAlexRivers2026SecurePass!', '+1-555-0142', 'Adventure, Nature, Photography', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=400&q=80', 'user'),
('user_sophia_chen', 'Sophia Chen', 'sophia.g@example.com', '$2b$10$UserHashSophiaChen2026SecurePass!', '+1-555-0178', 'Culture, Art, Food, Relaxation', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80', 'user'),
('user_demo_traveler', 'Demo Explorer', 'demo@wandernest.com', '$2b$10$DemoExplorer2026SecurePass!', '+1-555-0111', 'Beach, Relaxation, Island', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80', 'user');

-- 2. SEED MOODS (Mood Categories from Recommendation Engine)
INSERT IGNORE INTO moods (mood_id, mood_name, description, image_icon) VALUES
('mood_adventure', 'Adventure & Thrill', 'High-adrenaline outdoor excursions, mountain trekking, and extreme sports.', 'Compass'),
('mood_relaxed', 'Relaxed & Peaceful', 'Quiet retreats, scenic hot springs, pristine nature, and mindfulness.', 'Sun'),
('mood_romantic', 'Romantic & Cozy', 'Enchanting cobblestone streets, sunset dinners, boutique stays, and intimate views.', 'Heart'),
('mood_cultural', 'Cultural & Historical', 'Ancient heritage sites, historic monuments, museums, and local traditions.', 'Landmark'),
('mood_beach', 'Beach & Island Escape', 'White sand coastlines, turquoise waters, tropical coral diving, and coastal bliss.', 'Palmtree'),
('mood_urban', 'Urban & Vibrant', 'World-class skylines, nightlife, Michelin gastronomy, and metropolitan energy.', 'Building');

-- 3. SEED DESTINATIONS
INSERT IGNORE INTO destinations (destination_id, name, location, description, budget, best_season, mood_type, image, average_rating, country, latitude, longitude) VALUES
('dest_tokyo', 'Tokyo', 'Tokyo Prefecture, Kanto', 'Futuristic skyscrapers meet ancient shrines in Japan’s thrilling, world-renowned capital.', 2400.00, 'Spring & Autumn', 'mood_urban', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80', 4.88, 'Japan', 35.6762, 139.6503),
('dest_paris', 'Paris', 'Île-de-France', 'The City of Light, home to the Eiffel Tower, the Louvre Museum, and legendary romantic charm.', 2800.00, 'April to October', 'mood_romantic', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', 4.82, 'France', 48.8566, 2.3522),
('dest_rome', 'Rome', 'Lazio', 'An open-air museum where ancient gladiatorial ruins coexist with vibrant Italian piazzas.', 2100.00, 'Spring & Fall', 'mood_cultural', 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80', 4.85, 'Italy', 41.9028, 12.4964),
('dest_bali', 'Bali', 'Lesser Sunda Islands', 'Lush terraced hills, sacred temples, surf breaks, and serene tropical island sanctuaries.', 1500.00, 'May to September', 'mood_beach', 'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80', 4.90, 'Indonesia', -8.4095, 115.1889),
('dest_reykjavik', 'Reykjavik', 'Capital Region', 'Northern lights, geothermal lagoons, black sand beaches, and otherworldly volcanic landscapes.', 3100.00, 'Winter (Auroras) or Summer', 'mood_adventure', 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1200&q=80', 4.91, 'Iceland', 64.1466, -21.9426),
('dest_kyoto', 'Kyoto', 'Kansai Region', 'Thousands of classical Buddhist temples, Zen gardens, bamboo groves, and traditional tea houses.', 2200.00, 'Cherry Blossom & Autumn', 'mood_relaxed', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80', 4.93, 'Japan', 35.0116, 135.7681),
('dest_new_york', 'New York City', 'New York', 'The global metropolis of Broadway, Central Park, iconic architecture, and non-stop culture.', 3400.00, 'September to December', 'mood_urban', 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80', 4.79, 'United States', 40.7128, -74.0060);

-- 4. SEED TRIP PLANS (ER Diagram: TRIP_PLAN)
INSERT IGNORE INTO trip_plans (trip_id, user_id, destination_id, travel_date, duration_days, estimated_cost, transport_type, notes) VALUES
('plan_tokyo_01', 'user_alex_rivers', 'dest_tokyo', '2026-10-15', 7, 2600.00, 'Flight + Shinkansen Bullet Train', 'Morning photography at Shibuya Sky, day trip to Hakone, and ramen crawl in Shinjuku.'),
('plan_paris_02', 'user_sophia_chen', 'dest_paris', '2026-11-05', 5, 2900.00, 'Flight + Paris Metro', 'Private Louvre guided tour, Seine sunset cruise, and pastry tasting in Saint-Germain.'),
('plan_bali_03', 'user_demo_traveler', 'dest_bali', '2026-12-01', 10, 1650.00, 'Flight + Private Scooter Hire', 'Ubud rainforest retreat, sunrise hike up Mount Batur, and beach club in Canggu.');

-- 5. SEED FAVORITES (ER Diagram: FAVORITE)
INSERT IGNORE INTO favorites (favorite_id, user_id, destination_id, saved_date) VALUES
(1, 'user_alex_rivers', 'dest_reykjavik', '2026-09-10 14:20:00'),
(2, 'user_alex_rivers', 'dest_tokyo', '2026-09-12 09:15:00'),
(3, 'user_sophia_chen', 'dest_paris', '2026-09-15 11:30:00'),
(4, 'user_sophia_chen', 'dest_kyoto', '2026-09-18 16:45:00'),
(5, 'user_demo_traveler', 'dest_bali', '2026-09-20 08:00:00'),
(6, 'user_demo_traveler', 'dest_rome', '2026-09-22 19:10:00');

-- 6. SEED REVIEWS (ER Diagram: REVIEW)
INSERT IGNORE INTO reviews (review_id, user_id, destination_id, rating, comment, review_date) VALUES
(1, 'user_alex_rivers', 'dest_tokyo', 5.0, 'Tokyo exceeded every possible expectation! Clean, electric atmosphere and incredible culinary scene.', '2026-09-14 10:00:00'),
(2, 'user_sophia_chen', 'dest_paris', 4.8, 'The evening walk along the Seine and the architecture around Notre-Dame were breathtaking. Highly recommended!', '2026-09-16 12:30:00'),
(3, 'user_demo_traveler', 'dest_bali', 5.0, 'Tegallalang rice terraces at sunrise was an unforgettable spiritual experience. Super friendly locals.', '2026-09-21 14:15:00'),
(4, 'user_alex_rivers', 'dest_reykjavik', 4.9, 'The Golden Circle tour and the Blue Lagoon geothermal waters are essential bucket-list adventures.', '2026-09-25 18:45:00'),
(5, 'user_sophia_chen', 'dest_rome', 4.7, 'Walking through the Roman Forum felt like traveling through time. Authentic carbonara in Trastevere was sublime.', '2026-09-28 20:00:00');

-- 7. SEED INTERACTIVE TRIPS (Planner Trips)
INSERT IGNORE INTO trips (id, user_id, title, destination, country, latitude, longitude, start_date, end_date, cover_image, budget, currency) VALUES
('trip_tokyo_showcase', 'user_alex_rivers', 'Tokyo Autumn Highlights', 'Tokyo', 'Japan', 35.6762, 139.6503, '2026-10-15', '2026-10-22', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80', 2500.00, 'USD'),
('trip_paris_showcase', 'user_sophia_chen', 'Parisian Art & Culture', 'Paris', 'France', 48.8566, 2.3522, '2026-11-05', '2026-11-10', 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80', 2800.00, 'USD');

-- 8. SEED ITINERARY ITEMS
INSERT IGNORE INTO itinerary_items (id, trip_id, day_number, place_id, name, category, latitude, longitude, address, photo_url, rating, user_rating, user_notes, order_index, estimated_time) VALUES
('item_tokyo_01', 'trip_tokyo_showcase', 1, 'tokyo_skytree', 'Tokyo Skytree Observatory', 'do', 35.7100, 139.8107, '1 Chome-1-2 Oshiage, Sumida City, Tokyo', 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', 4.7, 5, 'Visit at sunset for stunning panoramic views of Mount Fuji.', 1, '2 hours'),
('item_tokyo_02', 'trip_tokyo_showcase', 1, 'sensoji_temple', 'Sensō-ji Ancient Temple', 'do', 35.7148, 139.7967, '2 Chome-3-1 Asakusa, Taito City, Tokyo', 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80', 4.8, 5, 'Historic Buddhist temple with vibrant Nakamise shopping street.', 2, '1.5 hours'),
('item_tokyo_03', 'trip_tokyo_showcase', 1, 'ichiran_ramen', 'Ichiran Ramen Asakusa', 'eat', 35.7112, 139.7981, '1 Chome-1-16 Asakusa, Taito City, Tokyo', 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80', 4.6, 5, 'World famous tonkotsu broth ramen in private booths.', 3, '1 hour');

-- 9. SEED EXPENSES
INSERT IGNORE INTO expenses (id, trip_id, title, amount, category, date) VALUES
('exp_tokyo_flight', 'trip_tokyo_showcase', 'Roundtrip Flight to Haneda', 920.00, 'Transport', '2026-10-15'),
('exp_tokyo_hotel', 'trip_tokyo_showcase', 'Shinjuku Boutique Hotel (7 Nights)', 1150.00, 'Lodging', '2026-10-15'),
('exp_tokyo_skytree', 'trip_tokyo_showcase', 'Skytree Fast Track Tickets', 48.00, 'Activities', '2026-10-16'),
('exp_tokyo_dining', 'trip_tokyo_showcase', 'Omakase Sushi Experience', 180.00, 'Food', '2026-10-17');

-- 10. SEED SAVED PLACES
INSERT IGNORE INTO saved_places (id, user_id, place_id, name, category, latitude, longitude, photo_url, address) VALUES
('sp_01', 'user_alex_rivers', 'place_shibuya_cross', 'Shibuya Crossing & Hachiko', 'Attraction', 35.6595, 139.7005, 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80', 'Shibuya, Tokyo, Japan'),
('sp_02', 'user_sophia_chen', 'place_louvre_museum', 'Musée du Louvre', 'Museum', 48.8606, 2.3376, 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=800&q=80', 'Rue de Rivoli, 75001 Paris, France');
