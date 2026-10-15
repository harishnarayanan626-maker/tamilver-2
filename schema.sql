-- Sorkalam (சொற்காலம்) PostgreSQL Schema
-- Includes PostgreSQL pg_trgm and unaccent extensions, GIN indexes, B-tree indexes, and foreign keys.

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

-- Enum Types
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('student', 'researcher', 'scholar', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE change_type_enum AS ENUM ('spelling', 'meaning', 'usage');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE source_type_enum AS ENUM ('poem', 'inscription', 'grammar', 'prose');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE contribution_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 1. Periods
CREATE TABLE IF NOT EXISTS periods (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL, -- e.g. 'Sangam', 'Pallava', 'Chola', 'Nayak', 'Colonial', 'Modern'
    name_ta VARCHAR(100) NOT NULL, -- e.g. 'சங்க காலம்'
    start_year INTEGER NOT NULL,
    end_year INTEGER NOT NULL,
    color VARCHAR(30) NOT NULL DEFAULT 'coral',
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Users
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    role user_role NOT NULL DEFAULT 'researcher',
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    institution VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sources
CREATE TABLE IF NOT EXISTS sources (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    title_ta VARCHAR(255) NOT NULL,
    author VARCHAR(255),
    period_id VARCHAR(50) REFERENCES periods(id) ON DELETE RESTRICT,
    century VARCHAR(100),
    type source_type_enum NOT NULL DEFAULT 'poem',
    reference_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Words
CREATE TABLE IF NOT EXISTS words (
    id VARCHAR(50) PRIMARY KEY,
    lemma_modern VARCHAR(150) NOT NULL,
    lemma_ta VARCHAR(150) NOT NULL,
    transliteration VARCHAR(150) NOT NULL,
    pos VARCHAR(50) NOT NULL DEFAULT 'noun', -- noun, verb, adjective, etc.
    created_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Word Forms
CREATE TABLE IF NOT EXISTS word_forms (
    id VARCHAR(50) PRIMARY KEY,
    word_id VARCHAR(50) NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE RESTRICT,
    form_text VARCHAR(150) NOT NULL,
    script_variant VARCHAR(50) DEFAULT 'Tamil', -- e.g., 'Tamil-Brahmi', 'Vatteluttu', 'Tamil'
    frequency_score NUMERIC(5,2) NOT NULL DEFAULT 50.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Meanings
CREATE TABLE IF NOT EXISTS meanings (
    id VARCHAR(50) PRIMARY KEY,
    word_id VARCHAR(50) NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE RESTRICT,
    meaning_en TEXT NOT NULL,
    meaning_ta TEXT NOT NULL,
    confidence NUMERIC(3,2) NOT NULL DEFAULT 0.90 CHECK (confidence >= 0 AND confidence <= 1.0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Evidences
CREATE TABLE IF NOT EXISTS evidences (
    id VARCHAR(50) PRIMARY KEY,
    word_form_id VARCHAR(50) NOT NULL REFERENCES word_forms(id) ON DELETE CASCADE,
    source_id VARCHAR(50) NOT NULL REFERENCES sources(id) ON DELETE RESTRICT,
    verse_text TEXT NOT NULL,
    line_ref VARCHAR(100),
    translation_en TEXT,
    page_or_verse_no VARCHAR(100),
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_by VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Changes
CREATE TABLE IF NOT EXISTS changes (
    id VARCHAR(50) PRIMARY KEY,
    word_id VARCHAR(50) NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    from_period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE RESTRICT,
    to_period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE RESTRICT,
    change_type change_type_enum NOT NULL, -- spelling, meaning, usage
    description TEXT NOT NULL,
    similarity_score NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Saved Collections & Items
CREATE TABLE IF NOT EXISTS saved_collections (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS collection_items (
    id VARCHAR(50) PRIMARY KEY,
    collection_id VARCHAR(50) NOT NULL REFERENCES saved_collections(id) ON DELETE CASCADE,
    word_id VARCHAR(50) NOT NULL REFERENCES words(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(collection_id, word_id)
);

-- 10. Contributions
CREATE TABLE IF NOT EXISTS contributions (
    id VARCHAR(50) PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    word_text VARCHAR(150) NOT NULL,
    period_id VARCHAR(50) NOT NULL REFERENCES periods(id) ON DELETE RESTRICT,
    change_type change_type_enum NOT NULL,
    source_title VARCHAR(255) NOT NULL,
    verse_text TEXT NOT NULL,
    translation_en TEXT,
    line_ref VARCHAR(100),
    century VARCHAR(100),
    status contribution_status NOT NULL DEFAULT 'pending',
    reviewer_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Search Logs
CREATE TABLE IF NOT EXISTS search_logs (
    id VARCHAR(50) PRIMARY KEY,
    query VARCHAR(255) NOT NULL,
    user_id VARCHAR(50) REFERENCES users(id) ON DELETE SET NULL,
    results_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- INDEXES
-- GIN Trigram index on form_text and lemma_ta
CREATE INDEX IF NOT EXISTS idx_word_forms_trgm ON word_forms USING gin (form_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_words_lemma_ta_trgm ON words USING gin (lemma_ta gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_words_lemma_modern_trgm ON words USING gin (lemma_modern gin_trgm_ops);

-- B-Tree indexes on period_id, word_id, word_form_id, source_id
CREATE INDEX IF NOT EXISTS idx_word_forms_word_id ON word_forms(word_id);
CREATE INDEX IF NOT EXISTS idx_word_forms_period_id ON word_forms(period_id);
CREATE INDEX IF NOT EXISTS idx_meanings_word_id ON meanings(word_id);
CREATE INDEX IF NOT EXISTS idx_meanings_period_id ON meanings(period_id);
CREATE INDEX IF NOT EXISTS idx_evidences_form_id ON evidences(word_form_id);
CREATE INDEX IF NOT EXISTS idx_evidences_source_id ON evidences(source_id);
CREATE INDEX IF NOT EXISTS idx_changes_word_id ON changes(word_id);
CREATE INDEX IF NOT EXISTS idx_changes_from_period ON changes(from_period_id);
CREATE INDEX IF NOT EXISTS idx_changes_to_period ON changes(to_period_id);
CREATE INDEX IF NOT EXISTS idx_collection_items_col ON collection_items(collection_id);
CREATE INDEX IF NOT EXISTS idx_contributions_status ON contributions(status);
