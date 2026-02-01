#!/bin/bash

# Update system and install necessary packages
echo "Updating Arch Linux repositories..."
pacman -Syu --noconfirm
pacman -S --noconfirm neofetch which

# Determine shell config file
SHELL_RC="/root/.bashrc"
if [ -f "/root/.zshrc" ]; then
    SHELL_RC="/root/.zshrc"
fi

echo "Configuring $SHELL_RC..."

# Inject Custom Prompt and Neofetch into Shell RC
# We use a marker to avoid duplicate injections
if ! grep -q "XTERM_LITE_INJECT" "$SHELL_RC"; then
cat << 'EOF' >> "$SHELL_RC"

# --- XTERM_LITE_INJECT START ---
# Custom Prompt (Cyberpunk Style)
# Check if zsh or bash
if [ -n "$ZSH_VERSION" ]; then
    export PROMPT="%F{cyan}[ root@arch-term ]~# %f"
else
    export PS1="\[\e[1;36m\][ root@arch-term ]~# \[\e[0m\]"
fi

# Clear screen and show system info on login
if [ -z "$XTERM_LITE_sILENT" ]; then
    clear
    neofetch
fi
# --- XTERM_LITE_INJECT END ---
EOF
fi

echo "Arch Linux configuration complete."
