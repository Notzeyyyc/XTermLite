#!/bin/bash

echo -e "\033[1;36m"
echo "  __  _______                   _     _ _       ";
echo "  \ \/ /_   _|__ _ __ _ __ ___ | |   (_) |_ ___ ";
echo "   \  /  | |/ _ \ '__| '_ \` _ \| |   | | __/ _ \\";
echo "   /  \  | |  __/ |  | | | | | | |___| | ||  __/";
echo "  /_/\_\ |_|\___|_|  |_| |_| |_|_____|_|\__\___|";
echo "                                                ";
echo -e "\033[0m"

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SETUP_SCRIPT="${ROOT_DIR}/tools/setup_arch.sh"

echo "[*] Updating package repositories..."
pkg update -y && pkg upgrade -y

echo "[*] Installing proot-distro..."
pkg install proot-distro -y

echo "[*] Installing Arch Linux (proot-distro)..."
proot-distro install archlinux

if [ -f "$SETUP_SCRIPT" ]; then
    echo "[*] Running guest setup script..."
    proot-distro login archlinux -- bash -s < "$SETUP_SCRIPT"
else
    echo -e "\033[1;33m[!] setup_arch.sh not found, skipping guest setup.\033[0m"
fi

echo -e "\033[1;32m[+] Arch Linux is ready.\033[0m"
