-- Schema for Event Hub Rating & Review System

CREATE TABLE IF NOT EXISTS event_reviews (
    id UUID PRIMARY KEY,
    event_id UUID REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- This ensures a user can only rate an event once (it will update instead)
    UNIQUE (event_id, user_id)
);
