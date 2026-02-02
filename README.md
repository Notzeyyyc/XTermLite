# XTermLite

![XTermLite Banner](https://img.shields.io/badge/XTermLite-Termux-cyan?style=for-the-badge&logo=gnu-bash&logoColor=white)

**XTermLite** is a CLI interface for Termux that makes installing and managing **Arch Linux (proot-distro)** easier, cleaner, and more enjoyable.

> Focus: a “semi-OS” experience in Termux—installer, menu, recovery, GUI manager (VNC/Termux-X11), and package tools.

## Features

- **Boot + Main Menu UI**: ASCII logo, themeable, prompt modern.
- **Automated Installer**: installs `proot-distro` + `archlinux` and performs initial setup.
- **GUI Manager**: install/start **XFCE** / **i3wm** via **VNC** or **Termux-X11**.
- **Recovery Mode**: update channel (stable/beta/downgrade), optimizer, reset/fix, factory reset.
- **Manager Console**: `xterm` command for install/uninstall/search packages and the “profiler” installer.
- **Terminal WM (tmux)**: split panes + keybinds directly inside the Arch shell (no VNC).

## Installation (Termux)

Copy and paste the following commands into your Termux terminal:

```bash
pkg update -y && pkg install git -y
git clone https://github.com/Notzeyyyc/XTermLite.git
cd XTermLite
chmod +x install.sh
./install.sh
```

## Quick Start

Run the engine:

```bash
node index.js
```

If autostart is enabled, just reopen Termux.

## Device Specifications

### Minimum Requirements

- **OS**: Android 7.0 (Nougat) or higher (via Termux)
- **RAM**: 2 GB
- **Storage**: 1 GB free space (for RootFS extraction)
- **Processor**: Quad-core CPU (ARM64 recommended)

### Recommended Requirements

- **OS**: Android 10+
- **RAM**: 4 GB or higher
- **Storage**: 3 GB+ free space
- **Processor**: Octa-core CPU (Snapdragon 600 series / MediaTek Helio G series or better)
- **Internet**: Stable connection for initial download (~700MB)

## Manual Usage

If you want to run it without the installer script:

1. Install dependencies:
   ```bash
   pkg install nodejs git -y
   npm install
   ```
2. Run the engine:
   ```bash
   node index.js
   ```

## Commands

### Playground (Manager Mode)

- `help` — list command
- `xterm --help` — show `xterm` subcommands
- `xterm -i <pkg>` — install a package (pacman)
- `xterm -uin <pkg>` — uninstall package (pacman -Rns)
- `xterm -srch [query]` — search packages, pick from a list, then auto-install
- `xterm -i --profiler` — profile-based installer (developer/networking/multimedia)

### Arch Shell

- Choose `Normal Shell` or `WM Terminal (tmux)` when entering the shell.
- Default tmux keybinds:
  - prefix: `Ctrl+a`
  - split: `Ctrl+a` then `|` (horizontal), `-` (vertical)
  - switch panes: `Ctrl+a` then `h/j/k/l`

## Notes

- This project runs on Termux (Android). On Windows it is intended for dev/UI testing only.
- Desktop GUI (XFCE/i3) still requires VNC or Termux-X11 because it needs a display server.

## License

GPL-3.0-or-later
