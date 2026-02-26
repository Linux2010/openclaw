#!/bin/bash
# Mem0 Environment Setup Script

# Set Qwen API key for Mem0
export OPENAI_API_KEY="sk-sp-1f07658367b9409393e075f9f63490bf"
export OPENAI_BASE_URL="https://coding.dashscope.aliyuncs.com/v1"

# Create data directories if they don't exist
mkdir -p /Users/hope/.openclaw/mem0/data/qdrant
mkdir -p /Users/hope/.openclaw/mem0/data/sqlite

echo "✅ Mem0 environment configured successfully!"
echo "   API Key: sk-sp-1f07658367b9409393e075f9f63490bf"
echo "   Base URL: https://coding.dashscope.aliyuncs.com/v1"
echo "   Data path: /Users/hope/.openclaw/mem0/data/"