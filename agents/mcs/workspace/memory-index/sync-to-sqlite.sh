#!/bin/bash
# Memory to SQLite Sync Script
# Syncs memory/*.md files to SQLite FTS database
# Usage: ./sync-to-sqlite.sh [--full-sync]

set -e

WORKSPACE_DIR="/Users/hope/.openclaw/agents/main/workspace"
MEMORY_DIR="$WORKSPACE_DIR/memory"
ARCHIVE_DIR="$MEMORY_DIR/archive"
DB_DIR="$WORKSPACE_DIR/memory-index"
DB_FILE="$DB_DIR/memory.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "=================================="
echo "Memory → SQLite Sync Tool"
echo "=================================="
echo ""

# Create directories if needed
mkdir -p "$DB_DIR/db"

# Initialize database if it doesn't exist
if [ ! -f "$DB_FILE" ]; then
    echo "🆕 Creating new database..."
    sqlite3 "$DB_FILE" < "$DB_DIR/db/schema.sql"
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo "📁 Database exists: $DB_FILE"
fi

# Parse command line
FULL_SYNC=false
if [ "$1" = "--full-sync" ]; then
    FULL_SYNC=true
    echo "🔄 Full sync mode enabled (clearing and re-indexing)"
    sqlite3 "$DB_FILE" "DELETE FROM memory_entries WHERE source_file != 'system';"
fi

# Function to extract date from filename
get_date_from_filename() {
    local filename=$(basename "$1")
    local date_str=$(echo "$filename" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}' || echo '')
    if [ -z "$date_str" ]; then
        date_str=$(date '+%Y-%m-%d')
    fi
    echo "$date_str"
}

# Function to determine entry type
get_entry_type() {
    local filepath="$1"
    if [[ "$filepath" == *"archive"* ]]; then
        echo "archive"
    elif [[ "$filepath" == *"MEMORY.md" ]]; then
        echo "long_term"
    else
        echo "daily_log"
    fi
}

# Function to extract title from markdown
get_title_from_content() {
    local content="$1"
    # Try to extract first h1 or first line
    local title=$(echo "$content" | grep -m1 '^# ' | sed 's/^# //' | head -c 100)
    if [ -z "$title" ]; then
        title=$(echo "$content" | head -1 | head -c 100)
    fi
    echo "$title"
}

# Function to auto-tag content
auto_tag_content() {
    local content="$1"
    local tags=""
    
    # Define keyword to tag mappings
    declare -A keywords
    keywords['股票\|持仓\|PE\|买入\|卖出\|挂单\|交易']='投资,交易,股票'
    keywords['GitHub\|git\|代码\|脚本\|数据库']='技术,系统'
    keywords['ES\|SQLite\|索引\|搜索']='技术,系统'
    keywords['Memory\|记忆\|日志\|归档']='系统,配置'
    keywords['规则\|原则\|禁止\|戒律']='规则,原则'
    keywords['目标\|愿景\|计划']='人生目标'
    keywords['学习\|总结\|反思']='学习'
    
    for pattern in "${!keywords[@]}"; do
        if echo "$content" | grep -qiE "$pattern"; then
            if [ -n "$tags" ]; then
                tags="$tags,${keywords[$pattern]}"
            else
                tags="${keywords[$pattern]}"
            fi
        fi
    done
    
    # Remove duplicates
    echo "$tags" | tr ',' '\n' | sort -u | tr '\n' ',' | sed 's/,$//'
}

# Sync function
sync_file() {
    local filepath="$1"
    local source_file=$(echo "$filepath" | sed "s|$WORKSPACE_DIR/||")
    local entry_date=$(get_date_from_filename "$filepath")
    local entry_type=$(get_entry_type "$filepath")
    local content=$(cat "$filepath" | sed "s/'/''/g")  # Escape single quotes
    local title=$(get_title_from_content "$content")
    
    # Check if already exists (for non-full-sync)
    if [ "$FULL_SYNC" = false ]; then
        local exists=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file = '$source_file' LIMIT 1;")
        if [ "$exists" -gt 0 ]; then
            echo "  ⏭️  Skipped (exists): $source_file"
            return
        fi
    fi
    
    # Insert into database
    sqlite3 "$DB_FILE" << EOF
INSERT INTO memory_entries (source_file, entry_date, entry_type, title, content)
VALUES ('$source_file', '$entry_date', '$entry_type', '$title', '$content');
EOF
    
    echo -e "  ${GREEN}✓${NC} Indexed: $source_file"
    
    # Auto-tagging (optional - can be disabled)
    local new_id=$(sqlite3 "$DB_FILE" "SELECT last_insert_rowid();")
    local tags=$(auto_tag_content "$content")
    if [ -n "$tags" ]; then
        for tag in $(echo "$tags" | tr ',' ' '); do
            sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO tags (tag_name) VALUES ('$tag');" 2>/dev/null || true
            local tag_id=$(sqlite3 "$DB_FILE" "SELECT id FROM tags WHERE tag_name = '$tag' LIMIT 1;")
            if [ -n "$tag_id" ]; then
                sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO memory_tags (memory_id, tag_id) VALUES ($new_id, $tag_id);" 2>/dev/null || true
            fi
        done
    fi
}

echo ""
echo "🚀 Starting sync..."
echo ""

# Count files before
BEFORE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file != 'system';")

# Sync memory/*.md files
if [ -d "$MEMORY_DIR" ]; then
    echo "📂 Syncing memory directory..."
    for file in "$MEMORY_DIR"/*.md; do
        if [ -f "$file" ]; then
            sync_file "$file"
        fi
    done
fi

# Sync archive files
if [ -d "$ARCHIVE_DIR" ]; then
    echo ""
    echo "📦 Syncing archive directory..."
    for file in "$ARCHIVE_DIR"/*.md; do
        if [ -f "$file" ]; then
            sync_file "$file"
        fi
    done
fi

# Sync MEMORY.md
if [ -f "$WORKSPACE_DIR/MEMORY.md" ]; then
    echo ""
    echo "🧠 Syncing MEMORY.md..."
    sync_file "$WORKSPACE_DIR/MEMORY.md"
fi

# Count after
AFTER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file != 'system';")
SYNCED=$((AFTER_COUNT - BEFORE_COUNT))

echo ""
echo "=================================="
echo "✅ Sync Complete!"
echo "=================================="
echo "  Database: $DB_FILE"
echo "  Entries before: $BEFORE_COUNT"
echo "  Entries after: $AFTER_COUNT"
echo "  New entries: $SYNCED"
echo ""

# Show database stats
echo "📊 Database statistics:"
sqlite3 "$DB_FILE" << 'EOF'
SELECT 
    entry_type,
    COUNT(*) as count,
    MIN(entry_date) as earliest,
    MAX(entry_date) as latest
FROM memory_entries 
WHERE source_file != 'system'
GROUP BY entry_type;
EOF

echo ""
echo "🏷️  Available tags:"
sqlite3 "$DB_FILE" "SELECT tag_name, COUNT(*) as usage FROM tags t JOIN memory_tags mt ON t.id = mt.tag_id GROUP BY tag_name ORDER BY usage DESC LIMIT 10;"

echo ""
echo "💡 Tips:"
echo "  - Run with --full-sync to re-index everything"
echo "  - Use 'sqlite3 memory-index/memory.db' to query directly"
echo "  - FTS queries: 'SELECT * FROM memory_fts WHERE content MATCH \"投资\";'"
echo ""