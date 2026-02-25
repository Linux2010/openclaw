#!/bin/bash
# Memory Search Tool - SQLite FTS Wrapper
# Usage: ./search.sh "keyword" [options]

DB_FILE="/Users/hope/.openclaw/workspace/memory-index/memory.db"

# Help
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Memory Search Tool"
    echo ""
    echo "Usage:"
    echo "  ./search.sh \"投资\"              # 全文搜索"
    echo "  ./search.sh \"投资\" --tag        # 按标签搜索"
    echo "  ./search.sh --recent 5           # 最近5条"
    echo "  ./search.sh --stats              # 统计信息"
    echo "  ./search.sh --list-tags          # 列出所有标签"
    echo ""
    echo "Examples:"
    echo "  ./search.sh \"AMZN\"             # 搜索股票"
    echo "  ./search.sh \"挂单\"             # 搜索挂单"
    echo ""
    exit 0
fi

MODE="fts"
QUERY="$1"
LIMIT=20

# Check if first arg is an option
if [[ "$1" == --* ]]; then
    QUERY=""
    case "$1" in
        --stats)
            MODE="stats"
            ;;
        --list-tags)
            MODE="tags"
            ;;
        --recent)
            MODE="recent"
            if [ -n "$2" ]; then
                LIMIT="$2"
            fi
            ;;
    esac
else
    shift
    while [ $# -gt 0 ]; do
        case "$1" in
            --tag)
                MODE="tag"
                ;;
        esac
        shift
    done
fi

# Execute queries
case "$MODE" in
    fts)
        echo "🔍 FTS Search: \"$QUERY\""
        echo "=========================="
        sqlite3 "$DB_FILE" << EOF | column -t -s '|'
SELECT 
    memory_entries.entry_date as date,
    memory_entries.entry_type as type,
    substr(memory_entries.title, 1, 30) as title,
    memory_entries.source_file as file
FROM memory_fts 
JOIN memory_entries ON memory_entries.id = memory_fts.rowid
WHERE memory_fts.content MATCH '$QUERY'
ORDER BY memory_entries.entry_date DESC
LIMIT $LIMIT;
EOF
        ;;
    
    tag)
        echo "🏷️  Tag Search: \"$QUERY\""
        echo "=========================="
        sqlite3 "$DB_FILE" << EOF | column -t -s '|'
SELECT 
    me.entry_date as date,
    me.entry_type as type,
    substr(me.title, 1, 40) as title,
    t.tag_name as tag
FROM memory_entries me
JOIN memory_tags mt ON me.id = mt.memory_id
JOIN tags t ON mt.tag_id = t.id
WHERE t.tag_name = '$QUERY'
ORDER BY me.entry_date DESC
LIMIT $LIMIT;
EOF
        ;;
    
    recent)
        echo "📅 Recent $LIMIT entries"
        echo "=========================="
        sqlite3 "$DB_FILE" << EOF | column -t -s '|'
SELECT 
    entry_date as date,
    entry_type as type,
    substr(title, 1, 40) as title,
    source_file as file
FROM memory_entries
WHERE source_file != 'system'
ORDER BY entry_date DESC, created_at DESC
LIMIT $LIMIT;
EOF
        ;;
    
    stats)
        echo "📊 Database Statistics"
        echo "=========================="
        echo ""
        echo "Entry Types:"
        sqlite3 "$DB_FILE" "SELECT entry_type, COUNT(*) FROM memory_entries WHERE source_file != 'system' GROUP BY entry_type;"
        echo ""
        echo "Date Range:"
        sqlite3 "$DB_FILE" "SELECT MIN(entry_date), MAX(entry_date), COUNT(*) FROM memory_entries WHERE source_file != 'system';"
        echo ""
        echo "Files:"
        sqlite3 "$DB_FILE" "SELECT source_file, COUNT(*) FROM memory_entries WHERE source_file != 'system' GROUP BY source_file;"
        ;;
    
    tags)
        echo "🏷️  Available Tags"
        echo "=========================="
        sqlite3 "$DB_FILE" << EOF | column -t -s '|'
SELECT 
    t.tag_name,
    t.tag_category,
    COUNT(mt.memory_id) as usage
FROM tags t
LEFT JOIN memory_tags mt ON t.id = mt.tag_id
GROUP BY t.tag_name
ORDER BY usage DESC;
EOF
        ;;
esac

echo ""