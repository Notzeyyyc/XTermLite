#!/bin/bash

# XTermLite Guest Setup Script (Arch Linux)
# This script is executed inside the proot environment to "Rice" the system.

echo "[-] XTermLite: Updating Package Database..."
pacman -Syu --noconfirm

echo "[-] XTermLite: Installing Essentials (zsh, git, neofetch, vim, curl)..."
pacman -S --noconfirm zsh git neofetch vim curl wget

# Install Oh My Zsh (if not installed)
if [ ! -d "/root/.oh-my-zsh" ]; then
    echo "[-] XTermLite: Installing Oh My Zsh..."
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
fi

# Define ZSH Custom Directory
ZSH_CUSTOM="/root/.oh-my-zsh/custom"

# Install Plugins (Autosuggestions & Syntax Highlighting)
echo "[-] XTermLite: Installing ZSH Plugins..."
if [ ! -d "$ZSH_CUSTOM/plugins/zsh-autosuggestions" ]; then
    git clone https://github.com/zsh-users/zsh-autosuggestions "$ZSH_CUSTOM/plugins/zsh-autosuggestions"
fi

if [ ! -d "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting" ]; then
    git clone https://github.com/zsh-users/zsh-syntax-highlighting.git "$ZSH_CUSTOM/plugins/zsh-syntax-highlighting"
fi

# Configuration Files
ZSHRC="/root/.zshrc"

echo "[-] XTermLite: Applying 'Riced' Config..."

# Backup existing zshrc if distinct
if [ -f "$ZSHRC" ] && ! grep -q "XTermLite" "$ZSHRC"; then
    cp "$ZSHRC" "$ZSHRC.bak"
fi

# Write Custom ZSHRC with Cyberpunk aesthetics
cat << 'EOF' > "$ZSHRC"
# --- XTermLite Configuration ---

export ZSH="/root/.oh-my-zsh"

# Theme: 'bira' is clean and displays user@host clearly. 
# You can change this to 'agnoster' if you have Powerline fonts installed in Termux.
ZSH_THEME="bira"

# Enable Plugins
plugins=(git zsh-autosuggestions zsh-syntax-highlighting)

source $ZSH/oh-my-zsh.sh

# --- Custom Aliases ---
alias ls='ls --color=auto'
alias ll='ls -lah'
alias grep='grep --color=auto'
alias install='pacman -S'
alias update='pacman -Syu'
alias remove='pacman -Rns'
alias cls='clear'
alias c='clear'
alias edit='vim'
alias xterm='echo "Use the XTerm console in the main menu for external management!"'

# --- Custom Aesthetics ---

# Custom Prompt Function (Overriding theme if needed, but 'bira' is safe)
# Here we just ensure color consistency
export TERM="xterm-256color"

# Startup Banner
if [ -z "$XTERM_LITE_SILENT" ]; then
    clear
    echo ""
    # Cyberpunk-ish text color
    echo -e "\e[1;36m   X T E R M   L I T E   \e[0m"
    echo -e "\e[0;35m   >> System Ready <<      \e[0m"
    echo ""
    # Minimal Neofetch
    neofetch --ascii_distro arch --disable packages memory shell resolution
fi
EOF

# Change default shell to zsh for root
chsh -s $(which zsh)

echo "[+] XTermLite: Ricing Complete! Shell set to ZSH."
