import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings, saveSettings } from '../config.js';
import { getTheme } from '../themes.js';

async function runInArch(command, stdio = 'ignore') {
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', command], { stdio, shell: true });
        child.on('close', (code) => resolve(code));
    });
}

async function setupUser(spinner) {
    let settings = loadSettings();
    if (settings.username) return settings.username;

    spinner.stop('Additional setup required.');
    const username = await p.text({
        message: 'Enter username for GUI login:',
        placeholder: 'e.g. xtermuser',
        validate: (val) => {
            if (!val) return 'Username cannot be empty';
            if (!/^[a-z_][a-z0-9_-]*$/.test(val)) return 'Invalid username format';
        }
    });

    if (p.isCancel(username)) return null;

    spinner.start(`Creating user ${username}...`);

    // Install sudo and create user
    const setupCmd = `
    pacman -S --noconfirm sudo
    if ! id "${username}" &>/dev/null; then
        useradd -m -G wheel "${username}"
        echo "${username}:1234" | chpasswd
        echo "${username} ALL=(ALL) ALL" >> /etc/sudoers
    fi
    `;

    await runInArch(setupCmd);

    settings.username = username;
    saveSettings(settings);

    spinner.message(`User ${username} created (Password: 1234).`);
    await sleep(1000);
    return username;
}

async function installGUI(de, display, useDotfiles, spinner) {
    const username = await setupUser(spinner);
    if (!username) return;

    spinner.start(`Installing ${de} (${display})...`);

    let packages = 'xorg-server xorg-xinit ';
    if (de === 'XFCE') packages += 'xfce4 xfce4-goodies ';
    else if (de === 'i3wm') packages += 'i3-wm i3status i3lock dmenu ';

    if (display === 'VNC') packages += 'tigervnc ';

    // Base packages for dotfiles (git, curl)
    if (useDotfiles) packages += 'git curl base-devel ';

    await runInArch(`pacman -S --noconfirm ${packages}`);

    if (useDotfiles) {
        spinner.message('Applying Dotfiles...');
        const repo = de === 'XFCE' ? 'https://github.com/rejarevaldy/dotfiles' : 'https://github.com/harilvfs/i3wmdotfiles';

        const dotCmd = `
        sudo -u ${username} bash -c '
            cd /home/${username}
            git clone ${repo} .dotfiles_tmp
            cp -rv .dotfiles_tmp/. .
            # Some dotfiles might need specific placement or install scripts
            [ -f "install.sh" ] && chmod +x install.sh && ./install.sh
            rm -rf .dotfiles_tmp
        '
        `;
        await runInArch(dotCmd);
    }

    if (display === 'VNC') {
        spinner.message('Configuring VNC...');
        const vncCmd = `
        sudo -u ${username} bash -c '
            mkdir -p /home/${username}/.vnc
            echo "#!/bin/bash
            [ -x /etc/vnc/xstartup ] && exec /etc/vnc/xstartup
            [ -r \\$HOME/.Xresources ] && xrdb \\$HOME/.Xresources
            ${de === 'XFCE' ? 'startxfce4 &' : 'i3 &'}
            " > /home/${username}/.vnc/xstartup
            chmod +x /home/${username}/.vnc/xstartup
            # Set default password "123456" for VNC
            echo "123456" | vncpasswd -f > /home/${username}/.vnc/passwd
            chmod 600 /home/${username}/.vnc/passwd
        '
        `;
        await runInArch(vncCmd);
    }

    spinner.stop(`${de} installation complete!`);
}

async function startGUI(de, display) {
    const settings = loadSettings();
    const username = settings.username || 'root';

    console.clear();
    p.log.info(chalk.green(`Starting ${de} via ${display}...`));

    if (display === 'VNC') {
        p.log.message('VNC Server will start on :1 (Port 5901)');
        p.log.message('Password is "123456"');

        const startCmd = `sudo -u ${username} vncserver :1 -geometry 1280x720 -depth 24`;
        await runInArch(startCmd, 'inherit');

        p.note('VNC Server is running. Connect using any VNC Viewer.', 'VNC Status');
        await p.text({ message: 'Press Enter to stop VNC server and return...' });

        await runInArch(`sudo -u ${username} vncserver -kill :1`);
    } else {
        // Termux-X11
        p.log.warn('Make sure Termux-X11 app is running and X11 server is started in Termux.');
        p.log.message('Setting DISPLAY=:1 ...');

        const x11Cmd = `export DISPLAY=:1 && sudo -u ${username} ${de === 'XFCE' ? 'startxfce4' : 'i3'}`;
        await runInArch(x11Cmd, 'inherit');
    }
}

export async function showGUIScreen() {
    const installed = isArchInstalled();
    const settings = loadSettings();
    const theme = getTheme(settings.theme);

    if (!installed) {
        console.clear();
        console.log(centerBlock(getLogo()));
        p.log.error('Arch Linux is not installed. Please install it first from the Main Menu.');
        await sleep(2000);
        return 'MAIN_MENU';
    }

    while (true) {
        console.clear();
        console.log(centerBlock(getLogo()));

        const choice = await p.select({
            message: theme.primary('Desktop Environment Manager:'),
            options: [
                { value: 'START', label: 'Start Desktop', hint: 'Launch installed GUI' },
                { value: 'INSTALL', label: 'Install/Reinstall GUI', hint: 'Setup XFCE or i3wm' },
                { value: 'BACK', label: 'Back to Main Menu' }
            ]
        });

        if (p.isCancel(choice) || choice === 'BACK') return 'MAIN_MENU';

        if (choice === 'INSTALL') {
            const de = await p.select({
                message: 'Select Desktop Environment:',
                options: [
                    { value: 'XFCE', label: 'XFCE4', hint: 'Classic & Stable' },
                    { value: 'i3wm', label: 'i3wm', hint: 'Lightweight Tiling' }
                ]
            });
            if (p.isCancel(de)) continue;

            const display = await p.select({
                message: 'Select Display Method:',
                options: [
                    { value: 'VNC', label: 'VNC Server', hint: 'Compatible with all devices' },
                    { value: 'X11', label: 'Termux-X11', hint: 'Faster, needs Termux-X11 app' }
                ]
            });
            if (p.isCancel(display)) continue;

            const config = await p.select({
                message: 'Select Configuration:',
                options: [
                    { value: 'STOCK', label: 'Stock (Polosan)', hint: 'Pure vanilla DE' },
                    { value: 'DOTFILES', label: 'Custom Dotfiles', hint: 'Themed & Pre-configured' }
                ]
            });
            if (p.isCancel(config)) continue;

            const s = p.spinner();
            await installGUI(de, display, config === 'DOTFILES', s);
            await sleep(2000);
        }

        if (choice === 'START') {
            const de = await p.select({
                message: 'Select DE to start:',
                options: [
                    { value: 'XFCE', label: 'XFCE4' },
                    { value: 'i3wm', label: 'i3wm' }
                ]
            });
            if (p.isCancel(de)) continue;

            const display = await p.select({
                message: 'Select Display Method:',
                options: [
                    { value: 'VNC', label: 'VNC Server' },
                    { value: 'X11', label: 'Termux-X11' }
                ]
            });
            if (p.isCancel(display)) continue;

            await startGUI(de, display);
        }
    }
}
