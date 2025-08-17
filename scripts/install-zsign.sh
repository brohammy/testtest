#!/bin/bash

# zsign Installation Script
# This script installs zsign for iOS app signing

set -e

echo "Installing zsign..."

# Detect OS
OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
    Linux*)
        if [ "${ARCH}" = "x86_64" ]; then
            echo "Detected Linux x86_64"
            # Download pre-compiled binary for Linux
            curl -L -o /tmp/zsign https://github.com/zhlynn/zsign/releases/latest/download/zsign_linux_amd64
            chmod +x /tmp/zsign
            sudo mv /tmp/zsign /usr/local/bin/zsign
        else
            echo "Compiling zsign from source for Linux ${ARCH}..."
            # Install dependencies
            sudo apt-get update
            sudo apt-get install -y build-essential git libssl-dev
            
            # Clone and build zsign
            cd /tmp
            git clone https://github.com/zhlynn/zsign.git
            cd zsign
            g++ -std=c++11 *.cpp common/*.cpp -lcrypto -o zsign
            sudo mv zsign /usr/local/bin/zsign
            cd /
            rm -rf /tmp/zsign
        fi
        ;;
    Darwin*)
        echo "Detected macOS"
        if command -v brew >/dev/null 2>&1; then
            echo "Installing zsign via Homebrew..."
            brew install zsign
        else
            echo "Homebrew not found. Installing pre-compiled binary..."
            curl -L -o /tmp/zsign https://github.com/zhlynn/zsign/releases/latest/download/zsign_darwin_amd64
            chmod +x /tmp/zsign
            sudo mv /tmp/zsign /usr/local/bin/zsign
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        echo "Detected Windows"
        curl -L -o zsign.exe https://github.com/zhlynn/zsign/releases/latest/download/zsign_windows_amd64.exe
        echo "Please move zsign.exe to a directory in your PATH"
        ;;
    *)
        echo "Unsupported OS: ${OS}"
        echo "Please install zsign manually from: https://github.com/zhlynn/zsign"
        exit 1
        ;;
esac

# Verify installation
if command -v zsign >/dev/null 2>&1; then
    echo "✅ zsign installed successfully!"
    zsign --version
else
    echo "❌ zsign installation failed"
    exit 1
fi
