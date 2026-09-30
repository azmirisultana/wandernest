-- WanderNest Travel Planning Database Schema
-- Ready for local MySQL or Cloud providers (Aiven, TiDB, PlanetScale, AWS RDS)

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

CREATE TABLE IF NOT EXISTS itinerary_days (
  id INT AUTO_INCREMENT PRIMARY KEY,
  trip_id VARCHAR(64) NOT NULL,
  day_number INT NOT NULL,
  date DATE,
  title VARCHAR(255),
  notes TEXT,
  FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
);

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
