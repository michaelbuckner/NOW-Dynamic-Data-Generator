#!/bin/bash

echo "🧪 Running Go Bulk Data Generator Test Suite"
echo "============================================="

# Change to the project directory
cd "$(dirname "$0")"

echo ""
echo "📋 Running all tests..."
go test ./... -v

echo ""
echo "🏃‍♂️ Running benchmarks..."
go test ./... -bench=. -benchmem

echo ""
echo "📊 Running tests with coverage..."
go test ./... -cover

echo ""
echo "🔍 Running race condition detection..."
go test ./... -race

echo ""
echo "✅ Test suite complete!"
