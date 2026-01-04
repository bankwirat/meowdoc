#!/bin/bash

# Build the package
echo "📦 Packaging extension..."
bun run package

VSIX_FILE="meowdoc-0.0.1.vsix"

if [ ! -f "$VSIX_FILE" ]; then
    echo "❌ Error: $VSIX_FILE not found!"
    exit 1
fi

echo "🚀 Installing $VSIX_FILE..."

# Function to install extension
install_extension() {
    CMD=$1
    NAME=$2
    if command -v $CMD &> /dev/null; then
        echo "Installing for $NAME..."
        $CMD --install-extension $VSIX_FILE --force
    else
        echo "⚠️  $NAME CLI ($CMD) not found. Skipping."
    fi
}

install_extension "code" "VS Code"
install_extension "cursor" "Cursor"
install_extension "antigravity" "Antigravity"

echo "✅ Done! Please reload your editors."
