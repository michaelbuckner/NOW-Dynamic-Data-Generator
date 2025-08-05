#!/bin/bash

# Build script for cross-platform binaries
# This script builds the bulk generator for Windows, macOS, and Linux

set -e

echo "Building NOW Dynamic Data Generator (Go version)..."

# Create build directory
mkdir -p build

# Get version from git or use default
VERSION=$(git describe --tags --always --dirty 2>/dev/null || echo "dev")
LDFLAGS="-X main.version=$VERSION -s -w"

# Build for Windows (64-bit)
echo "Building for Windows (amd64)..."
GOOS=windows GOARCH=amd64 go build -ldflags "$LDFLAGS" -o build/bulk-generator-windows-amd64.exe ./cmd

# Build for macOS (64-bit Intel)
echo "Building for macOS (amd64)..."
GOOS=darwin GOARCH=amd64 go build -ldflags "$LDFLAGS" -o build/bulk-generator-darwin-amd64 ./cmd

# Build for macOS (ARM64 - Apple Silicon)
echo "Building for macOS (arm64)..."
GOOS=darwin GOARCH=arm64 go build -ldflags "$LDFLAGS" -o build/bulk-generator-darwin-arm64 ./cmd

# Build for Linux (64-bit)
echo "Building for Linux (amd64)..."
GOOS=linux GOARCH=amd64 go build -ldflags "$LDFLAGS" -o build/bulk-generator-linux-amd64 ./cmd

# Build for current platform (for testing)
echo "Building for current platform..."
go build -ldflags "$LDFLAGS" -o build/bulk-generator ./cmd

echo "Build complete! Binaries are in the build/ directory:"
ls -la build/

echo ""
echo "Usage examples:"
echo "  Windows: ./build/bulk-generator-windows-amd64.exe --help"
echo "  macOS:   ./build/bulk-generator-darwin-amd64 --help"
echo "  Linux:   ./build/bulk-generator-linux-amd64 --help"
echo ""
echo "Generate 1000 incident records:"
echo "  ./build/bulk-generator --table incident --count 1000 --output incidents.xlsx"
echo ""
echo "Generate 500 case records with API key:"
echo "  ./build/bulk-generator --table case --count 500 --api-key YOUR_API_KEY --output cases.xlsx"
