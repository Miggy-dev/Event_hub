import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import { pool } from './db.js';
import { randomUUID } from 'crypto';
import { hashPassword, comparePassword } from './components/hash.js';
import { sendRegistrationConfirmationEmail, sendCheckInConfirmationEmail } from './components/email.js';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Multer for storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });
const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for Render
app.set('trust proxy', 1);

const allowedOrigins = [
  'https://miggymouse-to-do-list.vercel.app',
  'https://to-do-list-bice-alpha.vercel.app',
  'https://to-do-list-9uip1pi1o-juanmiguelbarbosa11-9552s-projects.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
  // Add PUBLIC_URL (for phone access)
  process.env.PUBLIC_URL || 'http://localhost:5173'
];

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});
     
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isVercel = origin.endsWith('.vercel.app');
    const isLocal = origin.includes('localhost') || 
                    origin.includes('127.0.0.1') || 
                    origin.startsWith('http://10.') || 
                    origin.startsWith('http://192.168.');

    if (isDevelopment || isVercel || isLocal || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// -- ROLE MIDDLEWARES --
const requireAuth = (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    next();
};

const requireAdmin = async (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    if (req.session.user.roleName !== 'Admin' && req.session.user.roleName !== 'Super Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admins only access' });
    }
    next();
};

const requireSuperAdmin = async (req, res, next) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized: Please log in' });
    }
    if (req.session.user.roleName !== 'Super Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Super Admin only access' });
    }
    next();
};

// --- AUTH APIs ---
app.post('/register', upload.single('profile_image'), async (req, res) => {
    const { username, name, password, roleName = 'User', bio = '', phoneNumber, emailAddress } = req.body;
    const phone = phoneNumber || req.body.phone || null;
    const email = emailAddress || req.body.email || null;
    
    const id = randomUUID();
    const profile_image = req.file ? req.file.filename : null;
    
    console.log('--- [FINAL] Registration Attempt ---');
    console.log('Processed Data:', { username, name, email, phone });
    console.log('Body Keys:', Object.keys(req.body));
    
    try {
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const hashedPassword = hashPassword(password, 10);
        
        // Robust role lookup
        const roleResult = await pool.query('SELECT id FROM roles WHERE LOWER(name) = LOWER($1)', [roleName]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: `Invalid role: ${roleName}` });
        }
        const roleId = roleResult.rows[0].id;
        
        // Check if username already exists
        const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username is already taken' });
        }

        const insertQuery = `
            INSERT INTO users (id, username, password, name, role_id, profile_image, bio, phone, email) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `;

        const values = [id, username, hashedPassword, name, roleId, profile_image, bio, phone, email];
        
        await pool.query(insertQuery, values);
        
        console.log('Registration Successful for:', username);
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error [CRITICAL]:', error);
        res.status(500).json({ 
            success: false, 
            message: `Registration failed: ${error.message} (Code: ${error.code})` 
        });
    }
});

// Hidden Super Admin Registration
app.post('/super-register', async (req, res) => {
    const { username, password, name, secretKey } = req.body;
    
    // Check secret key
    if (secretKey !== (process.env.SUPER_ADMIN_SECRET || 'super-secret-101')) {
        return res.status(403).json({ success: false, message: 'Invalid secret key' });
    }

    const id = randomUUID();
    try {
        const hashedPassword = hashPassword(password, 10);
        const roleResult = await pool.query("SELECT id FROM roles WHERE name = 'Super Admin'");
        const roleId = roleResult.rows[0].id;

        await pool.query(
            'INSERT INTO users (id, username, password, name, role_id, profile_image, bio, phone, email) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)', 
            [id, username, hashedPassword, name, roleId, '', '', null, null]
        );
        res.status(201).json({ success: true, message: 'Super Admin created successfully' });
    } catch (error) {
        console.error('Super registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: `Failed to create Super Admin: ${error.message}${error.code ? ' (Code: ' + error.code + ')' : ''}` 
        });
    }
});

// --- SUPER ADMIN MANAGEMENT APIs ---

// List all users
app.get('/super/users', requireSuperAdmin, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.name, u.profile_image, u.bio, u.created_at, r.name as role_name
            FROM users u
            JOIN roles r ON u.role_id = r.id
            ORDER BY u.created_at DESC
        `);
        res.status(200).json({ success: true, users: result.rows });
    } catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch users' });
    }
});

// Update user role
app.put('/super/users/:id/role', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const { roleName } = req.body;

    try {
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid role' });
        }
        const roleId = roleResult.rows[0].id;

        await pool.query('UPDATE users SET role_id = $1 WHERE id = $2', [roleId, id]);
        res.status(200).json({ success: true, message: 'User role updated successfully' });
    } catch (error) {
        console.error('Failed to update user role:', error);
        res.status(500).json({ success: false, message: 'Failed to update user role' });
    }
});

// Delete user (with related data cleanup)
app.delete('/super/users/:id', requireSuperAdmin, async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Delete registrations for events organized by this user
        await client.query(`
            DELETE FROM registrations 
            WHERE event_id IN (SELECT id FROM events WHERE organizer_id = $1)
        `, [id]);

        // 2. Delete registrations MADE by this user
        await client.query('DELETE FROM registrations WHERE user_id = $1', [id]);

        // 3. Delete tickets for events organized by this user
        await client.query(`
            DELETE FROM tickets 
            WHERE event_id IN (SELECT id FROM events WHERE organizer_id = $1)
        `, [id]);

        // 4. Delete events organized by this user
        await client.query('DELETE FROM events WHERE organizer_id = $1', [id]);

        // 5. Finally, delete the user
        await client.query('DELETE FROM users WHERE id = $1', [id]);

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: 'User and all associated data deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Failed to delete user:', error);
        res.status(500).json({ success: false, message: 'Failed to delete user: ' + error.message });
    } finally {
        client.release();
    }
});

// Batch delete users
app.post('/super/users/batch-delete', requireSuperAdmin, async (req, res) => {
    const { userIds } = req.body; // Array of IDs
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No user IDs provided' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 1. Delete registrations for events organized by these users
        await client.query(`
            DELETE FROM registrations 
            WHERE event_id IN (SELECT id FROM events WHERE organizer_id = ANY($1))
        `, [userIds]);

        // 2. Delete registrations MADE by these users
        await client.query('DELETE FROM registrations WHERE user_id = ANY($1)', [userIds]);

        // 3. Delete tickets for events organized by these users
        await client.query(`
            DELETE FROM tickets 
            WHERE event_id IN (SELECT id FROM events WHERE organizer_id = ANY($1))
        `, [userIds]);

        // 4. Delete events organized by these users
        await client.query('DELETE FROM events WHERE organizer_id = ANY($1)', [userIds]);

        // 5. Finally, delete the users
        await client.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);

        await client.query('COMMIT');
        res.status(200).json({ success: true, message: `${userIds.length} users deleted successfully` });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch delete error:', error);
        res.status(500).json({ success: false, message: 'Batch deletion failed: ' + error.message });
    } finally {
        client.release();
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE LOWER(u.username) = LOWER($1)`, [username]);

        console.log(`Login attempt for: ${username}, found: ${result.rows.length}`);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = result.rows[0];
        const match = comparePassword(password, user.password);

        if (match) {
            req.session.user = { 
                id: user.id, 
                username: user.username,
                name: user.name, 
                roleName: user.role_name,
                profile_image: user.profile_image,
                bio: user.bio,
                phone: user.phone,
                email: user.email
            };
            res.status(200).json({ 
                success: true, 
                message: 'Login successful', 
                user: req.session.user 
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.get('/get-session', async (req, res) => {
    if (req.session.user) {
        try {
            const userRes = await pool.query('SELECT * FROM users WHERE id = $1', [req.session.user.id]);
            const dbUser = userRes.rows[0];

            let isRestricted = false;
            let totalOwed = 0;

            if (req.session.user.roleName === 'Admin') {
                const overdueCheck = await pool.query(`
                    SELECT COUNT(*), COALESCE(SUM(r.platform_fee), 0) as total_owed
                    FROM registrations r
                    JOIN events e ON r.event_id = e.id
                    WHERE e.organizer_id = $1 
                    AND r.platform_fee_status = 'Pending'
                    AND r.purchased_at < NOW() - INTERVAL '30 days'
                `, [req.session.user.id]);
                
                if (parseInt(overdueCheck.rows[0].count) > 0) {
                    isRestricted = true;
                }

                const debtCheck = await pool.query(`
                    SELECT COALESCE(SUM(r.platform_fee), 0) as total_owed
                    FROM registrations r
                    JOIN events e ON r.event_id = e.id
                    WHERE e.organizer_id = $1 
                    AND r.platform_fee_status = 'Pending'
                `, [req.session.user.id]);
                totalOwed = parseFloat(debtCheck.rows[0].total_owed);
            }
            
            res.status(200).json({ 
                success: true, 
                session: true, 
                user: {
                    ...req.session.user,
                    phone: dbUser?.phone || req.session.user.phone,
                    email: dbUser?.email || req.session.user.email,
                    username: dbUser?.username || req.session.user.username,
                    name: dbUser?.name || req.session.user.name,
                    bio: dbUser?.bio || req.session.user.bio,
                    profile_image: dbUser?.profile_image || req.session.user.profile_image,
                    isRestricted,
                    totalOwed
                }
            });
        } catch (error) {
            console.error('Session refresh error:', error);
            res.status(200).json({ success: true, session: true, user: req.session.user });
        }
    } else {
        res.status(200).json({ success: true, session: false });
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.status(500).json({ success: false, message: 'Logout failed' });
        res.clearCookie('connect.sid');
        res.status(200).json({ success: true, message: 'Logout successful' });
    });
});

app.put('/profile/password', requireAuth, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.session.user.id;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, message: 'Current and new passwords are required' });
    }

    try {
        // Get user from DB to verify current password
        const userRes = await pool.query('SELECT password FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const isValid = comparePassword(currentPassword, userRes.rows[0].password);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Incorrect current password' });
        }

        const hashedNewPassword = hashPassword(newPassword, 10);
        await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedNewPassword, userId]);

        res.status(200).json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
        console.error('Password update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update password' });
    }
});

app.put('/profile', requireAuth, upload.single('profile_image'), async (req, res) => {
    const { name, bio, phoneNumber, emailAddress } = req.body;
    const phone = phoneNumber || req.body.phone;
    const email = emailAddress || req.body.email;
    const userId = req.session.user.id;
    const profile_image = req.file ? req.file.filename : req.session.user.profile_image;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID missing from session' });
        }

        await pool.query(
            'UPDATE users SET name = $1, bio = $2, profile_image = $3, phone = $4, email = $5 WHERE id = $6',
            [
                name || req.session.user.name, 
                bio || req.session.user.bio, 
                profile_image, 
                phone || req.session.user.phone,
                email || req.session.user.email,
                userId
            ]
        );
        
        // Update session
        req.session.user = { 
            ...req.session.user, 
            name: name || req.session.user.name, 
            bio: bio || req.session.user.bio, 
            profile_image,
            phone: phone || req.session.user.phone,
            email: email || req.session.user.email
        };

        res.status(200).json({ success: true, message: 'Profile updated successfully', user: req.session.user });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update profile', error: error.message });
    }
});

// --- EVENT MANAGEMENT APIs ---
app.get('/events', async (req, res) => {
    try {
        const eventsResult = await pool.query(`
            SELECT e.*, 
                   COALESCE(SUM(t.quantity_available), 0) as total_available_tickets,
                   COUNT(t.id) as ticket_tier_count
            FROM events e
            LEFT JOIN tickets t ON e.id = t.event_id
            GROUP BY e.id
            ORDER BY e.date ASC
        `);
        const events = eventsResult.rows;

        // Fetch all reviews to calculate weighted averages
        const reviewsResult = await pool.query('SELECT event_id, rating, created_at FROM event_reviews');
        const allReviews = reviewsResult.rows;

        const now = new Date();
        const HALF_LIFE_DAYS = 30;

        const processedEvents = events.map(event => {
            const eventReviews = allReviews.filter(r => r.event_id === event.id);
            
            if (eventReviews.length === 0) {
                return { ...event, average_rating: 0, review_count: 0 };
            }

            let totalWeightedRating = 0;
            let totalWeight = 0;

            eventReviews.forEach(rev => {
                const ageInDays = (now - new Date(rev.created_at)) / (1000 * 60 * 60 * 24);
                const weight = Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
                
                totalWeightedRating += rev.rating * weight;
                totalWeight += weight;
            });

            const weightedAverage = totalWeight > 0 ? (totalWeightedRating / totalWeight) : 0;

            return {
                ...event,
                average_rating: parseFloat(weightedAverage.toFixed(2)),
                review_count: eventReviews.length
            };
        });

        res.status(200).json({ success: true, events: processedEvents });
    } catch (error) {
        console.error('Fetch events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
});

// --- EVENT REGISTRANTS (ORGANIZER ONLY) ---
app.get('/events/:id/registrants', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    try {
        // Verify ownership and get event details
        const eventCheck = await pool.query('SELECT title, image_url, date, location, organizer_id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (eventCheck.rows[0].organizer_id !== organizerId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only view registrants for your own events' });
        }

        // Fetch registrants
        const registrants = await pool.query(`
            SELECT 
                r.id, r.quantity, r.total_price as revenue, r.purchased_at, r.device_info, r.payment_status,
                u.name as user_name, u.username as user_email,
                COALESCE(t.name, 'Free Registration') as ticket_name
            FROM registrations r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN tickets t ON r.ticket_id = t.id
            WHERE r.event_id = $1
            ORDER BY r.purchased_at DESC
        `, [id]);

        res.status(200).json({ success: true, event: eventCheck.rows[0], registrants: registrants.rows });
    } catch (error) {
        console.error('Fetch registrants error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrants' });
    }
});

app.get('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const eventResult = await pool.query(`
            SELECT e.*, 
                   COALESCE(SUM(t.quantity_available), 0) as total_available_tickets,
                   COUNT(t.id) as ticket_tier_count
            FROM events e
            LEFT JOIN tickets t ON e.id = t.event_id
            WHERE e.id = $1
            GROUP BY e.id
        `, [id]);
        if (eventResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        const eventData = eventResult.rows[0];
        
        // Fetch all reviews for this event
        const reviewsResult = await pool.query(`
            SELECT 
                r.rating, 
                r.comment, 
                r.created_at, 
                u.name as user_name
            FROM event_reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.event_id = $1
            ORDER BY r.created_at DESC
        `, [id]);
        
        const eventReviews = reviewsResult.rows;
        const now = new Date();
        const HALF_LIFE_DAYS = 30;

        let totalWeightedRating = 0;
        let totalWeight = 0;

        eventReviews.forEach(rev => {
            const ageInDays = (now - new Date(rev.created_at)) / (1000 * 60 * 60 * 24);
            const weight = Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
            
            totalWeightedRating += rev.rating * weight;
            totalWeight += weight;
        });

        const weightedAverage = totalWeight > 0 ? (totalWeightedRating / totalWeight) : 0;
        
        eventData.average_rating = parseFloat(weightedAverage.toFixed(2));
        eventData.review_count = eventReviews.length;
        
        // Fetch tickets as well
        const ticketsResult = await pool.query('SELECT * FROM tickets WHERE event_id = $1', [id]);
        
        // Check if user is registered if they are logged in
        let userRegistration = null;
        let userRating = null;
        let userComment = null;
        if (req.session.user) {
            console.log(`[AUTH CHECK] User ${req.session.user.username} is accessing event ${id}`);
            const userId = req.session.user.id;
            const regResult = await pool.query(
                'SELECT id, ticket_id, quantity FROM registrations WHERE event_id = $1 AND user_id = $2 LIMIT 1',
                [id, userId]
            );
            if (regResult.rows.length > 0) {
                userRegistration = regResult.rows[0];
            }
            
            // Check their rating
            const ratingResult = await pool.query(
                'SELECT rating, comment FROM event_reviews WHERE event_id = $1 AND user_id = $2',
                [id, userId]
            );
            if (ratingResult.rows.length > 0) {
                userRating = ratingResult.rows[0].rating;
                userComment = ratingResult.rows[0].comment;
            }
        }

        // Use the first 10 reviews for the community section (already ordered by created_at DESC)
        const reviewsToShow = eventReviews.slice(0, 10);
        
        res.status(200).json({ 
            success: true, 
            event: eventData, 
            tickets: ticketsResult.rows, 
            userRegistration, 
            userRating,
            userComment,
            reviews: reviewsToShow,
            isAdmin: req.session.user?.roleName === 'Admin',
            isSuperAdmin: req.session.user?.roleName === 'Super Admin',
            userName: req.session.user?.name,
            currentUserId: req.session.user?.id,
            canRegister: req.session.user 
                ? (req.session.user.roleName !== 'Super Admin' && eventData.organizer_id !== req.session.user.id)
                : true
        });
    } catch (error) {
        console.error('Fetch event details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch event details' });
    }
});

// --- RATE EVENT API ---
app.post('/events/:id/rate', async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Must be logged in to rate' });
    const { id } = req.params;
    const userId = req.session.user.id;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({ success: false, message: 'Invalid rating. Must be between 1 and 5.' });
    }

    try {
        // 1. Check if event exists
        const eventCheck = await pool.query('SELECT date FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });

        // 2. Check if user is registered for the event
        const regCheck = await pool.query('SELECT id FROM registrations WHERE event_id = $1 AND user_id = $2', [id, userId]);

        if (regCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'You must have attended this event to leave a rating.' });
        }

        // 3. Upsert rating
        const reviewId = randomUUID();
        await pool.query(`
            INSERT INTO event_reviews (id, event_id, user_id, rating, comment) 
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (event_id, user_id) 
            DO UPDATE SET rating = EXCLUDED.rating, comment = EXCLUDED.comment, created_at = CURRENT_TIMESTAMP
        `, [reviewId, id, userId, rating, comment]);

        res.status(200).json({ success: true, message: 'Rating saved successfully!' });
    } catch (error) {
        console.error('Rating error:', error);
        res.status(500).json({ success: false, message: 'Failed to save rating' });
    }
});

// Delete rating/review
app.delete('/events/:id/rate', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;

    try {
        // Delete the user's review for this event
        const result = await pool.query(
            'DELETE FROM event_reviews WHERE event_id = $1 AND user_id = $2',
            [id, userId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        res.status(200).json({ success: true, message: 'Review deleted successfully!' });
    } catch (error) {
        console.error('Delete rating error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete rating' });
    }
});

app.post('/events', upload.array('images', 10), requireAdmin, async (req, res) => {
    console.log('--- EVENT_CREATE_START ---');
    console.log('REQ_BODY:', req.body);
    console.log('REQ_FILES:', req.files);
    console.log('SESSION_USER:', req.session.user);

    const { title, description, date, location, capacity, status = 'Published' } = req.body;
    const id = randomUUID();
    const organizerId = req.session.user?.id;
    
    // Process files array
    const image_url = req.files && req.files.length > 0 ? req.files[0].filename : null;
    const additional_images = req.files && req.files.length > 1 
        ? JSON.stringify(req.files.slice(1).map(f => f.filename))
        : JSON.stringify([]);

    try {
        if (!title || !date || !location || !capacity) {
            console.log('MISSING_FIELDS:', { title, date, location, capacity });
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO events (id, title, description, date, location, capacity, organizer_id, image_url, status, additional_images) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
            [id, title, description, date, location, parseInt(capacity), organizerId, image_url, status, additional_images]
        );
        
        console.log('EVENT_CREATED_SUCCESS:', result.rows[0].id);
        res.status(201).json({ success: true, message: 'Event created successfully', id });
    } catch (error) {
        console.error('EVENT_CREATE_ERROR:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create event', 
            error: error.message,
            detail: error.detail
        });
    } finally {
        console.log('--- EVENT_CREATE_END ---');
    }
});

app.put('/events/:id', upload.array('images', 10), requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    
    console.log('--- EVENT_UPDATE_START ---');
    console.log('Event ID:', id);
    console.log('Organizer ID:', organizerId);
    console.log('Content-Type:', req.headers['content-type']);
    console.log('Request Body:', req.body);
    console.log('Request Files:', req.files);

    try {
        if (!req.body) {
            throw new Error('No request body received. Ensure Content-Type is multipart/form-data.');
        }

        const { title, description, date, location, capacity, status } = req.body;
        
        // Check ownership
        const eventCheck = await pool.query('SELECT organizer_id, image_url, additional_images FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) {
            console.log('UPDATE_FAILED: Event not found');
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        if (eventCheck.rows[0].organizer_id !== organizerId) {
            console.log('UPDATE_FAILED: Unauthorized ownership');
            return res.status(403).json({ success: false, message: 'Forbidden: You can only edit your own events' });
        }

        const currentImage = eventCheck.rows[0].image_url;
        const currentAdditional = eventCheck.rows[0].additional_images;
        
        const new_image = req.files && req.files.length > 0 ? req.files[0].filename : null;
        const new_additional = req.files && req.files.length > 1 
            ? JSON.stringify(req.files.slice(1).map(f => f.filename))
            : null;

        const finalImage = new_image || currentImage;
        const finalAdditional = new_additional || JSON.stringify(currentAdditional) || JSON.stringify([]);

        const parsedCapacity = capacity ? parseInt(capacity) : eventCheck.rows[0].capacity;

        await pool.query(
            `UPDATE events SET title = $1, description = $2, date = $3, location = $4, capacity = $5, image_url = $6, status = $7, additional_images = $8 WHERE id = $9`,
            [title || eventCheck.rows[0].title, description || eventCheck.rows[0].description, date || eventCheck.rows[0].date, location || eventCheck.rows[0].location, parsedCapacity, finalImage, status || eventCheck.rows[0].status, finalAdditional, id]
        );
        
        console.log('UPDATE_SUCCESS: Event modified');
        res.status(200).json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
        console.error('UPDATE_ERROR:', error);
        res.status(500).json({ success: false, message: 'Failed to update event', detail: error.message });
    } finally {
        console.log('--- EVENT_UPDATE_END ---');
    }
});

app.delete('/events/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    try {
        // Check ownership
        const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }
        
        if (eventCheck.rows[0].organizer_id !== organizerId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only delete your own events' });
        }

        await pool.query('DELETE FROM events WHERE id = $1', [id]);
        res.status(200).json({ success: true, message: 'Event deleted successfully' });
    } catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete event' });
    }
});

// Create tickets for an event
app.post('/events/:id/tickets', requireAdmin, async (req, res) => {
    const { id } = req.params; // Event ID
    const { name, price, quantity_available } = req.body;
    const ticketId = randomUUID();
    try {
        await pool.query(
            `INSERT INTO tickets (id, event_id, name, price, quantity_available) VALUES ($1, $2, $3, $4, $5)`,
            [ticketId, id, name, price, quantity_available]
        );
        res.status(201).json({ success: true, message: 'Ticket tier created' });
    } catch (error) {
        console.error('Create ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to create ticket tier' });
    }
});

// Update tickets for an event
app.put('/events/:id/tickets', requireAdmin, async (req, res) => {
    const { id } = req.params; // Event ID
    const { price, quantity_available } = req.body;
    const organizerId = req.session.user.id;
    
    try {
        // Verify ownership
        const eventCheck = await pool.query('SELECT organizer_id FROM events WHERE id = $1', [id]);
        if (eventCheck.rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        if (eventCheck.rows[0].organizer_id !== organizerId) {
            return res.status(403).json({ success: false, message: 'Forbidden: You can only edit tickets for your own events' });
        }

        // Check if ticket exists
        const ticketCheck = await pool.query('SELECT id FROM tickets WHERE event_id = $1', [id]);
        
        if (ticketCheck.rows.length > 0) {
            // Update existing
            await pool.query(
                'UPDATE tickets SET price = $1, quantity_available = $2 WHERE event_id = $3',
                [price, quantity_available, id]
            );
        } else {
            // Create new if none exists
            const ticketId = randomUUID();
            await pool.query(
                `INSERT INTO tickets (id, event_id, name, price, quantity_available) VALUES ($1, $2, $3, $4, $5)`,
                [ticketId, id, 'General Admission', price, quantity_available]
            );
        }
        res.status(200).json({ success: true, message: 'Tickets updated successfully' });
    } catch (error) {
        console.error('Update ticket error:', error);
        res.status(500).json({ success: false, message: 'Failed to update tickets' });
    }
});

// --- REGISTRATIONS ---
app.post('/register-event', requireAuth, async (req, res) => {
    try {
        const { event_id, ticket_id, quantity, device_info, paymentMethod = 'Person-to-Person' } = req.body;
        const user_id = req.session.user.id;
        const reg_id = randomUUID();
        const qr_code = randomUUID();

        // 0. Security Block: Super Admins and Organizers cannot register
        const eventCheckResult = await pool.query('SELECT organizer_id, title FROM events WHERE id = $1', [event_id]);
        if (eventCheckResult.rows.length === 0) throw new Error('Event not found');
        
        const isSuperAdmin = req.session.user.roleName === 'Super Admin';
        const isOrganizer = eventCheckResult.rows[0].organizer_id === user_id;

        if (isSuperAdmin) {
            return res.status(403).json({ success: false, message: 'Super Admins are not allowed to register for events.' });
        }
        if (isOrganizer) {
            return res.status(403).json({ success: false, message: 'Organizers cannot register for their own events.' });
        }

        await pool.query('BEGIN');
        
        let totalPrice = 0;
        let PLATFORM_FEE_VALUE = 2.00; // Default fallback
        let ticketIdToStore = ticket_id;

        // Fetch current fee from settings
        const feeConfig = await pool.query("SELECT value FROM platform_settings WHERE key = 'platform_fee' LIMIT 1");
        if (feeConfig.rows.length > 0) {
            PLATFORM_FEE_VALUE = parseFloat(feeConfig.rows[0].value);
        }

        if (ticket_id) {
            const ticketResult = await pool.query('SELECT price, quantity_available FROM tickets WHERE id = $1', [ticket_id]);
            if (ticketResult.rows.length === 0) throw new Error('Ticket not found');
            
            const ticket = ticketResult.rows[0];
            if (ticket.quantity_available < quantity) throw new Error('Not enough tickets available');
            
            totalPrice = parseFloat(ticket.price) * quantity;
            
            // Deduct ticket quantity
            await pool.query('UPDATE tickets SET quantity_available = quantity_available - $1 WHERE id = $2', [quantity, ticket_id]);
        } else {
            // Free registration or no ticket tier
            totalPrice = 0;
            PLATFORM_FEE_VALUE = 0; // No fee for free events
            ticketIdToStore = null;
        }

        const platform_fee = totalPrice > 0 ? PLATFORM_FEE_VALUE : 0;
        const organizer_revenue = totalPrice; // The total event price (exclusive of the extra the client will pay)
        // Note: The user said: "if event price is 50 then platform fee will be 2 = 52". 
        // This means total_price stored in DB should probably be 52 for the client records.
        const total_charged = totalPrice + platform_fee;

        // GCash is "Paid" (Simulation), Person-to-Person is "Pending"
        const initialStatus = paymentMethod === 'GCash' ? 'Paid' : 'Pending';
        const platformFeeStatus = paymentMethod === 'GCash' ? 'Paid' : 'Pending';

        await pool.query(
            `INSERT INTO registrations (id, user_id, event_id, ticket_id, quantity, total_price, payment_status, qr_code, device_info, payment_method, platform_fee, organizer_revenue, platform_fee_status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
            [reg_id, user_id, event_id, ticketIdToStore, quantity, total_charged, initialStatus, qr_code, device_info || 'Unknown', paymentMethod, platform_fee, organizer_revenue, platformFeeStatus]
        );
        
        await pool.query('COMMIT');

        // Send registration confirmation email
        const userResult = await pool.query('SELECT email, name FROM users WHERE id = $1', [user_id]);
        if (userResult.rows.length > 0) {
            const { email, name } = userResult.rows[0];
            const eventTitle = eventCheckResult.rows[0].title;
            // Send email in background (don't wait for it)
            sendRegistrationConfirmationEmail(email, name, eventTitle, reg_id).catch(err => 
                console.error('Failed to send confirmation email:', err)
            );
        }

        res.status(201).json({ success: true, message: 'Successfully registered for the event', qr_code, payment_status: initialStatus });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/my-archived-registrations', requireAuth, async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const result = await pool.query(`
            SELECT r.*, e.title as event_title, e.date as event_date, e.location, e.image_url as event_image, COALESCE(t.name, 'Free Registration') as ticket_name 
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            LEFT JOIN tickets t ON r.ticket_id = t.id
            WHERE r.user_id = $1 AND (r.is_archived = TRUE OR e.date < CURRENT_TIMESTAMP)
            ORDER BY e.date DESC
        `, [user_id]);
        res.status(200).json({ success: true, registrations: result.rows });
    } catch (error) {
        console.error('Get archived registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch archived registrations' });
    }
});

app.get('/my-registrations', requireAuth, async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const result = await pool.query(`
            SELECT r.*, e.title as event_title, e.date as event_date, e.location, e.image_url as event_image, COALESCE(t.name, 'Free Registration') as ticket_name 
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            LEFT JOIN tickets t ON r.ticket_id = t.id
            WHERE r.user_id = $1 AND r.is_archived = FALSE AND e.date >= CURRENT_TIMESTAMP
            ORDER BY e.date ASC
        `, [user_id]);
        res.status(200).json({ success: true, registrations: result.rows });
    } catch (error) {
        console.error('Get user registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
    }
});

app.post('/registrations/archive', requireAuth, async (req, res) => {
    const { ids } = req.body; // Array of registration IDs
    const user_id = req.session.user.id;
    
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid or empty IDs array' });
    }

    try {
        // Check if any event has ended
        const eventCheck = await pool.query(`
            SELECT r.id, e.date as event_date FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = ANY($1) AND r.user_id = $2
        `, [ids, user_id]);
        
        const pastEventIds = eventCheck.rows
            .filter(row => new Date(row.event_date) < new Date())
            .map(row => row.id);
        
        if (pastEventIds.length > 0) {
            return res.status(403).json({ success: false, message: `Cannot archive ${pastEventIds.length} registration(s) from past events` });
        }
        
        await pool.query(
            'UPDATE registrations SET is_archived = TRUE WHERE id = ANY($1) AND user_id = $2',
            [ids, user_id]
        );
        res.status(200).json({ success: true, message: `Successfully archived ${ids.length} ticket(s)` });
    } catch (error) {
        console.error('Archive registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to archive tickets' });
    }
});

app.post('/registrations/unarchive', requireAuth, async (req, res) => {
    const { ids } = req.body; // Array of registration IDs
    const user_id = req.session.user.id;
    
    console.log('--- UNARCHIVE_START ---');
    console.log('IDs:', ids);
    console.log('User ID:', user_id);

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
        console.log('UNARCHIVE_FAILED: Invalid IDs');
        return res.status(400).json({ success: false, message: 'Invalid or empty IDs array' });
    }

    try {
        // Check if any event has ended
        const eventCheck = await pool.query(`
            SELECT r.id, e.date as event_date FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = ANY($1) AND r.user_id = $2
        `, [ids, user_id]);
        
        const pastEventIds = eventCheck.rows
            .filter(row => new Date(row.event_date) < new Date())
            .map(row => row.id);
        
        if (pastEventIds.length > 0) {
            return res.status(403).json({ success: false, message: `Cannot modify ${pastEventIds.length} registration(s) from past events` });
        }
        
        const result = await pool.query(
            'UPDATE registrations SET is_archived = FALSE WHERE id = ANY($1) AND user_id = $2',
            [ids, user_id]
        );
        console.log(`UNARCHIVE_SUCCESS: Updated ${result.rowCount} rows`);
        res.status(200).json({ success: true, message: `Successfully retrieved ${ids.length} ticket(s)` });
    } catch (error) {
        console.error('Unarchive registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to retrieve tickets', detail: error.message });
    } finally {
        console.log('--- UNARCHIVE_END ---');
    }
});

app.delete('/registrations/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const user_id = req.session.user.id;

    try {
        await pool.query('BEGIN');
        
        // Find the registration to ensure it exists and belongs to the user, and check event status
        const regResult = await pool.query(`
            SELECT r.ticket_id, r.quantity, e.date as event_date
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = $1 AND r.user_id = $2
        `, [id, user_id]);
        
        if (regResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Registration not found or unauthorized' });
        }
        
        // Check if event has ended
        const eventDate = new Date(regResult.rows[0].event_date);
        if (eventDate < new Date()) {
            await pool.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Cannot cancel registration for past events' });
        }
        
        const { ticket_id, quantity } = regResult.rows[0];
        
        // Delete the registration
        await pool.query('DELETE FROM registrations WHERE id = $1', [id]);
        
        // Restore ticket quantity if applicable
        if (ticket_id) {
            await pool.query('UPDATE tickets SET quantity_available = quantity_available + $1 WHERE id = $2', [quantity, ticket_id]);
        }
        
        await pool.query('COMMIT');
        res.status(200).json({ success: true, message: 'Successfully unregistered from event' });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Unregister error:', error);
        res.status(500).json({ success: false, message: 'Failed to unregister' });
    }
});

// --- ORGANIZER APIS ---
app.get('/my-created-events', requireAdmin, async (req, res) => {
    const organizerId = req.session.user.id;
    try {
        const result = await pool.query(`
            SELECT * FROM events 
            WHERE organizer_id = $1 
            ORDER BY created_at DESC
        `, [organizerId]);
        res.status(200).json({ success: true, events: result.rows });
    } catch (error) {
        console.error('Fetch organizer events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch your events' });
    }
});

// --- SETTLE PLATFORM FEES (Admin) ---
app.post('/organizer/settle-fees', requireAdmin, async (req, res) => {
    const organizerId = req.session.user.id;
    try {
        await pool.query(`
            UPDATE registrations 
            SET platform_fee_status = 'Paid' 
            WHERE event_id IN (SELECT id FROM events WHERE organizer_id = $1)
            AND platform_fee_status = 'Pending'
        `, [organizerId]);
        res.status(200).json({ success: true, message: 'Platform fees settled successfully' });
    } catch (error) {
        console.error('Settle fees error:', error);
        res.status(500).json({ success: false, message: 'Failed to settle fees' });
    }
});

// --- ADMIN REPORTS ---
// --- ORGANIZER REVENUE & FINANCIALS ---
app.get('/organizer/revenue', requireAdmin, async (req, res) => {
    const organizerId = req.session.user.id;
    try {
        const stats = await pool.query(`
            SELECT 
                COUNT(r.id) as total_registrations,
                COALESCE(SUM(r.organizer_revenue), 0) as total_earnings,
                COALESCE(SUM(r.platform_fee), 0) as total_deducted,
                COALESCE(SUM(CASE WHEN r.platform_fee_status = 'Pending' THEN r.platform_fee ELSE 0 END), 0) as pending_platform_debt,
                COALESCE(SUM(CASE WHEN r.payment_status = 'Pending' THEN r.organizer_revenue ELSE 0 END), 0) as pending_earnings,
                COALESCE(SUM(CASE WHEN r.payment_status = 'Paid' THEN r.organizer_revenue ELSE 0 END), 0) as collected_earnings
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE e.organizer_id = $1
        `, [organizerId]);

        // Get previous month earnings for percentage comparison
        const prevMonthStats = await pool.query(`
            SELECT 
                COALESCE(SUM(r.organizer_revenue), 0) as prev_month_earnings
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE e.organizer_id = $1
            AND r.purchased_at >= NOW() - INTERVAL '2 months'
            AND r.purchased_at < NOW() - INTERVAL '1 month'
        `, [organizerId]);

        const transactions = await pool.query(`
            SELECT 
                r.id, r.purchased_at, r.payment_method, r.payment_status, r.platform_fee_status, r.total_price, r.platform_fee, r.organizer_revenue,
                e.title as event_title, e.date as event_date,
                u.name as user_name
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            JOIN users u ON r.user_id = u.id
            WHERE e.organizer_id = $1
            ORDER BY r.purchased_at DESC
            LIMIT 50
        `, [organizerId]);

        const currentEarnings = parseFloat(stats.rows[0].total_earnings) || 0;
        const prevMonthEarnings = parseFloat(prevMonthStats.rows[0].prev_month_earnings) || 0;
        
        let percentageChange = 0;
        if (prevMonthEarnings > 0) {
            percentageChange = ((currentEarnings - prevMonthEarnings) / prevMonthEarnings * 100).toFixed(1);
        }

        res.status(200).json({ 
            success: true, 
            summary: { 
                ...stats.rows[0],
                percentage_change: parseFloat(percentageChange)
            }, 
            transactions: transactions.rows 
        });
    } catch (error) {
        console.error('Fetch organizer revenue error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch financial data' });
    }
});

// --- SUPER ADMIN GLOBAL PAYMENTS ---
app.get('/super/platform-revenue', requireSuperAdmin, async (req, res) => {
    try {
        const globalStats = await pool.query(`
            SELECT 
                COUNT(id) as total_transactions,
                COALESCE(SUM(platform_fee), 0) as total_platform_earnings,
                COALESCE(SUM(CASE WHEN platform_fee_status = 'Paid' THEN platform_fee ELSE 0 END), 0) as collected_platform_fees,
                COALESCE(SUM(CASE WHEN platform_fee_status = 'Pending' THEN platform_fee ELSE 0 END), 0) as pending_platform_fees,
                COALESCE(SUM(organizer_revenue), 0) as total_organizer_payouts,
                COALESCE(SUM(total_price), 0) as total_gross_volume
            FROM registrations
            WHERE total_price > 0
        `);

        const recentPayments = await pool.query(`
            SELECT 
                r.id, r.purchased_at, r.platform_fee, r.platform_fee_status, r.payment_method, r.total_price,
                e.title as event_title,
                u.name as organizer_name
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            JOIN users u ON e.organizer_id = u.id
            WHERE r.total_price > 0
            ORDER BY r.purchased_at DESC
            LIMIT 100
        `);

        res.status(200).json({ 
            success: true, 
            summary: globalStats.rows[0], 
            payments: recentPayments.rows 
        });
    } catch (error) {
        console.error('Fetch global revenue error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch global payment data' });
    }
});

// --- CONFIRM PAYMENT (ADMIN ONLY) ---
app.patch('/registrations/:id/confirm-payment', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    try {
        // Verify ownership through event and check event status
        const check = await pool.query(`
            SELECT r.id, e.date as event_date
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = $1 AND e.organizer_id = $2
        `, [id, organizerId]);

        if (check.rows.length === 0) return res.status(403).json({ success: false, message: 'Unauthorized or registration not found' });
        
        // Check if event has ended
        const eventDate = new Date(check.rows[0].event_date);
        if (eventDate < new Date()) {
            return res.status(403).json({ success: false, message: 'Cannot update payment for past events' });
        }

        await pool.query("UPDATE registrations SET payment_status = 'Paid' WHERE id = $1", [id]);
        res.status(200).json({ success: true, message: 'Payment confirmed successfully' });
    } catch (error) {
        console.error('Confirm payment error:', error);
        res.status(500).json({ success: false, message: 'Failed to confirm payment' });
    }
});

app.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const organizerId = req.session.user.id;
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        
        // Total events and active (upcoming) events for THIS organizer
        const totalEventsCount = await pool.query('SELECT COUNT(*) FROM events WHERE organizer_id = $1', [organizerId]);
        const activeEventsCount = await pool.query("SELECT COUNT(*) FROM events WHERE date >= NOW() AND status = 'Published' AND organizer_id = $1", [organizerId]);
        
        // Total registrations and active registrations (for upcoming events) for THIS organizer
        const totalRegsCount = await pool.query(`
            SELECT COUNT(*), SUM(organizer_revenue) as revenue 
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE e.organizer_id = $1
        `, [organizerId]);
        const activeRegsCount = await pool.query(`
            SELECT COUNT(*) FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE e.date >= NOW() AND e.organizer_id = $1
        `, [organizerId]);
        
        res.status(200).json({ 
            success: true, 
            stats: {
                users: parseInt(usersCount.rows[0].count),
                events: parseInt(totalEventsCount.rows[0].count),
                activeEvents: parseInt(activeEventsCount.rows[0].count),
                registrations: parseInt(totalRegsCount.rows[0].count),
                activeRegistrations: parseInt(activeRegsCount.rows[0].count),
                revenue: parseFloat(totalRegsCount.rows[0].revenue) || 0
            }
        });
    } catch(error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
    }
});

// --- PAYMENT STATUS UPDATE (Admin) ---
app.patch('/registrations/:id/payment-status', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { payment_status, platform_fee_status } = req.body;
    const organizerId = req.session.user.id;
    const userRole = req.session.user.roleName;

    const validStatuses = ['Paid', 'Pending', 'Cancelled'];
    if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status. Must be Paid, Pending, or Cancelled.' });
    }

    if (platform_fee_status && !['Paid', 'Pending'].includes(platform_fee_status)) {
        return res.status(400).json({ success: false, message: 'Invalid platform fee status. Must be Paid or Pending.' });
    }

    try {
        // Verify the registration belongs to an event owned by this organizer (Super Admin bypasses this)
        let eventCheckQuery = `
            SELECT r.id, e.date as event_date FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = $1
        `;
        let queryParams = [id];
        
        if (userRole !== 'Super Admin') {
            eventCheckQuery += ` AND e.organizer_id = $2`;
            queryParams.push(organizerId);
        }
        
        const regCheck = await pool.query(eventCheckQuery, queryParams);

        if (regCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Registration not found or unauthorized' });
        }
        
        // Check if event has ended
        const eventDate = new Date(regCheck.rows[0].event_date);
        if (eventDate < new Date()) {
            return res.status(403).json({ success: false, message: 'Cannot update payment status for past events' });
        }

        if (platform_fee_status) {
            await pool.query('UPDATE registrations SET payment_status = $1, platform_fee_status = $2 WHERE id = $3', [payment_status, platform_fee_status, id]);
        } else {
            await pool.query('UPDATE registrations SET payment_status = $1 WHERE id = $2', [payment_status, id]);
        }

        res.status(200).json({ success: true, message: `Payment status updated to ${payment_status}` });
    } catch (error) {
        console.error('Payment status update error:', error);
        res.status(500).json({ success: false, message: 'Failed to update payment status' });
    }
});

// --- BATCH PAYMENT STATUS UPDATE (Admin) ---
app.post('/registrations/batch-payment-status', requireAdmin, async (req, res) => {
    const { registrationIds, payment_status, platform_fee_status } = req.body;
    const organizerId = req.session.user.id;
    const userRole = req.session.user.roleName;

    const validStatuses = ['Paid', 'Pending', 'Cancelled'];
    if (!validStatuses.includes(payment_status)) {
        return res.status(400).json({ success: false, message: 'Invalid payment status.' });
    }

    if (platform_fee_status && !['Paid', 'Pending'].includes(platform_fee_status)) {
        return res.status(400).json({ success: false, message: 'Invalid platform fee status.' });
    }
    
    if (!Array.isArray(registrationIds) || registrationIds.length === 0) {
        return res.status(400).json({ success: false, message: 'No registrations provided.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        let validIds = registrationIds;
        
        // If not super admin, filter out ids that don't belong to their events and check for past events
        let regCheckQuery = `
            SELECT r.id, e.date as event_date FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE r.id = ANY($1)
        `;
        let queryParams = [registrationIds];
        
        if (userRole !== 'Super Admin') {
            regCheckQuery += ` AND e.organizer_id = $2`;
            queryParams.push(organizerId);
        }
        
        const regCheck = await client.query(regCheckQuery, queryParams);
        
        if (regCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Unauthorized for these registrations' });
        }
        
        // Check if any event has ended
        const pastEventIds = regCheck.rows
            .filter(row => new Date(row.event_date) < new Date())
            .map(row => row.id);
        
        if (pastEventIds.length > 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: `Cannot update payment status for ${pastEventIds.length} registration(s) from past events` });
        }
        
        validIds = regCheck.rows.map(row => row.id);

        if (platform_fee_status) {
            await client.query('UPDATE registrations SET payment_status = $1, platform_fee_status = $2 WHERE id = ANY($3)', [payment_status, platform_fee_status, validIds]);
        } else {
            await client.query('UPDATE registrations SET payment_status = $1 WHERE id = ANY($2)', [payment_status, validIds]);
        }
        
        await client.query('COMMIT');
        
        res.status(200).json({ 
            success: true, 
            message: `Updated ${validIds.length} registration(s) to ${payment_status}`,
            updatedIds: validIds
        });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Batch update error:', error);
        res.status(500).json({ success: false, message: 'Failed to batch update payment status' });
    } finally {
        client.release();
    }
});

// --- SUPER ADMIN EVENT MANAGEMENT ---
app.get('/super/events', requireSuperAdmin, async (req, res) => {
    try {
        const eventsResult = await pool.query(`
            SELECT 
                e.id,
                e.title,
                e.date,
                e.location,
                u.name as organizer_name,
                COUNT(r.id) as total_registrations
            FROM events e
            LEFT JOIN users u ON e.organizer_id = u.id
            LEFT JOIN registrations r ON r.event_id = e.id
            GROUP BY 
                e.id,
                e.title,
                e.date,
                e.location,
                u.name
            ORDER BY e.date DESC
        `);

        res.status(200).json({
            success: true,
            events: eventsResult.rows
        });
    } catch (error) {
        console.error('Fetch all events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch global events' });
    }
});

// --- QR CODE CHECK-IN SYSTEM ---

// Generate QR code for event (organizer only)
app.post('/events/:id/generate-qr', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    
    try {
        // Verify event belongs to organizer
        const eventResult = await pool.query(
            'SELECT id, title FROM events WHERE id = $1 AND organizer_id = $2',
            [id, organizerId]
        );
        
        if (eventResult.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Event not found or unauthorized' });
        }
        
        // Create QR data as a clickable URL that opens the scanner
        // Use PUBLIC_URL from env if available, otherwise construct from request
        let baseUrl = process.env.PUBLIC_URL;
        if (!baseUrl) {
            const protocol = req.protocol || 'http';
            const host = req.get('host');
            baseUrl = `${protocol}://${host}`;
        }
        
        const qrUrl = `${baseUrl}/scanner?eventId=${id}`;
        
        // Generate QR code as data URL
        const qrCode = await QRCode.toDataURL(qrUrl, {
            errorCorrectionLevel: 'H',
            type: 'image/png',
            width: 300,
            margin: 1,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        
        res.status(200).json({
            success: true,
            qrCode: qrCode,
            eventId: id,
            eventTitle: eventResult.rows[0].title,
            scanUrl: qrUrl
        });
    } catch (error) {
        console.error('QR generation error:', error);
        res.status(500).json({ success: false, message: 'Failed to generate QR code' });
    }
});

// Mark attendee as checked in (scanner/organizer)
app.post('/registrations/:id/check-in', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    try {
        // Check if registration exists
        const regResult = await pool.query(
            `SELECT r.id, r.event_id, e.organizer_id, r.user_id 
             FROM registrations r
             JOIN events e ON r.event_id = e.id
             WHERE r.id = $1`,
            [id]
        );
        
        if (regResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        
        const registration = regResult.rows[0];
        
        // Verify user is organizer or admin
        const userResult = await pool.query(
            'SELECT role_id FROM users WHERE id = $1',
            [userId]
        );
        
        const roleId = userResult.rows[0].role_id;
        const isOrganizerOrAdmin = registration.organizer_id === userId || roleId === 2 || roleId === 3;
        
        if (!isOrganizerOrAdmin) {
            return res.status(403).json({ success: false, message: 'Not authorized to check in attendees' });
        }
        
        // Check if already checked in
        const checkInResult = await pool.query(
            'SELECT id FROM check_ins WHERE registration_id = $1',
            [id]
        );
        
        if (checkInResult.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Already checked in' });
        }
        
        // Insert check-in record
        await pool.query(
            `INSERT INTO check_ins (registration_id, checked_in_by)
             VALUES ($1, $2)`,
            [id, userId]
        );
        
        // Get attendee info
        const attendeeResult = await pool.query(
            `SELECT u.name, u.email FROM registrations r
             JOIN users u ON r.user_id = u.id
             WHERE r.id = $1`,
            [id]
        );
        
        const attendeeName = attendeeResult.rows[0].name;
        const attendeeEmail = attendeeResult.rows[0].email;
        
        // Get event title
        const eventResult = await pool.query('SELECT title FROM events WHERE id = $1', [registration.event_id]);
        const eventTitle = eventResult.rows[0].title;
        
        // Send check-in confirmation email in background
        sendCheckInConfirmationEmail(attendeeEmail, attendeeName, eventTitle).catch(err =>
            console.error('Failed to send check-in confirmation email:', err)
        );
        
        res.status(200).json({
            success: true,
            message: `${attendeeName} checked in successfully!`,
            attendeeName: attendeeName
        });
    } catch (error) {
        console.error('Check-in error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ success: false, message: 'Failed to check in attendee: ' + error.message });
    }
});

// Mobile Check-In Endpoint (for scanner - no auth required)
app.post('/registrations/:id/mobile-check-in', async (req, res) => {
    const { id } = req.params;
    const { eventId } = req.body;
    
    console.log('🔵 Mobile Check-In Request:', { registrationId: id, eventId });
    
    try {
        // First, check if registration exists and matches event (if eventId provided)
        let query = `
            SELECT r.id, r.event_id, r.user_id, e.title
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            WHERE (r.id::text = LOWER($1) OR r.qr_code = $1)
        `;
        let params = [id];

        if (eventId) {
            query += ' AND r.event_id = $2';
            params.push(eventId);
        }

        const regResult = await pool.query(query, params);
        
        if (regResult.rows.length === 0) {
            console.log('❌ Registration not found or mismatch for ID:', id);
            return res.status(404).json({ 
                success: false, 
                message: eventId 
                    ? 'Ticket ID not found for this event. Check your ID.' 
                    : 'Registration not found. Check your ID.' 
            });
        }
        
        const registration = regResult.rows[0];
        console.log('✓ Registration found:', { id: registration.id, eventTitle: registration.title });
        
        // Check if already checked in
        const checkInResult = await pool.query(
            'SELECT id FROM check_ins WHERE registration_id = $1',
            [registration.id]
        );
        
        if (checkInResult.rows.length > 0) {
            console.log('❌ Already checked in:', registration.id);
            return res.status(400).json({ success: false, message: 'This ticket has already been checked in.' });
        }
        
        // Insert check-in record
        await pool.query(
            `INSERT INTO check_ins (registration_id, checked_in_by)
             VALUES ($1, NULL)`,
            [registration.id]
        );
        
        // Get attendee info
        const attendeeResult = await pool.query(
            `SELECT u.name, u.email FROM users u WHERE u.id = $1`,
            [registration.user_id]
        );
        
        if (attendeeResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        const attendeeName = attendeeResult.rows[0].name;
        const attendeeEmail = attendeeResult.rows[0].email;
        const eventTitle = registration.title;
        
        // Send check-in confirmation email in background
        sendCheckInConfirmationEmail(attendeeEmail, attendeeName, eventTitle).catch(err =>
            console.error('Failed to send check-in confirmation email:', err)
        );

        res.status(200).json({
            success: true,
            message: `✓ ${attendeeName} checked in successfully!`,
            attendeeName: attendeeName
        });
    } catch (error) {
        console.error('❌ Mobile check-in error:', error.message);
        console.error('Full error:', error);
        res.status(500).json({ success: false, message: 'Error: ' + error.message });
    }
});

// Get attendance stats for event (organizer only)
app.get('/events/:id/attendance', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const organizerId = req.session.user.id;
    
    try {
        // Verify event belongs to organizer
        const eventCheck = await pool.query(
            'SELECT id FROM events WHERE id = $1 AND organizer_id = $2',
            [id, organizerId]
        );
        
        if (eventCheck.rows.length === 0) {
            return res.status(403).json({ success: false, message: 'Unauthorized' });
        }
        
        // Get total registrations
        const totalResult = await pool.query(
            'SELECT COUNT(*) as total FROM registrations WHERE event_id = $1',
            [id]
        );
        
        // Get checked-in count
        const checkedInResult = await pool.query(
            `SELECT COUNT(*) as checked_in FROM check_ins ci
             JOIN registrations r ON ci.registration_id = r.id
             WHERE r.event_id = $1`,
            [id]
        );
        
        // Get checked-in attendees list
        const attendeesResult = await pool.query(
            `SELECT 
                u.name,
                r.id as registration_id,
                ci.checked_in_at,
                checker.name as checked_in_by
            FROM check_ins ci
            JOIN registrations r ON ci.registration_id = r.id
            JOIN users u ON r.user_id = u.id
            JOIN events e ON r.event_id = e.id
            LEFT JOIN users checker ON ci.checked_in_by = checker.id
            WHERE e.id = $1
            ORDER BY ci.checked_in_at DESC`,
            [id]
        );
        
        const total = parseInt(totalResult.rows[0].total);
        const checkedIn = parseInt(checkedInResult.rows[0].checked_in);
        const attendanceRate = total > 0 ? ((checkedIn / total) * 100).toFixed(1) : 0;
        
        res.status(200).json({
            success: true,
            stats: {
                totalRegistrations: total,
                checkedInCount: checkedIn,
                notCheckedIn: total - checkedIn,
                attendanceRate: attendanceRate
            },
            attendees: attendeesResult.rows
        });
    } catch (error) {
        console.error('Attendance stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch attendance data' });
    }
});

// Resend registration confirmation email
app.post('/registrations/:id/resend-email', requireAuth, async (req, res) => {
    const { id } = req.params;
    const userId = req.session.user.id;
    
    try {
        // Get registration details
        const regResult = await pool.query(
            `SELECT r.id, r.user_id, r.event_id, e.title, u.name, u.email
             FROM registrations r
             JOIN events e ON r.event_id = e.id
             JOIN users u ON r.user_id = u.id
             WHERE r.id = $1`,
            [id]
        );
        
        if (regResult.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Registration not found' });
        }
        
        const registration = regResult.rows[0];
        
        // Only the registered user or an admin can request resend
        if (userId !== registration.user_id && req.session.user.roleName !== 'Admin' && req.session.user.roleName !== 'Super Admin') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }
        
        // Send confirmation email
        await sendRegistrationConfirmationEmail(registration.email, registration.name, registration.title, registration.id);
        
        res.status(200).json({
            success: true,
            message: `Confirmation email resent to ${registration.email}`
        });
    } catch (error) {
        console.error('Resend email error:', error);
        res.status(500).json({ success: false, message: 'Failed to resend email' });
    }
});

app.delete('/super/events/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        
        // Let the DB CASCADE delete related tickets, registrations, ratings, constraints
        const deleteResult = await pool.query('DELETE FROM events WHERE id = $1 RETURNING id', [id]);
        
        if (deleteResult.rowCount === 0) {
            return res.status(404).json({ success: false, message: 'Event not found' });
        }

        res.status(200).json({ success: true, message: 'Event permanently deleted from platform' });
    } catch (error) {
        console.error('Super Admin Delete event error:', error);
        res.status(500).json({ success: false, message: 'Failed to delete event globally' });
    }
});

// --- PLATFORM CONFIGURATION APIs ---
app.get('/platform/config', async (req, res) => {
    try {
        const result = await pool.query('SELECT key, value FROM platform_settings');
        const config = {};
        result.rows.forEach(row => {
            config[row.key] = row.value;
        });
        res.status(200).json({ success: true, config });
    } catch (error) {
        console.error('Fetch platform config error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch platform configuration' });
    }
});

app.patch('/super/config', requireSuperAdmin, async (req, res) => {
    const { platform_fee } = req.body;
    
    if (platform_fee !== undefined) {
        const fee = parseFloat(platform_fee);
        if (isNaN(fee) || fee < 0 || fee > 100) {
            return res.status(400).json({ success: false, message: 'Invalid platform fee. Must be between 0 and 100.' });
        }
        
        try {
            await pool.query("INSERT INTO platform_settings (key, value) VALUES ('platform_fee', $1) ON CONFLICT (key) DO UPDATE SET value = $1", [fee.toFixed(2)]);
            return res.status(200).json({ success: true, message: 'Platform configuration updated successfully' });
        } catch (error) {
            console.error('Update platform config error:', error);
            return res.status(500).json({ success: false, message: 'Failed to update platform configuration' });
        }
    }
    
    res.status(400).json({ success: false, message: 'No valid setting provided' });
});

// --- AUTO-MIGRATION: Ensure dynamic columns exist ---
const runMigrations = async () => {
    const ensureColumn = async (tableName, columnName, columnDef) => {
        try {
            await pool.query(`ALTER TABLE ${tableName} ADD COLUMN IF NOT EXISTS ${columnName} ${columnDef}`);
            console.log(`Migration check: ${columnName} column ensured on ${tableName} table.`);
        } catch (error) {
            console.error(`Migration (ALTER TABLE) failed for ${columnName}, trying conditional approach:`, error.message);
            try {
                const colCheck = await pool.query(`
                    SELECT column_name FROM information_schema.columns 
                    WHERE table_name = $1 AND column_name = $2
                `, [tableName, columnName]);
                if (colCheck.rows.length === 0) {
                    await pool.query(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDef}`);
                    console.log(`Migration: ${columnName} column added via conditional approach.`);
                } else {
                    console.log(`Migration: ${columnName} column already exists.`);
                }
            } catch (err2) {
                console.error(`Migration fallback for ${columnName} also failed:`, err2);
            }
        }
    };

    await ensureColumn('registrations', 'is_archived', 'BOOLEAN DEFAULT FALSE');
    await ensureColumn('registrations', 'device_info', 'VARCHAR(255)');
    await ensureColumn('registrations', 'platform_fee_status', "VARCHAR(20) DEFAULT 'Pending'");
    await ensureColumn('registrations', 'platform_fee', 'DECIMAL(10,2) DEFAULT 0');
    await ensureColumn('registrations', 'organizer_revenue', 'DECIMAL(10,2) DEFAULT 0');
    await ensureColumn('events', 'additional_images', "JSONB DEFAULT '[]'::jsonb");
    
    // Backfill platform_fee_status for GCash
    try {
        await pool.query("UPDATE registrations SET platform_fee_status = 'Paid' WHERE payment_method = 'GCash' AND platform_fee_status = 'Pending'");
        await pool.query("UPDATE registrations SET platform_fee = 2.00, organizer_revenue = total_price - 2.00 WHERE payment_method = 'GCash' AND platform_fee = 0 AND total_price >= 2.00");
        await pool.query("UPDATE registrations SET platform_fee = 2.00, organizer_revenue = total_price WHERE (payment_method IS NULL OR payment_method != 'GCash') AND platform_fee = 0 AND total_price > 0");
        console.log("Migration check: Backfilled platform_fee and status for existing registrations.");
    } catch (e) {
        console.error("Migration backfill status error:", e.message);
    }
    
    // Ensure Reviews Table EXISTS
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS event_reviews (
                id UUID PRIMARY KEY,
                event_id UUID REFERENCES events(id) ON DELETE CASCADE,
                user_id UUID REFERENCES users(id) ON DELETE CASCADE,
                rating INTEGER CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(event_id, user_id)
            )
        `);
        console.log("Migration check: event_reviews table ensured.");
    } catch (e) {
        console.error("Migration event_reviews table error:", e.message);
    }

    // Ensure Platform Settings Table EXISTS
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS platform_settings (
                key VARCHAR(50) PRIMARY KEY,
                value VARCHAR(255)
            )
        `);
        await pool.query("INSERT INTO platform_settings (key, value) VALUES ('platform_fee', '2.00') ON CONFLICT (key) DO NOTHING");
        console.log("Migration check: platform_settings table ensured.");
    } catch (e) {
        console.error("Migration platform_settings table error:", e.message);
    }
};


// --- AUTO-CLEANUP ---
const cleanupOldRegistrations = async () => {
    try {
        console.log('--- CLEANUP_START: Permanently deleting events older than 30 days ---');
        // Deleting events will cascade delete registrations due to ON DELETE CASCADE
        const result = await pool.query(`
            DELETE FROM events 
            WHERE date < NOW() - INTERVAL '30 days'
        `);
        console.log(`CLEANUP_SUCCESS: Deleted ${result.rowCount} old events and their registrations.`);
        console.log('--- CLEANUP_END ---');
    } catch (error) {
        console.error('CLEANUP_ERROR:', error);
    }
};

// Start server after migrations complete
(async () => {
    await runMigrations();
    await cleanupOldRegistrations();
    setInterval(cleanupOldRegistrations, 24 * 60 * 60 * 1000);
    
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
})();