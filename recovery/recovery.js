import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import { getLogo } from '../lib/ascii.js';
import { centerBlock, centerText, sleep } from '../lib/utils.js';
import { loadSettings, saveSettings } from '../lib/config.js';

const REPO_URL = 'https://github.com/Notzeyyyc/XTermLite.git';

async function gitExec(cmd) {
    return shell.exec(cmd, { silent: true });
}

function shSingleQuote(value) {
    return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function normalizeHostPath(hostPath) {
    return String(hostPath || '').replace(/\\/g, '/');
}

async function injectArchZshrc(spinner) {
    if (process.platform === 'win32') return false;
    const archInstalled = await hasArchLinux();
    if (!archInstalled) return false;

    const hostRepoPath = normalizeHostPath(process.cwd());
    if (!hostRepoPath) return false;

    spinner.start('Injecting Arch shell profile (.zshrc)...');

    const bindSpec = `${hostRepoPath}:/xtermlite`;
    const cmd = `cd /xtermlite && [ -f tools/setup_arch.sh ] && bash tools/setup_arch.sh || true`;

    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--bind', bindSpec, '--', 'bash', '-lc', cmd], { stdio: 'ignore' });
        child.on('close', (code) => {
            spinner.stop(code === 0 ? chalk.green('Arch .zshrc injected.') : chalk.yellow('Arch .zshrc injection skipped/failed.'));
            resolve(code === 0);
        });
        child.on('error', () => {
            spinner.stop(chalk.yellow('Arch .zshrc injection skipped/failed.'));
            resolve(false);
        });
    });
}

async function applyPostUpdateInjection(spinner) {
    await optimizeHostAutostart(spinner);
    await injectArchZshrc(spinner);
}

async function performUpdate(branchOrTag, spinner, isTag = false) {
    spinner.start(`Switching to ${branchOrTag}...`);

    // Ensure we have latest info
    const fetch = await gitExec('git fetch origin --tags');
    if (fetch.code !== 0) throw new Error('Failed to reach GitHub.');

    if (isTag) {
        const checkout = await gitExec(`git checkout -f ${branchOrTag}`);
        if (checkout.code !== 0) throw new Error(`Could not switch to version ${branchOrTag}`);
    } else {
        // Switch to branch and reset to origin
        const checkout = await gitExec(`git checkout -B ${branchOrTag} origin/${branchOrTag}`);
        if (checkout.code !== 0) throw new Error(`Could not switch to branch ${branchOrTag}`);
        await gitExec(`git reset --hard origin/${branchOrTag}`);
    }

    await applyPostUpdateInjection(spinner);
    spinner.stop(chalk.green(`System updated to ${branchOrTag}!`));
    p.note('System will now restart to apply changes.', 'Update Complete');
    await sleep(2000);
    process.exit(0);
}

async function showUpdateMenu(spinner) {
    const updateChoice = await p.select({
        message: 'Select Update Channel:',
        options: [
            { value: 'STABLE', label: 'Stable Release', hint: 'Recommended (main branch)' },
            { value: 'BETA', label: 'Beta Version', hint: 'Experimental features (beta branch)' },
            { value: 'DOWNGRADE', label: 'Downgrade / Specific Version', hint: 'Switch to a previous tag' },
            { value: 'BACK', label: chalk.gray('Back') }
        ]
    });

    if (p.isCancel(updateChoice) || updateChoice === 'BACK') return;

    try {
        if (updateChoice === 'STABLE') {
            await performUpdate('main', spinner);
        } else if (updateChoice === 'BETA') {
            await performUpdate('beta', spinner);
        } else if (updateChoice === 'DOWNGRADE') {
            spinner.start('Fetching available versions...');
            await gitExec('git fetch origin --tags');
            const tagsOutput = await gitExec('git tag -l --sort=-v:refname');
            const tags = tagsOutput.stdout.split('\n').filter(t => t.trim() !== '');

            spinner.stop('Versions fetched.');

            if (tags.length === 0) {
                p.log.warn('No version tags found in repository. Using recent commits instead.');
                const logsOutput = await gitExec('git log -n 10 --oneline');
                const commits = logsOutput.stdout.split('\n').filter(c => c.trim() !== '').map(line => {
                    const [hash, ...msg] = line.split(' ');
                    return { value: hash, label: hash, hint: msg.join(' ') };
                });

                const commitChoice = await p.select({
                    message: 'Select commit to roll back to:',
                    options: [...commits, { value: 'BACK', label: 'Back' }]
                });

                if (commitChoice !== 'BACK' && !p.isCancel(commitChoice)) {
                    await performUpdate(commitChoice, spinner, true);
                }
            } else {
                const tagChoice = await p.select({
                    message: 'Select version tag:',
                    options: [...tags.map(t => ({ value: t, label: t })), { value: 'BACK', label: 'Back' }]
                });

                if (tagChoice !== 'BACK' && !p.isCancel(tagChoice)) {
                    await performUpdate(tagChoice, spinner, true);
                }
            }
        }
    } catch (e) {
        spinner.stop(chalk.red('Update Failed'));
        p.log.error(e.message);
    }
}

async function updateSystem(spinner) {
    spinner.start('Connecting to repository...');
    try {
        if (!shell.which('git')) {
             throw new Error('Git not installed.');
        }

        // AUTO-REPAIR: If .git is missing, re-initialize it
        if (!shell.test('-d', '.git')) {
             spinner.message(chalk.yellow('Missing .git detected. Repairing...'));
             await sleep(1000);
             
             shell.exec('git init', { silent: true });
             shell.exec(`git remote add origin ${REPO_URL}`, { silent: true });
             
             spinner.message(chalk.yellow('Fetching latest firmware...'));
             const fetch = shell.exec('git fetch origin', { silent: true });
             
             if (fetch.code !== 0) throw new Error('Repair failed: Cannot reach GitHub.');
             
             // Force reset to match remote state
             shell.exec('git reset --hard origin/main', { silent: true });
             
             await applyPostUpdateInjection(spinner);
             spinner.stop(chalk.green('Repository Repaired & Updated!'));
             p.note('System restored to latest version.', 'Update Complete');
             await sleep(2000);
             process.exit(0);
             return;
        }

        spinner.stop('Connection established.');
        await showUpdateMenu(spinner);

    } catch (e) {
        spinner.stop(chalk.red('Initialization Failed'));
        p.log.error(e.message); 
    }
}

async function fixShell(spinner) {
    spinner.start('Repairing Shell Environment...');
    try {
        const setupScript = `
        echo "Restoring default shell configurations..."
        cp /etc/skel/.bashrc /root/.bashrc
        chsh -s /bin/bash root
        rm -rf /root/.oh-my-zsh
        rm /root/.zshrc
        echo "Done. Please re-run 'xterm -i ohhmyzsh' in Manager Mode if you want ZSH back."
        `;
        
        await new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', setupScript], { stdio: 'ignore' });
            child.on('close', () => resolve());
        });
        spinner.stop('Shell reset to BASH default.');
    } catch (e) {
        spinner.stop(chalk.red('Failed to repair shell.'));
    }
}

async function softReset(spinner) {
    spinner.start('Performing Soft Reset...');
    try {
        const resetCmd = `
        sed -i '/XTERM_LITE_INJECT/d' /root/.bashrc
        sed -i '/XTERM_LITE_INJECT/d' /root/.zshrc
        echo "XTermLite configurations removed."
        `;
        await new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', resetCmd], { stdio: 'ignore' });
            child.on('close', () => resolve());
        });
        spinner.stop('Soft Reset Complete. Configs cleaned.');
    } catch (e) {
        spinner.stop(chalk.red('Soft Reset Failed.'));
    }
}

async function wipeData(spinner) {
    spinner.start('Wiping XTerm/Arch Linux Data...');
    await new Promise((resolve) => {
        const child = spawn('proot-distro', ['remove', 'archlinux'], { stdio: 'ignore' });
        child.on('close', () => resolve());
    });
    spinner.stop(chalk.green('System Wiped Successfully.'));
}

async function hasArchLinux() {
    if (!shell.which('proot-distro')) return false;
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'true'], { stdio: 'ignore' });
        child.on('close', (code) => resolve(code === 0));
        child.on('error', () => resolve(false));
    });
}

function buildAutostartBlock(appPath) {
    return `
# XTERM-OS AUTOSTART START
if [ -z "$XTERM_SESSION" ]; then
    export XTERM_SESSION=1
    echo "Booting XTerm-OS..."
    node "${appPath}/index.js"
fi
# XTERM-OS AUTOSTART END
`.trim();
}

async function optimizeHostAutostart(spinner) {
    spinner.start('Optimizing Termux autostart (.zshrc)...');
    try {
        const zshrcPath = path.join(os.homedir(), '.zshrc');
        const appPath = process.cwd().replace(/\\/g, '/');
        const block = buildAutostartBlock(appPath);

        const existing = fs.existsSync(zshrcPath) ? fs.readFileSync(zshrcPath, 'utf-8') : '';
        const cleaned = existing
            .replace(/\r/g, '')
            .replace(/^# XTERM-OS AUTOSTART START[\s\S]*?^# XTERM-OS AUTOSTART END\s*$/gm, '')
            .replace(/^# XTERM-OS AUTOSTART[\s\S]*?^fi\s*$/gm, '');

        const next = `${cleaned.trimEnd()}\n\n${block}\n`;
        fs.writeFileSync(zshrcPath, next, 'utf-8');
        spinner.stop(chalk.green('Autostart optimized.'));
        return true;
    } catch (e) {
        spinner.stop(chalk.red('Failed to optimize .zshrc.'));
        return false;
    }
}

async function optimizePacmanCache(spinner) {
    spinner.start('Cleaning Arch pacman cache...');
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-lc', 'pacman -Sc --noconfirm'], { stdio: 'ignore' });
        child.on('close', (code) => {
            if (code === 0) spinner.stop(chalk.green('Pacman cache cleaned.'));
            else spinner.stop(chalk.yellow('Pacman cache cleanup skipped/failed.'));
            resolve();
        });
        child.on('error', () => {
            spinner.stop(chalk.red('Failed to launch pacman cache cleanup.'));
            resolve();
        });
    });
}

async function optimizeRuntime(spinner) {
    await optimizeHostAutostart(spinner);

    const settings = loadSettings();
    const liteChoice = await p.select({
        message: `Lite Mode is currently: ${settings.liteMode ? 'ON' : 'OFF'}. Set to:`,
        options: [
            { value: 'ON', label: 'ON (faster UI)' },
            { value: 'OFF', label: 'OFF (normal delays)' },
            { value: 'SKIP', label: chalk.gray('Skip') }
        ]
    });

    if (!p.isCancel(liteChoice) && liteChoice !== 'SKIP') {
        settings.liteMode = liteChoice === 'ON';
        saveSettings(settings);
        p.note(`Lite Mode set to: ${settings.liteMode ? 'ON' : 'OFF'}`, 'Optimizer');
    }

    const archInstalled = await hasArchLinux();
    if (archInstalled) {
        const cleanCache = await p.confirm({ message: 'Clean Arch pacman cache to free storage?' });
        if (cleanCache) {
            await optimizePacmanCache(spinner);
        }
    }
}

export async function showBasicRecovery() {
    console.clear();
    
    // Custom Header for Recovery
    const header = `
   ___  ___  ___  ___  _  _  ___  ___  _  _ 
  | _ \\| __|/ __|/ _ \\| || || __|| _ \\| || |
  |   /| _| | (__| (_) | \\/ || _| |   / \\  / 
  |_|_\\|___|\\___|\\___/ \\__/ |___||_|_\\  |_|  
    `;
    
    console.log(centerBlock(chalk.red.bold(header)));
    console.log(centerText(chalk.bgRed.white.bold(' SYSTEM MAINTENANCE MODE ')));
    console.log('');

    const choice = await p.select({
        message: chalk.white('Select Operation:'),
        options: [
            { value: 'UPDATE', label: chalk.green('bootloader-update'), hint: 'Stable, Beta, or Downgrade' },
            { value: 'OPTIMIZE', label: chalk.cyan('optimizer'), hint: 'Speed up UI & fix autostart' },
            { value: 'FIX_SHELL', label: chalk.cyan('repair-shell'), hint: 'Restore default Bash/Zsh configs' },
            { value: 'SOFT_RESET', label: chalk.cyan('soft-reset'), hint: 'Clear XTermLite specific configs' },
            { value: 'WIPE', label: chalk.red('factory-reset'), hint: 'Uninstall Arch Linux completely' },
            { value: 'EXIT', label: chalk.gray('back'), hint: 'Return to Main Menu' },
        ],
    });

    if (p.isCancel(choice) || choice === 'EXIT') return 'MAIN_MENU';

    const s = p.spinner();

    if (choice === 'UPDATE') {
        await updateSystem(s);
    } else if (choice === 'OPTIMIZE') {
        await optimizeRuntime(s);
    } else if (choice === 'FIX_SHELL') {
        await fixShell(s);
    } else if (choice === 'SOFT_RESET') {
        await softReset(s);
    } else if (choice === 'WIPE') {
        p.log.warn(chalk.red.bold('CRITICAL WARNING'));
        const confirm = await p.confirm({ message: 'This action cannot be undone. Uninstall Arch Linux?' });
        if (confirm) {
            await wipeData(s);
            return 'BOOT'; 
        }
    }

    await sleep(1500);
    return 'MAIN_MENU';
}
