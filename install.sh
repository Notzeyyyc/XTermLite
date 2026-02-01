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

echo "[*] Installing Node.js & Git..."
pkg install nodejs git -y

echo "[*] Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
else
    echo -e "\033[1;31m[!] Error: package.json not found!\033[0m"
    exit 1
fi

echo -e "\033[1;32m[+] Setup Complete!\033[0m"
echo "Run the following command to start:"
echo "node index.js"
