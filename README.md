# XTermLite 🚀

**XTermLite** is a powerful CLI-based simplified terminal environment designed for Termux users to easily install and manage Arch Linux (via proot-distro) with a beautiful, hacker-style interface.

![XTermLite Banner](https://img.shields.io/badge/XTermLite-Termux-cyan?style=for-the-badge&logo=gnu-bash&logoColor=white)

## ✨ Features

- **Cyberpunk / Arch Style UI**: Beautiful ASCII art and modern CLI prompts.
- **Automated Installer**: Automatically installs `proot-distro` and `archlinux`.
- **Shell Integration**: Auto-starts the environment via `.zshrc`.
- **Lightweight**: Minimal overhead.

## 📱 Installation (Termux)

Copy and paste the following commands into your Termux terminal:

```bash
pkg update -y && pkg install git -y
git clone https://github.com/Notzeyyyc/XTermLite.git
cd XTermLite
chmod +x install.sh
./install.sh
```

## 🛠️ Manual Usage

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

## 🖥️ Menu Controls

- **install**: Start the automated Arch Linux installation.
- **panic**: Trigger a kernel panic test (Hidden Command).
- **clear**: Clean the terminal interface.
- **exit**: Close the XTermLite engine.

## 📦 Requirements

- Android Device with Termux
- Internet connection (for downloading RootFS)
- At least 1GB of free storage

## 🤝 Contributing

Feel free to fork this repository and submit pull requests!

## 📄 License

MIT License
