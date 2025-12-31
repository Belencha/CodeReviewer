#!/bin/bash
# Setup script to pull and prepare Ollama models

set -e

OLLAMA_URL="${OLLAMA_URL:-http://localhost:11434}"
MODEL="${OLLAMA_MODEL:-codellama:13b}"

echo "Setting up Ollama model: $MODEL"
echo "Ollama URL: $OLLAMA_URL"

# Wait for Ollama to be ready
echo "Waiting for Ollama to be ready..."
until curl -s "$OLLAMA_URL/api/tags" > /dev/null 2>&1; do
  echo "Waiting for Ollama..."
  sleep 2
done

echo "Ollama is ready!"

# Pull the model
echo "Pulling model: $MODEL"
curl -X POST "$OLLAMA_URL/api/pull" -d "{\"name\": \"$MODEL\"}"

echo "Model $MODEL is ready to use!"
echo ""
echo "Available models:"
curl -s "$OLLAMA_URL/api/tags" | grep -o '"name":"[^"]*"' | cut -d'"' -f4

