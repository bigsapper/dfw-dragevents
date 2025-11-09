-- Add end_date column to events table
-- Note: event_datetime serves as the start date
ALTER TABLE events ADD COLUMN end_date DATETIME;

-- Create index for the new date column
CREATE INDEX IF NOT EXISTS idx_events_end_date ON events(end_date);
