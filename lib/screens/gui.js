import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { getLogo } from '../ascii.js';
import { centerBlock, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings, saveSettings } from '../config.js';
import { getTheme } from '../themes.js';
import { bootAndVerifyDistro, showKernelPanic } from './kernelpanic.js';

async function runInArch(command, stdio = 'ignore') {
    return new Promise((resolve, reject) => {
        if (!shell.which('proot-distro')) {
            reject(new Error('proot-distro not found'));
            return;
        }

        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-lc', command], { stdio, shell: false });
        child.on('error', reject);
        child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
    });
}

function shSingleQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function asArchUser(username, command) {
    const quotedCommand = shSingleQuote(command);
    if (!username || username === 'root') return `bash -lc ${quotedCommand}`;
    return `sudo -iu ${username} bash -lc ${quotedCommand}`;
}

async function runInArchChecked(command, stdio, failureMessage) {
    const code = await runInArch(command, stdio);
    if (code !== 0) throw new Error(failureMessage || `Command failed with code ${code}`);
}

function buildUserSetupCmd(username) {
    return `
    set -e
    pacman -S --noconfirm sudo
    mkdir -p /etc/sudoers.d
    if [ ! -f /etc/sudoers.d/99-wheel ]; then
        echo '%wheel ALL=(ALL:ALL) ALL' > /etc/sudoers.d/99-wheel
        chmod 0440 /etc/sudoers.d/99-wheel
    fi
    if ! id "${username}" &>/dev/null; then
        useradd -m -G wheel "${username}"
        echo "${username}:1234" | chpasswd
    else
        usermod -aG wheel "${username}" || true
    fi
    `;
}

async function ensureArchUser(username, spinner) {
    const safeName = String(username || '').trim();
    if (!safeName || safeName === 'root') return safeName || 'root';
    await runInArchChecked(buildUserSetupCmd(safeName), 'ignore', `Failed to prepare user "${safeName}" inside Arch`);
    if (spinner) {
        spinner.message(`User ${safeName} ready.`);
        await sleep(600);
    }
    return safeName;
}

async function setupUser(spinner) {
    let settings = loadSettings();
    if (settings.username) {
        spinner.start(`Verifying user ${settings.username}...`);
        try {
            const verified = await ensureArchUser(settings.username, spinner);
            spinner.stop(`User ${verified} ready.`);
            return verified;
        } catch (err) {
            spinner.stop(chalk.red(err.message));
            await sleep(1200);
            return null;
        }
    }

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

    await ensureArchUser(username, spinner);

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

    try {
        await runInArchChecked(`pacman -S --noconfirm ${packages}`, 'inherit', 'Pacman failed while installing GUI packages');
    } catch (err) {
        spinner.stop(chalk.red(err.message));
        await sleep(1200);
        return;
    }

    if (useDotfiles) {
        spinner.message('Applying Dotfiles...');
        const repo = de === 'XFCE' ? 'https://github.com/rejarevaldy/dotfiles' : 'https://github.com/harilvfs/i3wmdotfiles';

        const dotCmd = `
        set -e
        ${asArchUser(username, `
            cd "$HOME"
            rm -rf .dotfiles_tmp
            git clone --depth 1 ${repo} .dotfiles_tmp
            cp -rT .dotfiles_tmp .
            [ -f "install.sh" ] && chmod +x install.sh && ./install.sh
            rm -rf .dotfiles_tmp
        `)}
        `;
        try {
            await runInArchChecked(dotCmd, 'inherit', 'Failed to apply dotfiles');
        } catch (err) {
            spinner.stop(chalk.red(err.message));
            await sleep(1200);
            return;
        }
    }

    if (display === 'VNC') {
        spinner.message('Configuring VNC...');
        const sessionCmd = de === 'XFCE'
            ? 'if command -v dbus-launch >/dev/null 2>&1; then exec dbus-launch --exit-with-session startxfce4; fi; exec startxfce4'
            : 'if command -v dbus-launch >/dev/null 2>&1; then exec dbus-launch --exit-with-session i3; fi; exec i3';

        const vncCmd = `
        set -e
        ${asArchUser(username, `
            mkdir -p "$HOME/.vnc"
            cat > "$HOME/.vnc/xstartup" <<'EOF'
#!/bin/sh
unset SESSION_MANAGER
unset DBUS_SESSION_BUS_ADDRESS
[ -r "$HOME/.Xresources" ] && xrdb "$HOME/.Xresources"
${sessionCmd}
EOF
            chmod +x "$HOME/.vnc/xstartup"
            echo "123456" | vncpasswd -f > "$HOME/.vnc/passwd"
            chmod 600 "$HOME/.vnc/passwd"
        `)}
        `;
        try {
            await runInArchChecked(vncCmd, 'inherit', 'Failed to configure VNC');
        } catch (err) {
            spinner.stop(chalk.red(err.message));
            await sleep(1200);
            return;
        }
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

        try {
            await runInArchChecked(asArchUser(username, 'command -v vncserver >/dev/null 2>&1'), 'ignore', 'vncserver not found. Install GUI with VNC first.');
            await runInArch(asArchUser(username, 'vncserver -kill :1 >/dev/null 2>&1 || true'), 'ignore');
            await runInArchChecked(asArchUser(username, 'vncserver :1 -geometry 1280x720 -depth 24'), 'inherit', 'Failed to start VNC server');
        } catch (err) {
            p.log.error(err.message);
            await sleep(1500);
            return;
        }

        p.note('VNC Server is running. Connect using any VNC Viewer.', 'VNC Status');
        await p.text({ message: 'Press Enter to stop VNC server and return...' });

        await runInArch(asArchUser(username, 'vncserver -kill :1 >/dev/null 2>&1 || true'), 'ignore');
    } else {
        p.log.warn('Make sure Termux-X11 app is running and X11 server is started in Termux.');

        const displayValue = await p.text({
            message: 'Enter DISPLAY value:',
            placeholder: ':0',
            validate: (val) => {
                if (!val) return 'DISPLAY cannot be empty';
                if (!/^:[0-9]+$/.test(val)) return 'Invalid DISPLAY format (example: :0)';
            }
        });

        if (p.isCancel(displayValue)) return;

        const sessionCmd = de === 'XFCE'
            ? 'if command -v dbus-launch >/dev/null 2>&1; then exec dbus-launch --exit-with-session startxfce4; fi; exec startxfce4'
            : 'if command -v dbus-launch >/dev/null 2>&1; then exec dbus-launch --exit-with-session i3; fi; exec i3';

        const deCmd = `env DISPLAY=${displayValue} sh -lc ${shSingleQuote(sessionCmd)}`;

        try {
            await runInArchChecked(asArchUser(username, deCmd), 'inherit', 'Failed to start desktop via Termux-X11');
        } catch (err) {
            p.log.error(err.message);
            await sleep(1500);
            return;
        }
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
            if (process.platform === 'win32') {
                p.note('GUI installation is not available on Win32/dev environment.', 'GUI');
                await sleep(1200);
                continue;
            }

            const preflight = await bootAndVerifyDistro('archlinux', { title: 'Booting archlinux' });
            if (!preflight.ok) return await showKernelPanic(preflight.stopCode);

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
                    { value: 'STOCK', label: 'Stock', hint: 'Pure vanilla DE' },
                    { value: 'DOTFILES', label: 'Custom Dotfiles', hint: 'Themed & Pre-configured' }
                ]
            });
            if (p.isCancel(config)) continue;

            const s = p.spinner();
            await installGUI(de, display, config === 'DOTFILES', s);
            await sleep(2000);
        }

        if (choice === 'START') {
            if (process.platform === 'win32') {
                p.note('GUI start is not available on Win32/dev environment.', 'GUI');
                await sleep(1200);
                continue;
            }

            const preflight = await bootAndVerifyDistro('archlinux', { title: 'Booting archlinux' });
            if (!preflight.ok) return await showKernelPanic(preflight.stopCode);

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

            const s = p.spinner();
            s.start('Preparing GUI session...');
            try {
                const preparedUsername = await setupUser(s);
                if (!preparedUsername) {
                    s.stop('Cancelled.');
                    await sleep(800);
                    continue;
                }
                s.stop('Ready.');
            } catch (err) {
                s.stop(chalk.red(err.message));
                await sleep(1500);
                continue;
            }

            await startGUI(de, display);
        }
    }
}
