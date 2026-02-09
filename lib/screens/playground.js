import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';
import { bootAndVerifyDistro, showKernelPanic } from './kernelpanic.js';

const DEFAULT_INSTALLER_URL = 'https://raw.githubusercontent.com/Notzeyyyc/XTermLite-Tools/main/install.sh';

function shSingleQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function isValidHttpUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isTarXzUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.pathname.toLowerCase().endsWith('.tar.xz');
    } catch {
        return false;
    }
}

function validateRootfsUrl(value) {
    const trimmed = String(value || '').trim();
    if (!trimmed) return 'URL cannot be empty';
    if (/\s/.test(trimmed)) return 'URL must not contain spaces';
    if (!isValidHttpUrl(trimmed)) return 'URL must start with http:// or https://';
    if (!isTarXzUrl(trimmed)) return 'URL must end with .tar.xz';
    return undefined;
}

async function installPackage(packageName, spinner) {
    spinner.start(`Process: ${packageName}...`);

    if (packageName === 'ohhmyzsh' || packageName === 'oh-my-zsh') {
        spinner.message('Installing ZSH & Dependencies...');
        
        const installCmd = `
        pacman -S --noconfirm zsh git curl
        if [ ! -d "/root/.oh-my-zsh" ]; then
            sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi
        
        # Inject XTermLite config into .zshrc if not present
        if ! grep -q "XTERM_LITE_INJECT" /root/.zshrc; then
            echo '
# --- XTERM_LITE_INJECT START ---
export PROMPT="%F{cyan}[ root@arch-term ]~# %f"
clear
neofetch
# --- XTERM_LITE_INJECT END ---
            ' >> /root/.zshrc
        fi
        
        chsh -s $(which zsh)
        `;

        return new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', installCmd], { stdio: 'ignore' });
            
            child.on('close', (code) => {
                if (code === 0) {
                    spinner.stop('Oh My Zsh installed & configured successfully.');
                } else {
                    spinner.stop(chalk.red('Failed to install Oh My Zsh.'));
                }
                resolve();
            });
        });
    } else {
        // Generic Package Installation via Pacman
        spinner.message(`Downloading & Installing ${packageName}...`);
        
        return new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'pacman', '-S', '--noconfirm', packageName], { stdio: 'ignore' });
            
            child.on('close', (code) => {
                if (code === 0) {
                    spinner.stop(chalk.green(`Package '${packageName}' installed successfully.`));
                } else {
                    spinner.stop(chalk.red(`Failed to install '${packageName}' (Package not found or network error).`));
                }
                resolve();
            });
        });
    }
}

async function uninstallPackage(packageName, spinner) {
    spinner.start(`Process: ${packageName}...`);

    if (packageName === 'ohhmyzsh' || packageName === 'oh-my-zsh') {
        spinner.message('Removing Oh My Zsh config...');

        const uninstallCmd = `
        rm -rf /root/.oh-my-zsh || true
        if [ -f /root/.zshrc ]; then
            sed -i '/XTERM_LITE_INJECT START/,/XTERM_LITE_INJECT END/d' /root/.zshrc || true
        fi
        `;

        return new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', uninstallCmd], { stdio: 'ignore' });
            child.on('close', (code) => {
                if (code === 0) spinner.stop(chalk.green('Oh My Zsh config removed.'));
                else spinner.stop(chalk.red('Failed to remove Oh My Zsh config.'));
                resolve();
            });
            child.on('error', () => {
                spinner.stop(chalk.red('Failed to launch uninstall process.'));
                resolve();
            });
        });
    }

    spinner.message(`Removing ${packageName}...`);
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'pacman', '-Rns', '--noconfirm', packageName], { stdio: 'ignore' });
        child.on('close', (code) => {
            if (code === 0) spinner.stop(chalk.green(`Package '${packageName}' removed successfully.`));
            else spinner.stop(chalk.red(`Failed to remove '${packageName}' (Not installed or dependency conflict).`));
            resolve();
        });
        child.on('error', () => {
            spinner.stop(chalk.red('Failed to launch pacman remove process.'));
            resolve();
        });
    });
}

function printXtermHelp() {
    p.log.step('XTerm Command Help:');
    console.log(chalk.white('  xterm -i <pkg>          ') + chalk.gray('- Install package (e.g., neofetch, ohhmyzsh)'));
    console.log(chalk.white('  xterm -uin <pkg>        ') + chalk.gray('- Uninstall package (pacman -Rns)'));
    console.log(chalk.white('  xterm -i --profiler     ') + chalk.gray('- Guided installer by profile'));
    console.log(chalk.white('  xterm -srch [query]     ') + chalk.gray('- Search packages and install from list'));
    console.log(chalk.white('  xterm --help            ') + chalk.gray('- Show this help'));
    console.log(chalk.white('  xtrm --help             ') + chalk.gray('- Alias for xterm help'));
}

function getProfiles() {
    return [
        {
            id: 'DEV',
            label: 'Developer Essentials',
            hint: 'git, base-devel, python, node, tools',
            packages: [
                { value: 'git', label: 'git' },
                { value: 'base-devel', label: 'base-devel' },
                { value: 'curl', label: 'curl' },
                { value: 'wget', label: 'wget' },
                { value: 'zsh', label: 'zsh' },
                { value: 'tmux', label: 'tmux' },
                { value: 'htop', label: 'htop' },
                { value: 'ripgrep', label: 'ripgrep' },
                { value: 'fd', label: 'fd' },
                { value: 'python', label: 'python' },
                { value: 'python-pip', label: 'python-pip' },
                { value: 'nodejs', label: 'nodejs' },
                { value: 'npm', label: 'npm' },
                { value: 'neovim', label: 'neovim' }
            ]
        },
        {
            id: 'NET',
            label: 'Networking',
            hint: 'diagnostic & tools',
            packages: [
                { value: 'net-tools', label: 'net-tools' },
                { value: 'iproute2', label: 'iproute2' },
                { value: 'dnsutils', label: 'dnsutils' },
                { value: 'openssh', label: 'openssh' },
                { value: 'nmap', label: 'nmap' },
                { value: 'tcpdump', label: 'tcpdump' }
            ]
        },
        {
            id: 'MEDIA',
            label: 'Multimedia',
            hint: 'common media tools',
            packages: [
                { value: 'ffmpeg', label: 'ffmpeg' },
                { value: 'imagemagick', label: 'imagemagick' },
                { value: 'mediainfo', label: 'mediainfo' }
            ]
        }
    ];
}

async function installByProfiler() {
    const profileChoice = await p.select({
        message: 'Select install profile:',
        options: getProfiles().map((pr) => ({ value: pr.id, label: pr.label, hint: pr.hint }))
    });

    if (p.isCancel(profileChoice)) return;

    const profile = getProfiles().find((pr) => pr.id === profileChoice);
    if (!profile) {
        p.log.error('Invalid profile selection.');
        return;
    }

    const selected = await p.multiselect({
        message: `Select packages (${profile.label}):`,
        options: profile.packages,
        required: true
    });

    if (p.isCancel(selected)) return;
    if (!Array.isArray(selected) || selected.length === 0) {
        p.log.warn('No packages selected.');
        return;
    }

    const confirm = await p.confirm({ message: `Install ${selected.length} package(s)?` });
    if (!confirm) return;

    const s = p.spinner();
    for (const pkgName of selected) {
        await installPackage(pkgName, s);
        await sleep(300);
    }
}

function parsePacmanSearch(output, limit = 30) {
    const lines = String(output || '').split('\n');
    const results = [];
    let current = null;

    for (const rawLine of lines) {
        const line = rawLine.replace(/\r/g, '');
        if (!line.trim()) continue;
        if (/^\s/.test(line)) {
            if (current && !current.description) current.description = line.trim();
            continue;
        }

        const m = line.match(/^(\S+)\/(\S+)\s+([^\s]+)\s*(.*)$/);
        if (!m) continue;

        current = {
            repo: m[1],
            name: m[2],
            version: m[3],
            rest: (m[4] || '').trim(),
            description: ''
        };
        results.push(current);
        if (results.length >= limit) break;
    }

    return results;
}

async function searchAndInstall(queryArg) {
    const query = (queryArg || '').trim() || await p.text({
        message: 'Search query:',
        placeholder: 'e.g. neofetch, vim, python',
        validate: (val) => {
            if (!val) return 'Query cannot be empty';
        }
    });

    if (p.isCancel(query)) return;

    const s = p.spinner();
    s.start(`Searching: ${query}...`);

    const searchCmd = `pacman -Ss ${shSingleQuote(query)}`;
    const output = await new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-lc', searchCmd], { stdio: ['ignore', 'pipe', 'pipe'] });
        let stdout = '';

        child.stdout?.on('data', (d) => { stdout += d.toString(); });
        child.on('close', () => resolve(stdout));
        child.on('error', () => resolve(''));
    });

    const results = parsePacmanSearch(output, 30);
    s.stop(results.length ? `Found ${results.length} result(s).` : 'No results.');

    if (!results.length) {
        await sleep(800);
        return;
    }

    const selected = await p.select({
        message: 'Select package to install:',
        options: results.map((r) => ({
            value: `${r.repo}/${r.name}`,
            label: `${r.repo}/${r.name}`,
            hint: `${r.version}${r.description ? ` • ${r.description}` : ''}`
        }))
    });

    if (p.isCancel(selected)) return;

    const name = String(selected).split('/').slice(1).join('/').trim();
    if (!name) {
        p.log.error('Invalid selection.');
        return;
    }

    const confirm = await p.confirm({ message: `Install "${name}" now?` });
    if (!confirm) return;

    const sp = p.spinner();
    await installPackage(name, sp);
}

async function runManualInstallerDebug(url, alias) {
    const aliasArg = alias === 'archlinux'
        ? 'archlinux'
        : `--override-alias ${alias} archlinux`;
    const script = [
        `$installerUrl = ${JSON.stringify(url)}`,
        'Write-Host "Manual Installer Debug (PowerShell)"',
        'Write-Host "Step 1: Install proot-distro"',
        'Write-Host "pkg install proot-distro -y"',
        'Write-Host "Step 2: Set rootfs URL"',
        'Write-Host ("$env:PD_OVERRIDE_TARBALL_URL=" + $installerUrl)',
        'Write-Host "Step 3: Install distro from rootfs"',
        `Write-Host "proot-distro install ${aliasArg}"`
    ].join('; ');

    await new Promise((resolve) => {
        const child = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
            stdio: 'inherit',
            shell: false
        });
        child.on('close', () => resolve());
        child.on('error', () => resolve());
    });
}

async function showManualInstaller() {
    const inputAlias = await p.text({
        message: 'Distro alias (empty = archlinux):',
        placeholder: 'archlinux',
        validate: (val) => {
            const v = String(val || '').trim();
            if (!v) return;
            if (!/^[a-z0-9][a-z0-9_-]*$/.test(v)) return 'Alias may contain lowercase letters, numbers, _ or -';
        }
    });
    if (p.isCancel(inputAlias)) return;
    const alias = String(inputAlias || '').trim() || 'archlinux';

    const inputUrl = await p.text({
        message: 'Rootfs .tar.xz URL:',
        placeholder: 'https://example.com/rootfs.tar.xz',
        validate: validateRootfsUrl
    });

    if (p.isCancel(inputUrl)) return;
    const url = String(inputUrl || '').trim();
    if (process.platform === 'win32') {
        await runManualInstallerDebug(url, alias);
        await p.text({ message: 'Press Enter to return...' });
        return;
    }
    const installCmd = alias === 'archlinux'
        ? `PD_OVERRIDE_TARBALL_URL="${url}" proot-distro install archlinux`
        : `PD_OVERRIDE_TARBALL_URL="${url}" proot-distro install --override-alias ${alias} archlinux`;
    p.note('pkg install proot-distro -y', 'Step 1');
    p.note(`export PD_OVERRIDE_TARBALL_URL="${url}"`, 'Step 2');
    p.note(`proot-distro install ${alias === 'archlinux' ? 'archlinux' : `--override-alias ${alias} archlinux`}`, 'Step 3');
    p.note('If you want a one-liner:', 'One-liner');
    p.note(installCmd, 'Manual Install (copy/paste)');
    await p.text({ message: 'Press Enter to return...' });
}

async function runAutoInstaller() {
    if (process.platform === 'win32') {
        p.note('Auto installer is not available on Win32/dev environment.', 'INSTALL');
        await sleep(1200);
        return;
    }

    const url = DEFAULT_INSTALLER_URL;
    const confirm = await p.confirm({ message: 'Run auto installer via curl now?' });
    if (!confirm) return;

    const script = `
set -e
if ! command -v curl >/dev/null 2>&1; then
  pkg install curl -y
fi
curl -L ${shSingleQuote(url)} -o xterm-installer.sh
bash xterm-installer.sh
`.trim();

    await new Promise((resolve) => {
        const child = spawn('bash', ['-s'], { stdio: ['pipe', 'inherit', 'inherit'], shell: false });
        child.stdin.write(script);
        child.stdin.end();
        child.on('close', (code) => {
            if (code !== 0) {
                p.log.error('Auto installer failed to run.');
            }
            resolve();
        });
    });
}

async function selectInstallMode() {
    const choice = await p.select({
        message: 'Select installer mode:',
        options: [
            { value: 'AUTO', label: 'Auto (curl + run)', hint: 'Arch Linux only' },
            { value: 'MANUAL', label: 'Manual (rootfs URL)', hint: 'Custom distro via rootfs URL' },
            { value: 'BACK', label: 'Cancel' }
        ]
    });
    if (p.isCancel(choice) || choice === 'BACK') return null;
    return choice;
}

export async function showPlayground() {
    const installed = isArchInstalled();
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    
    console.clear();
    console.log(centerBlock(getLogo()));

    if (installed) {
        p.log.success(centerText(chalk.green('SYSTEM STATUS: ONLINE (ARCH LINUX)')));
        p.log.info(centerText(chalk.gray('Manager Mode. Type "help" for commands.')));
    } else {
        p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
        p.log.info(centerText(chalk.gray('Sys info: Type "install" for auto Arch / manual rootfs.')));
    }
    console.log('');

    while (true) {
        const promptLabel = installed ? chalk.cyan('xterm@manager:~$') : chalk.cyan('xterm@install:~$');

        const cmd = await p.text({
            message: theme.primary(promptLabel),
            placeholder: '',
            validate: (value) => {
                if (!value) return 'Please enter a command';
            }
        });

        if (p.isCancel(cmd)) return installed ? 'MAIN_MENU' : 'EXIT';

        const input = cmd.trim();
        const args = input.split(' ');
        const mainCmd = args[0].toLowerCase();

        if (mainCmd === 'help') {
            p.log.step('Available Commands:');
            if (installed) {
                 console.log(chalk.white('  xterm -i <pkg> ') + chalk.gray('- Install package (e.g., ohhmyzsh)'));
                 console.log(chalk.white('  xterm --help   ') + chalk.gray('- Show xterm command list'));
                 console.log(chalk.white('  reinstall      ') + chalk.gray('- Wipe & Reinstall System'));
                 console.log(chalk.white('  back           ') + chalk.gray('- Return to Main Menu'));
            } else {
                 console.log(chalk.white('  install        ') + chalk.gray('- Auto Arch / manual rootfs'));
            }
            console.log(chalk.white('  clear          ') + chalk.gray('- Clear screen'));
            console.log(chalk.white('  exit           ') + chalk.gray('- Exit program'));
        } 
        else if (mainCmd === 'install' && !installed) {
            const mode = await selectInstallMode();
            if (mode === 'AUTO') await runAutoInstaller();
            if (mode === 'MANUAL') await showManualInstaller();
        }
        else if (!installed && (mainCmd === 'ui-boot' || mainCmd === 'ui-boot-fail')) {
            const failAt = mainCmd === 'ui-boot-fail' ? (args[1] || 'integrity') : undefined;
            const preflight = await bootAndVerifyDistro('archlinux', {
                title: 'Booting archlinux',
                simulate: true,
                simulateFailAt: failAt
            });
            if (!preflight.ok) return await showKernelPanic(preflight.stopCode);
            await p.text({ message: 'Demo complete. Press Enter to return...' });
            console.clear();
            console.log(centerBlock(getLogo()));
        }
        else if (!installed && mainCmd === 'ui-corrupt') {
            return 'KERNEL_CORRUPT';
        }
        else if (mainCmd === 'reinstall' && installed) {
            p.log.warn(chalk.red('WARNING: This will DELETE your current Arch system and all data inside it.'));
            const confirm = await p.confirm({ message: 'Are you sure you want to proceed with Re-installation?' });
            
            if (confirm) {
                const s = p.spinner();
                s.start('Removing current installation...');
                
                await new Promise((resolve) => {
                     const child = spawn('proot-distro', ['remove', 'archlinux'], { stdio: 'ignore' });
                     child.on('close', () => resolve());
                });
                
                s.stop(chalk.green('System Removed. Starting fresh install...'));
                await sleep(1000);
                const mode = await selectInstallMode();
                if (mode === 'AUTO') await runAutoInstaller();
                if (mode === 'MANUAL') await showManualInstaller();
            }
        }
        else if (mainCmd === 'xterm' && installed) {
            if ((args[1] === '--help' || args[1] === '-h') && !args[2]) {
                printXtermHelp();
            }
            else if (args[1] === '-i' && args[2] === '--profiler') {
                await installByProfiler();
            }
            else if (args[1] === '-i' && args[2]) {
                const s = p.spinner();
                await installPackage(args[2], s);
            }
            else if (args[1] === '-uin' && args[2]) {
                const s = p.spinner();
                await uninstallPackage(args[2], s);
            }
            else if (args[1] === '-srch') {
                await searchAndInstall(args.slice(2).join(' '));
            }
            else {
                p.log.error('Usage: xterm --help');
            }
        }
        else if (mainCmd === 'xtrm' && installed) {
            if (args[1] === '--help' || args[1] === '-h') {
                printXtermHelp();
            } else {
                p.log.error('Usage: xtrm --help');
            }
        }
        else if (mainCmd === 'back' && installed) {
            return 'MAIN_MENU';
        }
        else if (mainCmd === 'clear') {
            console.clear();
            console.log(centerBlock(getLogo()));
            if (installed) {
                p.log.success(centerText(chalk.green('SYSTEM STATUS: ONLINE (ARCH LINUX)')));
            } else {
                p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
            }
        }
        else if (mainCmd === 'panic') {
            return 'KERNEL_PANIC';
        }
        else if (mainCmd === 'exit') {
            return 'EXIT';
        }
        else {
            p.log.error(`Command not found: ${input}`);
        }
    }
}
