#!/bin/bash

# EAS Build Complete Setup Script
# Run this on your Linux Mac mini to set up EAS Build

echo "🚀 Osmosify EAS Build Setup"
echo "=========================="
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js found: $(node --version)"
echo ""

# Install EAS CLI globally
echo "📦 Installing EAS CLI..."
npm install -g eas-cli

if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI installation failed"
    exit 1
fi

echo "✅ EAS CLI installed: $(eas --version)"
echo ""

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

echo "✅ Dependencies installed"
echo ""

# Login to Expo
echo "🔐 Login to Expo"
echo "==============="
echo "You'll need to enter your Expo credentials."
echo "If you don't have an account, create one at https://expo.dev/signup"
echo ""
eas login

echo ""
echo "🔧 Initialize EAS Project"
echo "========================"
echo "This creates your project on Expo's build servers."
echo ""
eas init

echo ""
echo "✅ Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo ""
echo "1. Build for iOS (device testing):"
echo "   eas build --platform ios --profile development"
echo ""
echo "2. Build for iOS (App Store):"
echo "   eas build --platform ios --profile production"
echo ""
echo "3. Build for Android:"
echo "   eas build --platform android --profile preview"
echo ""
echo "📖 Full guide: EAS_BUILD.md"
echo ""
