#!/bin/bash

# Script to create a new release
# Usage: ./create-release.sh v1.0.0

set -e

if [ $# -eq 0 ]; then
    echo "Usage: $0 <version-tag>"
    echo "Example: $0 v1.0.0"
    exit 1
fi

VERSION_TAG=$1

# Validate version tag format
if [[ ! $VERSION_TAG =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    echo "Error: Version tag must be in format vX.Y.Z (e.g., v1.0.0)"
    exit 1
fi

echo "Creating release $VERSION_TAG..."

# Check if we're in a git repository
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "Error: Not in a git repository"
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "Error: You have uncommitted changes. Please commit or stash them first."
    exit 1
fi

# Check if tag already exists
if git tag -l | grep -q "^$VERSION_TAG$"; then
    echo "Error: Tag $VERSION_TAG already exists"
    exit 1
fi

# Make sure we're on the main/master branch
CURRENT_BRANCH=$(git branch --show-current)
if [[ "$CURRENT_BRANCH" != "main" && "$CURRENT_BRANCH" != "master" ]]; then
    echo "Warning: You're not on main/master branch (current: $CURRENT_BRANCH)"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Pull latest changes
echo "Pulling latest changes..."
git pull origin $CURRENT_BRANCH

# Run tests
echo "Running tests..."
if [ -f "run_tests.sh" ]; then
    ./run_tests.sh
else
    go test ./...
fi

# Create and push the tag
echo "Creating tag $VERSION_TAG..."
git tag -a $VERSION_TAG -m "Release $VERSION_TAG"

echo "Pushing tag to origin..."
git push origin $VERSION_TAG

echo ""
echo "✅ Release $VERSION_TAG created successfully!"
echo ""
echo "The GitHub Actions workflow will now:"
echo "1. Build binaries for Windows, macOS (Intel & ARM), and Linux"
echo "2. Create a GitHub release with the binaries attached"
echo ""
echo "You can monitor the progress at:"
echo "https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator/actions"
echo ""
echo "Once complete, the release will be available at:"
echo "https://github.com/michaelbuckner/NOW-Dynamic-Data-Generator/releases/tag/$VERSION_TAG"
