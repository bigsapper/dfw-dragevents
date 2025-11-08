-- tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  city TEXT,
  address TEXT,
  url TEXT
);

-- events table
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  track_id INTEGER NOT NULL,
  event_datetime DATETIME NOT NULL,
  event_driver_fee REAL,
  event_spectator_fee REAL,
  url TEXT,
  description TEXT,
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE CASCADE
);

-- event-specific classes for each event
CREATE TABLE IF NOT EXISTS event_classes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  buyin_fee REAL,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

-- child rules per event class (multiple rows per class)
CREATE TABLE IF NOT EXISTS event_class_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_class_id INTEGER NOT NULL,
  rule TEXT NOT NULL,
  FOREIGN KEY (event_class_id) REFERENCES event_classes(id) ON DELETE CASCADE
);

-- indexes
CREATE INDEX IF NOT EXISTS idx_events_track_id ON events(track_id);
CREATE INDEX IF NOT EXISTS idx_events_event_datetime ON events(event_datetime);
CREATE INDEX IF NOT EXISTS idx_event_classes_event_id ON event_classes(event_id);
CREATE INDEX IF NOT EXISTS idx_event_class_rules_class_id ON event_class_rules(event_class_id);
