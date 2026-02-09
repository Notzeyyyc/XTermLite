import * as p from '@clack/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep, getPkg } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';

async function gitFetchWithTimeout(timeoutMs = 4000) {
    return new Promise((resolve) => {
        const child = spawn('git', ['fetch', 'origin'], { stdio: 'ignore' });
        const timer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch {}
            resolve(false);
        }, timeoutMs);

        child.on('close', (code) => {
            clearTimeout(timer);
            resolve(code === 0);
        });
        child.on('error', () => {
            clearTimeout(timer);
            resolve(false);
        });
    });
}

async function runWithExitCode(command, args, options = {}, timeoutMs = 4000) {
    return new Promise((resolve) => {
        const child = spawn(command, args, options);
        const timer = setTimeout(() => {
            try {
                child.kill('SIGKILL');
            } catch {}
            resolve(1);
        }, timeoutMs);

        child.on('close', (code) => {
            clearTimeout(timer);
            resolve(typeof code === 'number' ? code : 1);
        });
        child.on('error', () => {
            clearTimeout(timer);
            resolve(1);
        });
    });
}

async function runBootHealthChecks() {
    if (process.platform === 'win32') return null;
    if (!shell.which('proot-distro')) return null;

    const checks = [
        { label: 'WM Terminal (tmux)', cmd: 'command -v tmux >/dev/null 2>&1' },
        { label: 'XFCE4', cmd: 'command -v startxfce4 >/dev/null 2>&1' },
        { label: 'i3wm', cmd: 'command -v i3 >/dev/null 2>&1' },
        { label: 'VNC Server', cmd: 'command -v vncserver >/dev/null 2>&1' }
    ];

    const results = [];
    for (const check of checks) {
        const code = await runWithExitCode(
            'proot-distro',
            ['login', 'archlinux', '--', 'sh', '-lc', check.cmd],
            { stdio: 'ignore', shell: false },
            3500
        );
        results.push({ label: check.label, ok: code === 0 });
    }

    return results;
}

export async function showBootScreen() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);

    console.clear();
    console.log(centerBlock(getLogo()));

    const pkg = getPkg();
    const header = boxen(
        [
            chalk.cyanBright.bold('XTermLite') + chalk.gray(` v${pkg?.version || '0.0.0'}`),
            chalk.gray('Simple Arch manager for Termux'),
            chalk.gray(''),
            chalk.blue('Author: ') + chalk.gray('@Notzeyyyc'),
            chalk.red('This is open-source software, if you want to contribute, please visit:'),
            chalk.underline.blue('https://github.com/Notzeyyyc/XTermLite')
        ].join('\n'),
        { padding: 1, margin: 1, borderStyle: 'round', borderColor: 'cyan' }
    );
    console.log(centerBlock(header));
    
    p.intro(centerText(theme.primary.inverse.black(' INITIALIZING XTERMLITE ')));
    
    const s = p.spinner();
    s.start(centerText('Checking system status...'));
    
    // Check for updates (Silent)
    let updateMsg = null;
    
    if (shell.which('git')) {
        s.message(centerText('Checking for updates...'));
        const fetched = await gitFetchWithTimeout(4000);
        if (fetched) {
            const status = shell.exec('git status -uno', { silent: true }).stdout;
            if (status.includes('behind')) {
                updateMsg = 'New Update Available!';
            }
        }
    }
    
    await sleep(1000);
    
    s.message(centerText('Checking Arch Linux installation...'));
    const installed = isArchInstalled();
    
    if (updateMsg) {
        s.stop(centerText(chalk.yellow(updateMsg)));
        const msg = boxen(
            [
                chalk.yellow.bold('Update detected'),
                'Open: Recovery Mode → bootloader-update'
            ].join('\n'),
            { padding: 1, borderStyle: 'round', borderColor: 'yellow' }
        );
        p.note(centerBlock(msg), centerText(chalk.yellow('SYSTEM NOTIFICATION')));
        await sleep(2000);
    } else {
        if (installed) {
            s.stop(centerText(chalk.green('System Ready.')));
        } else {
            s.stop(centerText(chalk.yellow('Not installed. Entering setup...')));
        }
    }

    if (installed) {
        s.start(centerText('Health check: WM & Terminal...'));
        const results = await runBootHealthChecks();
        s.stop(centerText('Health check complete.'));
        if (results?.length) {
            const lines = results.map((item) =>
                `${item.ok ? chalk.green('OK') : chalk.yellow('MISSING')} ${chalk.gray('•')} ${item.label}`
            );
            p.note(centerBlock(lines.join('\n')), centerText(chalk.cyan('HEALTH CHECK')));
            await sleep(800);
        }
    }

    await sleep(1000);
    return installed ? 'MAIN_MENU' : 'PLAYGROUND';
}
