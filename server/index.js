import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import session from 'express-session';
import { pool } from './db.js';
import { randomUUID } from 'crypto';
import { hashPassword, comparePassword } from './components/hash.js';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

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
  'http://127.0.0.1:3000'
];

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url} - Origin: ${req.headers.origin}`);
  next();
});
     
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    // Allow all Vercel preview deployments
    if (origin.endsWith('.vercel.app') || allowedOrigins.includes(origin)) {
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
    const { username, password, name, roleName = 'User', bio = '' } = req.body;
    const id = randomUUID();
    const profile_image = req.file ? req.file.filename : null;
    
    console.log('--- Registration Attempt ---');
    console.log('Body Keys:', Object.keys(req.body));
    console.log('Username:', username);
    
    try {
        if (!username || !password) {
            return res.status(400).json({ success: false, message: 'Username and password are required' });
        }

        const hashedPassword = hashPassword(password, 10);
        
        // Find role_id
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }
        const roleId = roleResult.rows[0].id;
        
        // Check if username already exists (case-insensitive)
        const userCheck = await pool.query('SELECT id FROM users WHERE LOWER(username) = LOWER($1)', [username]);
        if (userCheck.rows.length > 0) {
            return res.status(400).json({ success: false, message: 'Username is already taken' });
        }

        await pool.query(
            'INSERT INTO users (id, username, password, name, role_id, profile_image, bio) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [id, username, hashedPassword, name, roleId, profile_image, bio]
        );
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        if (error.code === '23505') {
            return res.status(400).json({ success: false, message: 'Username is already taken' });
        }
        res.status(500).json({ success: false, message: `Registration failed: ${error.message}${error.code ? ' (Code: ' + error.code + ')' : ''}` });
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
            'INSERT INTO users (id, username, password, name, role_id, profile_image, bio) VALUES ($1, $2, $3, $4, $5, $6, $7)', 
            [id, username, hashedPassword, name, roleId, '', '']
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
        console.log(`Password Match: ${match}, Length: ${password.length}, Hash Prefix: ${user.password.substring(0, 10)}`);

        if (match) {
            req.session.user = { 
                id: user.id, 
                username: user.username,
                name: user.name, 
                roleName: user.role_name,
                profile_image: user.profile_image,
                bio: user.bio
            };
            res.status(200).json({ 
                success: true, 
                message: 'Login successful', 
                user: {
                    ...req.session.user,
                    username: user.username // Explicitly from DB
                } 
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
            // Force fetch latest username from DB to be 100% sure
            const userRes = await pool.query('SELECT username FROM users WHERE id = $1', [req.session.user.id]);
            const dbUsername = userRes.rows[0]?.username;
            
            res.status(200).json({ 
                success: true, 
                session: true, 
                user: {
                    ...req.session.user,
                    username: dbUsername || req.session.user.username || 'System Error: No Username'
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
    const { name, bio } = req.body;
    const userId = req.session.user.id;
    const profile_image = req.file ? req.file.filename : req.session.user.profile_image;

    try {
        if (!userId) {
            return res.status(400).json({ success: false, message: 'User ID missing from session' });
        }

        await pool.query(
            'UPDATE users SET name = $1, bio = $2, profile_image = $3 WHERE id = $4',
            [name || req.session.user.name, bio || req.session.user.bio, profile_image, userId]
        );
        
        // Update session
        req.session.user = { 
            ...req.session.user, 
            name: name || req.session.user.name, 
            bio: bio || req.session.user.bio, 
            profile_image 
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
        const eventsResult = await pool.query('SELECT * FROM events ORDER BY date ASC');
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
                r.id, r.quantity, r.total_price as revenue, r.purchased_at, r.device_info,
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
        const eventResult = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
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
            userName: req.session.user?.name
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

// --- REGISTRATIONS ---
app.post('/register-event', requireAuth, async (req, res) => {
    const { event_id, ticket_id, quantity, device_info } = req.body;
    const user_id = req.session.user.id;
    const reg_id = randomUUID();
    const qr_code = randomUUID(); // Define qr_code here

    try {
        await pool.query('BEGIN');
        
        let totalPrice = 0;
        let ticketIdToStore = ticket_id;

        if (ticket_id) {
            const ticketResult = await pool.query('SELECT price, quantity_available FROM tickets WHERE id = $1', [ticket_id]);
            if (ticketResult.rows.length === 0) throw new Error('Ticket not found');
            
            const ticket = ticketResult.rows[0];
            if (ticket.quantity_available < quantity) throw new Error('Not enough tickets available');
            
            totalPrice = parseFloat(ticket.price) * quantity;
            
            // Deduct ticket quantity
            await pool.query('UPDATE tickets SET quantity_available = quantity_available - $1 WHERE id = $2', [quantity, ticket_id]);
        } else {
            // Check if the event has any tickets at all
            const eventTickets = await pool.query('SELECT id FROM tickets WHERE event_id = $1', [event_id]);
            if (eventTickets.rows.length > 0) {
                throw new Error('Please select a ticket tier for this event');
            }
            // Event has no tickets, allow free registration
            totalPrice = 0;
            ticketIdToStore = null;
        }

        await pool.query(
            `INSERT INTO registrations (id, user_id, event_id, ticket_id, quantity, total_price, payment_status, qr_code, device_info)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [reg_id, user_id, event_id, ticketIdToStore, quantity, totalPrice, 'Completed', qr_code, device_info || 'Unknown']
        );
        
        await pool.query('COMMIT');
        res.status(201).json({ success: true, message: 'Successfully registered for the event', qr_code });
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
        
        // Find the registration to ensure it exists and belongs to the user
        const regResult = await pool.query('SELECT ticket_id, quantity FROM registrations WHERE id = $1 AND user_id = $2', [id, user_id]);
        
        if (regResult.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Registration not found or unauthorized' });
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

// --- ADMIN REPORTS ---
app.get('/admin/stats', requireAdmin, async (req, res) => {
    try {
        const organizerId = req.session.user.id;
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        
        // Total events and active (upcoming) events for THIS organizer
        const totalEventsCount = await pool.query('SELECT COUNT(*) FROM events WHERE organizer_id = $1', [organizerId]);
        const activeEventsCount = await pool.query("SELECT COUNT(*) FROM events WHERE date >= NOW() AND status = 'Published' AND organizer_id = $1", [organizerId]);
        
        // Total registrations and active registrations (for upcoming events) for THIS organizer
        const totalRegsCount = await pool.query(`
            SELECT COUNT(*), SUM(total_price) as revenue 
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
    await ensureColumn('events', 'additional_images', "JSONB DEFAULT '[]'::jsonb");
    
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