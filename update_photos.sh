#!/bin/bash

# Check if exiftool is installed
if ! command -v exiftool &> /dev/null; then
    echo "exiftool could not be found"
    echo "Installing exiftool using Homebrew..."
    if command -v brew &> /dev/null; then
        brew install exiftool
    else
        echo "Homebrew is not installed. Please install Homebrew or install exiftool manually."
        exit 1
    fi
fi

# Run the photo update script
go run main.go
