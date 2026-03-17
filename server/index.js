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
    if (req.session.user.roleName !== 'Admin') {
        return res.status(403).json({ success: false, message: 'Forbidden: Admins only access' });
    }
    next();
};

// --- AUTH APIs ---
app.post('/register', async (req, res) => {
    const { username, password, name, roleName = 'User' } = req.body;
    const id = randomUUID();
    
    try {
        const hashedPassword = hashPassword(password, 10);
        
        // Find role_id
        const roleResult = await pool.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: 'Invalid role specified' });
        }
        const roleId = roleResult.rows[0].id;
        
        await pool.query(
            'INSERT INTO users (id, username, password, name, role_id) VALUES ($1, $2, $3, $4, $5)', 
            [id, username, hashedPassword, name, roleId]
        );
        res.status(201).json({ success: true, message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ success: false, message: 'Registration failed' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const result = await pool.query(`
            SELECT u.*, r.name as role_name 
            FROM users u 
            JOIN roles r ON u.role_id = r.id 
            WHERE u.username = $1`, [username]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        const user = result.rows[0];
        const match = comparePassword(password, user.password);

        if (match) {
            req.session.user = { id: user.id, name: user.name, roleName: user.role_name };
            res.status(200).json({ success: true, message: 'Login successful', user: req.session.user });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, message: 'Login failed' });
    }
});

app.get('/get-session', (req, res) => {
    if (req.session.user) {
        res.status(200).json({ success: true, session: true, user: req.session.user });
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

// --- EVENT MANAGEMENT APIs ---
app.get('/events', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM events ORDER BY date ASC');
        res.status(200).json({ success: true, events: result.rows });
    } catch (error) {
        console.error('Fetch events error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch events' });
    }
});

app.get('/events/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query('SELECT * FROM events WHERE id = $1', [id]);
        if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Event not found' });
        
        // Fetch tickets as well
        const ticketsResult = await pool.query('SELECT * FROM tickets WHERE event_id = $1', [id]);
        
        res.status(200).json({ success: true, event: result.rows[0], tickets: ticketsResult.rows });
    } catch (error) {
        console.error('Fetch event details error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch event details' });
    }
});

app.post('/events', upload.single('image'), requireAdmin, async (req, res) => {
    console.log('--- EVENT_CREATE_START ---');
    console.log('REQ_BODY:', req.body);
    console.log('REQ_FILE:', req.file);
    console.log('SESSION_USER:', req.session.user);

    const { title, description, date, location, capacity, status = 'Published' } = req.body;
    const id = randomUUID();
    const organizerId = req.session.user?.id;
    const image_url = req.file ? req.file.filename : null;
    
    try {
        if (!title || !date || !location || !capacity) {
            console.log('MISSING_FIELDS:', { title, date, location, capacity });
            return res.status(400).json({ success: false, message: 'Missing required fields' });
        }

        const result = await pool.query(
            `INSERT INTO events (id, title, description, date, location, capacity, organizer_id, image_url, status) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
            [id, title, description, date, location, parseInt(capacity), organizerId, image_url, status]
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

app.put('/events/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { title, description, date, location, capacity, image_url, status } = req.body;
    try {
        await pool.query(
            `UPDATE events SET title = $1, description = $2, date = $3, location = $4, capacity = $5, image_url = $6, status = $7 WHERE id = $8`,
            [title, description, date, location, capacity, image_url, status, id]
        );
        res.status(200).json({ success: true, message: 'Event updated successfully' });
    } catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({ success: false, message: 'Failed to update event' });
    }
});

app.delete('/events/:id', requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
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
    const { event_id, ticket_id, quantity } = req.body;
    const user_id = req.session.user.id;
    const reg_id = randomUUID();
    
    try {
        await pool.query('BEGIN');
        
        const ticketResult = await pool.query('SELECT price, quantity_available FROM tickets WHERE id = $1', [ticket_id]);
        if (ticketResult.rows.length === 0) throw new Error('Ticket not found');
        
        const ticket = ticketResult.rows[0];
        if (ticket.quantity_available < quantity) throw new Error('Not enough tickets available');
        
        const total_price = ticket.price * quantity;
        const qr_code = randomUUID();

        // Update ticket quantity
        await pool.query('UPDATE tickets SET quantity_available = quantity_available - $1 WHERE id = $2', [quantity, ticket_id]);
        
        // Insert registration
        await pool.query(
            `INSERT INTO registrations (id, user_id, event_id, ticket_id, quantity, total_price, payment_status, qr_code)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [reg_id, user_id, event_id, ticket_id, quantity, total_price, 'Completed', qr_code]
        );
        
        await pool.query('COMMIT');
        res.status(201).json({ success: true, message: 'Successfully registered for the event', qr_code });
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error('Registration error:', error);
        res.status(400).json({ success: false, message: error.message });
    }
});

app.get('/my-registrations', requireAuth, async (req, res) => {
    const user_id = req.session.user.id;
    try {
        const result = await pool.query(`
            SELECT r.*, e.title as event_title, e.date as event_date, e.location, e.image_url as event_image, t.name as ticket_name 
            FROM registrations r
            JOIN events e ON r.event_id = e.id
            JOIN tickets t ON r.ticket_id = t.id
            WHERE r.user_id = $1
            ORDER BY r.purchased_at DESC
        `, [user_id]);
        res.status(200).json({ success: true, registrations: result.rows });
    } catch (error) {
        console.error('Get user registrations error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch registrations' });
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
        const usersCount = await pool.query('SELECT COUNT(*) FROM users');
        const eventsCount = await pool.query('SELECT COUNT(*) FROM events');
        const regsCount = await pool.query('SELECT COUNT(*), SUM(total_price) as revenue FROM registrations');
        
        res.status(200).json({ 
            success: true, 
            stats: {
                users: parseInt(usersCount.rows[0].count),
                events: parseInt(eventsCount.rows[0].count),
                registrations: parseInt(regsCount.rows[0].count),
                revenue: parseFloat(regsCount.rows[0].revenue) || 0
            }
        });
    } catch(error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch admin stats' });
    }
});


app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});