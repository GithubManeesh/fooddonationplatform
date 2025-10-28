// server.js - SQLite Authentication Backend
const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname))); // Serve HTML, CSS, JS files
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    next();
});

// Initialize SQLite database
const db = new sqlite3.Database('./foodshare.db', (err) => {
    if (err) {
        console.error('Error opening database:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type TEXT NOT NULL,
        location TEXT NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS food_donations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        description TEXT,
        pickup_time TEXT,
        location TEXT NOT NULL,
        donor_name TEXT NOT NULL,
        donor_phone TEXT,
        collected BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS community_needs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        posted_by TEXT NOT NULL,
        needed_by TEXT NOT NULL,
        urgency TEXT DEFAULT 'red',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
}

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ success: true, message: 'Backend is running' });
});

// User Registration
app.post('/api/register', async (req, res) => {
    const { name, username, email, password, userType, location, phone } = req.body;

    if (!name || !username || !email || !password || !userType || !location) {
        return res.json({ success: false, error: 'All fields are required' });
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10);
        
        db.run(
            `INSERT INTO users (name, username, email, password_hash, user_type, location, phone) VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [name, username, email, passwordHash, userType, location, phone],
            function(err) {
                if (err) {
                    return res.json({ success: false, error: 'Username or email already exists' });
                }
                
                res.json({ 
                    success: true, 
                    user: { 
                        id: this.lastID, 
                        name, 
                        username, 
                        email, 
                        userType, 
                        location, 
                        phone
                    } 
                });
            }
        );
    } catch (error) {
        res.json({ success: false, error: 'Registration failed' });
    }
});

// User Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.json({ success: false, error: 'Username and password are required' });
    }

    db.get(
        'SELECT * FROM users WHERE username = ?',
        [username],
        async (err, user) => {
            if (err || !user) {
                return res.json({ success: false, error: 'Invalid username or password' });
            }
            
            try {
                const validPassword = await bcrypt.compare(password, user.password_hash);
                if (!validPassword) {
                    return res.json({ success: false, error: 'Invalid username or password' });
                }
                
                const { password_hash, ...userWithoutPassword } = user;
                res.json({ 
                    success: true, 
                    user: userWithoutPassword 
                });
            } catch (error) {
                res.json({ success: false, error: 'Login failed' });
            }
        }
    );
});

// Food Donation
app.post('/api/donate-food', (req, res) => {
    const { foodName, quantity, unit, description, pickupTime, location, donorName, donorPhone } = req.body;

    if (!foodName || !quantity || !unit || !location || !donorName) {
        return res.json({ success: false, error: 'Missing required fields' });
    }

    db.run(
        `INSERT INTO food_donations (food_name, quantity, unit, description, pickup_time, location, donor_name, donor_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [foodName, quantity, unit, description, pickupTime, location, donorName, donorPhone],
        function(err) {
            if (err) {
                return res.json({ success: false, error: 'Donation submission failed' });
            }
            res.json({ success: true, donationId: this.lastID });
        }
    );
});

// Get user donations
app.get('/api/user-donations/:donorName', (req, res) => {
    const donorName = req.params.donorName;

    db.all(
        'SELECT * FROM food_donations WHERE donor_name = ? ORDER BY created_at DESC',
        [donorName],
        (err, donations) => {
            if (err) {
                return res.json({ success: false, error: 'Failed to fetch donations' });
            }
            res.json({ success: true, donations });
        }
    );
});

// Confirm collection
app.post('/api/confirm-collection', (req, res) => {
    const { donationId } = req.body;

    db.run(
        'UPDATE food_donations SET collected = TRUE WHERE id = ?',
        [donationId],
        function(err) {
            if (err) {
                return res.json({ success: false, error: 'Confirmation failed' });
            }
            res.json({ success: true });
        }
    );
});

// Community needs
app.get('/api/community-needs', (req, res) => {
    db.all(
        'SELECT * FROM community_needs ORDER BY created_at DESC',
        (err, needs) => {
            if (err) {
                return res.json({ success: false, error: 'Failed to fetch community needs' });
            }
            res.json({ success: true, needs: [] });
        }
    );
});

// Stats endpoint - SIMPLE COUNTING
app.get('/api/stats', (req, res) => {
    // Get total donations count
    db.get('SELECT COUNT(*) as total FROM food_donations', (err, donationsResult) => {
        if (err) {
            return res.json({ 
                success: true, 
                stats: {
                    mealsShared: 0,
                    mealsReceived: 0,
                    totalUsers: 0
                }
            });
        }
        
        const mealsShared = donationsResult.total || 0;
        
        // Get meals received (collected donations) - SIMPLE COUNT
        db.get('SELECT COUNT(*) as total FROM food_donations WHERE collected = TRUE', (err, collectedResult) => {
            if (err) {
                return res.json({ 
                    success: true, 
                    stats: {
                        mealsShared: 0,
                        mealsReceived: 0,
                        totalUsers: 0
                    }
                });
            }
            
            const mealsReceived = collectedResult.total || 0;
            
            // Get total users
            db.get('SELECT COUNT(*) as total FROM users', (err, usersResult) => {
                if (err) {
                    return res.json({ 
                        success: true, 
                        stats: {
                            mealsShared: 0,
                            mealsReceived: 0,
                            totalUsers: 0
                        }
                    });
                }
                
                const totalUsers = usersResult.total || 0;
                
                res.json({
                    success: true,
                    stats: {
                        mealsShared: mealsShared,
                        mealsReceived: mealsReceived,
                        totalUsers: totalUsers
                    }
                });
            });
        });
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 FoodShare backend running on http://localhost:${PORT}`);
    console.log(`📊 Open your browser and visit: http://localhost:${PORT}`);
    console.log(`💡 Make sure all files are in the same folder:`);
    console.log(`   - server.js, index.html, style.css, script.js, package.json`);
});

process.on('SIGINT', () => {
    db.close();
    process.exit(0);
});
