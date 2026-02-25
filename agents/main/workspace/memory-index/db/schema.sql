-- Memory System SQLite + FTS5 Schema
-- Created: 2026-02-11

-- Main memory entries table
CREATE TABLE IF NOT EXISTS memory_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_file TEXT NOT NULL,
    entry_date DATE NOT NULL,
    entry_type TEXT CHECK(entry_type IN ('daily_log', 'long_term', 'archive', 'system')),
    title TEXT,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- FTS5 virtual table for full-text search
CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
    content,
    title,
    source_file,
    entry_date,
    content='memory_entries',
    content_rowid='id'
);

-- Triggers to keep FTS index in sync
CREATE TRIGGER IF NOT EXISTS memory_insert AFTER INSERT ON memory_entries BEGIN
    INSERT INTO memory_fts(rowid, content, title, source_file, entry_date)
    SELECT new.id, new.content, new.title, new.source_file, new.entry_date;
END;

CREATE TRIGGER IF NOT EXISTS memory_delete AFTER DELETE ON memory_entries BEGIN
    DELETE FROM memory_fts WHERE rowid = old.id;
END;

CREATE TRIGGER IF NOT EXISTS memory_update AFTER UPDATE ON memory_entries BEGIN
    DELETE FROM memory_fts WHERE rowid = old.id;
    INSERT INTO memory_fts(rowid, content, title, source_file, entry_date)
    SELECT new.id, new.content, new.title, new.source_file, new.entry_date;
END;

-- Index for date-based queries
CREATE INDEX IF NOT EXISTS idx_memory_date ON memory_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_memory_type ON memory_entries(entry_type);
CREATE INDEX IF NOT EXISTS idx_memory_source ON memory_entries(source_file);

-- Tags table for categorization
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tag_name TEXT UNIQUE NOT NULL,
    tag_category TEXT
);

-- Many-to-many relationship
CREATE TABLE IF NOT EXISTS memory_tags (
    memory_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (memory_id, tag_id),
    FOREIGN KEY (memory_id) REFERENCES memory_entries(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

-- Initial tags seed
INSERT OR IGNORE INTO tags (tag_name, tag_category) VALUES
    ('投资', 'finance'),
    ('交易', 'finance'),
    ('股票', 'finance'),
    ('技术', 'tech'),
    ('配置', 'system'),
    ('决策', 'decision'),
    ('学习', 'growth'),
    ('系统', 'system'),
    ('规则', 'principle'),
    ('人生目标', 'life');

-- Search statistics
CREATE TABLE IF NOT EXISTS search_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    results_count INTEGER,
    searched_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Log the schema creation
INSERT INTO memory_entries (source_file, entry_date, entry_type, title, content)
VALUES (
    'system',
    '2026-02-11',
    'system',
    'SQLite FTS Schema Created',
    'Memory indexing system initialized with FTS5 support. Database schema v1.0.'
);