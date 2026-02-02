#!/bin/bash

# XTermLite Installer Script

echo -e "\033[1;36m"
echo "  __  _______                   _     _ _       ";
echo "  \ \/ /_   _|__ _ __ _ __ ___ | |   (_) |_ ___ ";
echo "   \  /  | |/ _ \ '__| '_ \` _ \| |   | | __/ _ \\";
echo "   /  \  | |  __/ |  | | | | | | |___| | ||  __/";
echo "  /_/\_\ |_|\___|_|  |_| |_| |_|_____|_|\__\___|";
echo "                                                ";
echo -e "\033[0m"

echo "[*] Updating package repositories..."
pkg update -y && pkg upgrade -y

echo "[*] Installing Node.js, Git, Zsh..."
pkg install nodejs git zsh -y

echo "[*] Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo -e "\033[1;31m[!] Error: package.json not found!\033[0m"
    exit 1
fi

echo "[*] Configuring Termux autostart (.zshrc)..."
ZSHRC="$HOME/.zshrc"
APP_PATH="$(pwd)"

if [ ! -f "$ZSHRC" ]; then
    touch "$ZSHRC"
fi

sed -i "/^# XTERM-OS AUTOSTART START$/,/^# XTERM-OS AUTOSTART END$/d" "$ZSHRC" 2>/dev/null || true
sed -i "/^# XTERM-OS AUTOSTART$/,/^fi$/d" "$ZSHRC" 2>/dev/null || true

cat >> "$ZSHRC" <<EOF

# XTERM-OS AUTOSTART START
if [ -z "\$XTERM_SESSION" ]; then
    export XTERM_SESSION=1
    echo "Booting XTerm-OS..."
    node "${APP_PATH}/index.js"
fi
# XTERM-OS AUTOSTART END
EOF

if command -v chsh >/dev/null 2>&1; then
    chsh -s zsh >/dev/null 2>&1 || true
fi

echo -e "\033[1;32m[+] Setup Complete!\033[0m"
echo "Run the following command to start:"
echo "node index.js"
