@echo off
REM Build script for cross-platform binaries (Windows version)
REM This script builds the bulk generator for Windows, macOS, and Linux

echo Building NOW Dynamic Data Generator (Go version)...

REM Create build directory
if not exist build mkdir build

REM Get version (simplified for Windows)
set VERSION=dev

REM Build for Windows (64-bit)
echo Building for Windows (amd64)...
set GOOS=windows
set GOARCH=amd64
go build -ldflags "-s -w" -o build/bulk-generator-windows-amd64.exe ./cmd

REM Build for macOS (64-bit Intel)
echo Building for macOS (amd64)...
set GOOS=darwin
set GOARCH=amd64
go build -ldflags "-s -w" -o build/bulk-generator-darwin-amd64 ./cmd

REM Build for macOS (ARM64 - Apple Silicon)
echo Building for macOS (arm64)...
set GOOS=darwin
set GOARCH=arm64
go build -ldflags "-s -w" -o build/bulk-generator-darwin-arm64 ./cmd

REM Build for Linux (64-bit)
echo Building for Linux (amd64)...
set GOOS=linux
set GOARCH=amd64
go build -ldflags "-s -w" -o build/bulk-generator-linux-amd64 ./cmd

REM Reset environment variables
set GOOS=
set GOARCH=

REM Build for current platform (Windows)
echo Building for current platform...
go build -ldflags "-s -w" -o build/bulk-generator.exe ./cmd

echo.
echo Build complete! Binaries are in the build/ directory:
dir build\

echo.
echo Usage examples:
echo   Windows: .\build\bulk-generator-windows-amd64.exe --help
echo   macOS:   ./build/bulk-generator-darwin-amd64 --help
echo   Linux:   ./build/bulk-generator-linux-amd64 --help
echo.
echo Generate 1000 incident records:
echo   .\build\bulk-generator.exe --table incident --count 1000 --output incidents.xlsx
echo.
echo Generate 500 case records with API key:
echo   .\build\bulk-generator.exe --table case --count 500 --api-key YOUR_API_KEY --output cases.xlsx

pause
