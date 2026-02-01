# XTermLite

**XTermLite** is a powerful CLI-based simplified terminal environment designed for Termux users to easily install and manage Arch Linux (via proot-distro) with a beautiful interface.

![XTermLite Banner](https://img.shields.io/badge/XTermLite-Termux-cyan?style=for-the-badge&logo=gnu-bash&logoColor=white)

## Features

- **Arch Style UI**: Beautiful ASCII art and modern CLI prompts.
- **Automated Installer**: Automatically installs `proot-distro` and `archlinux`.
- **Lightweight**: Minimal overhead.

## Installation (Termux)

Copy and paste the following commands into your Termux terminal:

```bash
pkg update -y && pkg install git -y
git clone https://github.com/Notzeyyyc/XTermLite.git
cd XTermLite
chmod +x install.sh
./install.sh
```

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
   pkg install nodejs -y
   npm install
   ```
2. Run the engine:
   ```bash
   node index.js
   ```

## Menu Controls

- **install**: Start the automated Arch Linux installation.
- **clear**: Clean the terminal interface.
- **exit**: Close the XTermLite engine.

## License

MIT License
