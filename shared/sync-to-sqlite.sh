#!/bin/bash
# Memory to SQLite Sync Script (Shared Version)
# Syncs shared/memory/*.md files to SQLite FTS database

set -e

WORKSPACE_DIR="/Users/hope/.openclaw"
MEMORY_DIR="$WORKSPACE_DIR/shared/memory"
ARCHIVE_DIR="$WORKSPACE_DIR/shared/monthly_summaries"
DB_DIR="$WORKSPACE_DIR/shared"
DB_FILE="$DB_DIR/memory.db"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "=================================="
echo "Shared Memory → SQLite Sync Tool"
echo "=================================="

# Create directories if needed
mkdir -p "$DB_DIR"

# Initialize database if it doesn't exist
if [ ! -f "$DB_FILE" ]; then
    echo "🆕 Creating new database..."
    sqlite3 "$DB_FILE" < "$WORKSPACE_DIR/agents/main/workspace/memory-index/db/schema.sql"
    echo -e "${GREEN}✅ Database created${NC}"
else
    echo "📁 Database exists: $DB_FILE"
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
    local title=$(echo "$content" | grep -m1 '^# ' | sed 's/^# //' | head -c 100)
    if [ -z "$title" ]; then
        title=$(echo "$content" | head -1 | head -c 100)
    fi
    echo "$title"
}

# Function to auto-tag content (compatible with macOS bash)
auto_tag_content() {
    local content="$1"
    local tags=""
    
    # Investment keywords
    if echo "$content" | grep -qiE '股票|持仓|PE|买入|卖出|挂单|交易'; then
        tags="投资,交易,股票"
    fi
    
    # Tech keywords  
    if echo "$content" | grep -qiE 'GitHub|git|代码|脚本|数据库|SQLite|索引|搜索'; then
        if [ -n "$tags" ]; then
            tags="$tags,技术,系统"
        else
            tags="技术,系统"
        fi
    fi
    
    # Memory keywords
    if echo "$content" | grep -qiE 'Memory|记忆|日志|归档'; then
        if [ -n "$tags" ]; then
            tags="$tags,系统,配置"
        else
            tags="系统,配置"
        fi
    fi
    
    echo "$tags"
}

# Sync function
sync_file() {
    local filepath="$1"
    local source_file=$(echo "$filepath" | sed "s|$WORKSPACE_DIR/||")
    local entry_date=$(get_date_from_filename "$filepath")
    local entry_type=$(get_entry_type "$filepath")
    local content=$(cat "$filepath" 2>/dev/null | sed "s/'/''/g" || echo "")
    local title=$(get_title_from_content "$content")
    
    # Skip if empty
    if [ -z "$content" ]; then
        return
    fi
    
    # Check if already exists
    local exists=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file = '$source_file' LIMIT 1;" 2>/dev/null || echo "0")
    if [ "$exists" -gt 0 ]; then
        echo "  ⏭️  Skipped (exists): $source_file"
        return
    fi
    
    # Insert into database
    sqlite3 "$DB_FILE" << EOF
INSERT INTO memory_entries (source_file, entry_date, entry_type, title, content)
VALUES ('$source_file', '$entry_date', '$entry_type', '$title', '$content');
EOF
    
    echo -e "  ${GREEN}✓${NC} Indexed: $source_file"
    
    # Auto-tagging
    local new_id=$(sqlite3 "$DB_FILE" "SELECT last_insert_rowid();")
    local tags=$(auto_tag_content "$content")
    if [ -n "$tags" ]; then
        for tag in $(echo "$tags" | tr ',' ' '); do
            sqlite3 "$DB_FILE" "INSERT OR IGNORE INTO tags (tag_name) VALUES ('$tag');" 2>/dev/null || true
            local tag_id=$(sqlite3 "$DB_FILE" "SELECT id FROM tags WHERE tag_name = '$tag' LIMIT 1;" 2>/dev/null || echo "")
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
BEFORE_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file != 'system';" 2>/dev/null || echo "0")

# Sync memory files
if [ -d "$MEMORY_DIR" ]; then
    echo "📂 Syncing shared memory directory..."
    for file in "$MEMORY_DIR"/*.md; do
        if [ -f "$file" ]; then
            sync_file "$file"
        fi
    done
fi

# Count after
AFTER_COUNT=$(sqlite3 "$DB_FILE" "SELECT COUNT(*) FROM memory_entries WHERE source_file != 'system';" 2>/dev/null || echo "0")
SYNCED=$((AFTER_COUNT - BEFORE_COUNT))

echo ""
echo "=================================="
echo "✅ Sync Complete!"
echo "=================================="
echo "  Database: $DB_FILE"
echo "  Entries before: $BEFORE_COUNT"
echo "  Entries after: $AFTER_COUNT"
echo "  New entries: $SYNCED"