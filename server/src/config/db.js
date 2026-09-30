import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const isRemote = (process.env.DB_HOST && process.env.DB_HOST !== 'localhost' && process.env.DB_HOST !== '127.0.0.1') || process.env.DB_SSL === 'true';

// MySQL Connection Pool (supports cloud providers with SSL & local MySQL)
export const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'wandernest',
  port: Number(process.env.DB_PORT) || 3306,
  ssl: isRemote ? { rejectUnauthorized: false } : undefined,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export default pool;

let isConnected = false;

// In-memory fallback if MySQL is temporarily not reachable
export const memoryDb = {
  trips: new Map(),
  itinerary_items: new Map(),
  expenses: new Map(),
  saved_places: new Map()
};

export async function initDatabase() {
  try {
    // Test connectivity
    await pool.query('SELECT 1;');

    // 1. users
    await pool.query(`
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
    `);

    // 2. moods
    await pool.query(`
      CREATE TABLE IF NOT EXISTS moods (
        mood_id VARCHAR(64) PRIMARY KEY,
        mood_name VARCHAR(100) NOT NULL,
        description TEXT,
        image_icon TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. destinations
    await pool.query(`
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
    `);

    // 4. trip_plans
    await pool.query(`
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
    `);

    // 5. favorites
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        favorite_id INT AUTO_INCREMENT PRIMARY KEY,
        user_id VARCHAR(128) NOT NULL,
        destination_id VARCHAR(64) NOT NULL,
        saved_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_fav_dest (user_id, destination_id),
        FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
        FOREIGN KEY (destination_id) REFERENCES destinations(destination_id) ON DELETE CASCADE
      );
    `);

    // 6. reviews
    await pool.query(`
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
    `);

    // 7. trips
    await pool.query(`
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
    `);

    // 8. itinerary_days
    await pool.query(`
      CREATE TABLE IF NOT EXISTS itinerary_days (
        id INT AUTO_INCREMENT PRIMARY KEY,
        trip_id VARCHAR(64) NOT NULL,
        day_number INT NOT NULL,
        date DATE,
        title VARCHAR(255),
        notes TEXT,
        FOREIGN KEY (trip_id) REFERENCES trips(id) ON DELETE CASCADE
      );
    `);

    // 9. itinerary_items
    await pool.query(`
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
    `);

    // 10. expenses
    await pool.query(`
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
    `);

    // 11. saved_places
    await pool.query(`
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
    `);

    // Compatibility Views
    try {
      await pool.query('CREATE OR REPLACE VIEW user AS SELECT * FROM users;');
      await pool.query('CREATE OR REPLACE VIEW mood AS SELECT * FROM moods;');
      await pool.query('CREATE OR REPLACE VIEW destination AS SELECT * FROM destinations;');
      await pool.query('CREATE OR REPLACE VIEW trip_plan AS SELECT * FROM trip_plans;');
      await pool.query('CREATE OR REPLACE VIEW favorite AS SELECT * FROM favorites;');
      await pool.query('CREATE OR REPLACE VIEW review AS SELECT * FROM reviews;');
    } catch (viewErr) {
      // Non-fatal if view creation lacks privileges on restricted DBs
      console.warn('Note: Compatibility views creation skipped or non-fatal:', viewErr.message);
    }

    isConnected = true;
    console.log('✅ Connected to MySQL successfully and initialized all WanderNest & ER Diagram tables.');
  } catch (error) {
    console.warn('⚠️  Could not connect to MySQL:', error.message);
    console.warn('⚡ Using memory-backed store fallback. Start MySQL (e.g. XAMPP / MySQL Service) to enable full persistence.');
    isConnected = false;
  }
}

export function getDb() {
  return { pool, isConnected };
}
