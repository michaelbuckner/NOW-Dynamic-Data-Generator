#!/bin/bash
# Simple script to generate sample data using the Bulk Data Generator

# Install dependencies if they don't exist
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Default model is openai/gpt-3.5-turbo, but user can specify a different model
MODEL=${1:-openai/gpt-3.5-turbo}
API_KEY=${2:-$OPENROUTER_API_KEY}
TABLE=${3:-incident}
COUNT=${4:-1000}

if [ -z "$API_KEY" ]; then
  echo "Warning: No OpenRouter API key provided."
  echo "Please provide an API key as the second parameter or set the OPENROUTER_API_KEY environment variable."
  exit 1
fi

# Generate sample records
echo "Generating $COUNT $TABLE records using OpenRouter model: $MODEL..."
node src/node/BulkDataGenerator.js --output=sample-data.csv --count=$COUNT --table=$TABLE --model=$MODEL --apiKey=$API_KEY

echo "Done! Sample data has been written to sample-data.csv"
echo "You can now import this file into ServiceNow using System Import Sets > Load Data"
