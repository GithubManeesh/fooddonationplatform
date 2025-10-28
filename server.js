// FoodShare Complete Backend + Frontend
const express = require('express');
const bcrypt = require('bcryptjs');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 5000;

// ✅ MIDDLEWARE - Serve static files FIRST
app.use(express.static(__dirname));
app.use(express.json());

// ✅ FRONTEND ROUTES - Serve HTML for all pages
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/donate', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/community', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ DATABASE SETUP
const db = new sqlite3.Database('./foodshare.db', (err) => {
    if (err) {
        console.error('Database error:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    // Users table
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

    // Food donations table
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
        collected BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Community needs table
    db.run(`CREATE TABLE IF NOT EXISTS community_needs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        food_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        unit TEXT NOT NULL,
        description TEXT,
        location TEXT NOT NULL,
        posted_by TEXT NOT NULL,
        needed_by TEXT NOT NULL,
        urgency TEXT DEFAULT 'medium',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    console.log('✅ Database tables initialized');
}

// ✅ HEALTH CHECK
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'FoodShare backend is running!',
        timestamp: new Date().toISOString()
    });
});

// ✅ USER REGISTRATION
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
                    return res.json({ 
                        success: false, 
                        error: 'Username or email already exists' 
                    });
                }
                
                res.json({ 
                    success: true, 
                    message: 'Registration successful',
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

// ✅ USER LOGIN
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
                
                // Remove password from response
                const { password_hash, ...userWithoutPassword } = user;
                res.json({ 
                    success: true, 
                    message: 'Login successful',
                    user: userWithoutPassword 
                });
            } catch (error) {
                res.json({ success: false, error: 'Login failed' });
            }
        }
    );
});

// ✅ FOOD DONATION
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
                console.error('Donation error:', err);
                return res.json({ success: false, error: 'Donation submission failed' });
            }
            res.json({ 
                success: true, 
                message: 'Food donation submitted successfully',
                donationId: this.lastID 
            });
        }
    );
});

// ✅ GET ALL DONATIONS
app.get('/api/donations', (req, res) => {
    db.all(
        'SELECT * FROM food_donations WHERE collected = 0 ORDER BY created_at DESC',
        (err, donations) => {
            if (err) {
                console.error('Donations fetch error:', err);
                return res.json({ success: false, error: 'Failed to fetch donations' });
            }
            res.json({ success: true, donations });
        }
    );
});

// ✅ GET USER DONATIONS
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

// ✅ CONFIRM COLLECTION
app.post('/api/confirm-collection', (req, res) => {
    const { donationId } = req.body;

    db.run(
        'UPDATE food_donations SET collected = 1 WHERE id = ?',
        [donationId],
        function(err) {
            if (err) {
                return res.json({ success: false, error: 'Confirmation failed' });
            }
            res.json({ 
                success: true, 
                message: 'Collection confirmed successfully' 
            });
        }
    );
});

// ✅ POST COMMUNITY NEED
app.post('/api/post-need', (req, res) => {
    const { foodName, quantity, unit, description, location, postedBy, neededBy, urgency } = req.body;

    if (!foodName || !quantity || !unit || !location || !postedBy || !neededBy) {
        return res.json({ success: false, error: 'Missing required fields' });
    }

    db.run(
        `INSERT INTO community_needs (food_name, quantity, unit, description, location, posted_by, needed_by, urgency) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [foodName, quantity, unit, description, location, postedBy, neededBy, urgency || 'medium'],
        function(err) {
            if (err) {
                return res.json({ success: false, error: 'Failed to post need' });
            }
            res.json({ 
                success: true, 
                message: 'Community need posted successfully',
                needId: this.lastID 
            });
        }
    );
});

// ✅ GET COMMUNITY NEEDS
app.get('/api/community-needs', (req, res) => {
    db.all(
        'SELECT * FROM community_needs ORDER BY created_at DESC',
        (err, needs) => {
            if (err) {
                return res.json({ success: false, error: 'Failed to fetch community needs' });
            }
            res.json({ success: true, needs });
        }
    );
});

// ✅ GET STATISTICS
app.get('/api/stats', (req, res) => {
    const stats = {
        mealsShared: 0,
        mealsReceived: 0,
        totalUsers: 0,
        activeDonations: 0
    };

    // Get total donations
    db.get('SELECT COUNT(*) as count FROM food_donations', (err, result) => {
        if (!err && result) stats.mealsShared = result.count;

        // Get collected donations
        db.get('SELECT COUNT(*) as count FROM food_donations WHERE collected = 1', (err, result) => {
            if (!err && result) stats.mealsReceived = result.count;

            // Get total users
            db.get('SELECT COUNT(*) as count FROM users', (err, result) => {
                if (!err && result) stats.totalUsers = result.count;

                // Get active donations
                db.get('SELECT COUNT(*) as count FROM food_donations WHERE collected = 0', (err, result) => {
                    if (!err && result) stats.activeDonations = result.count;

                    res.json({ success: true, stats });
                });
            });
        });
    });
});

// ✅ CATCH-ALL ROUTE - Serve index.html for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ✅ START SERVER
app.listen(PORT, () => {
    console.log('=================================');
    console.log('🚀 FoodShare Platform Started!');
    console.log(`📍 Frontend: http://localhost:${PORT}`);
    console.log(`📊 API: http://localhost:${PORT}/api/health`);
    console.log('=================================');
});

// ✅ GRACEFUL SHUTDOWN
process.on('SIGINT', () => {
    db.close();
    console.log('Database connection closed.');
    process.exit(0);
});
