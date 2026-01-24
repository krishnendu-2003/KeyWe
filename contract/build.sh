#!/bin/bash

# Build script for Soroban contract

echo "🔨 Building Soroban contract..."

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Please install it first."
    echo "Visit: https://developers.stellar.org/docs/tools/stellar-cli"
    exit 1
fi

# Build the contract
stellar contract build

if [ $? -eq 0 ]; then
    echo "✅ Contract built successfully!"
    echo "📦 WASM file: target/wasm32v1-none/release/swap_aggregator.wasm"
else
    echo "❌ Build failed"
    exit 1
fi
