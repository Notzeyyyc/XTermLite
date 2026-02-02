import * as p from '@clack/prompts';
import chalk from 'chalk';
import boxen from 'boxen';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep, pkg } from '../utils.js';
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

export async function showBootScreen() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);

    console.clear();
    console.log(centerBlock(getLogo()));

    const header = boxen(
        [
            chalk.cyanBright.bold('XTermLite') + chalk.gray(` v${pkg?.version || '0.0.0'}`),
            chalk.gray('Boot sequence • Termux-first Arch manager')
        ].join('\n'),
        { padding: 1, borderStyle: 'round', borderColor: 'cyan' }
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

    await sleep(1000);
    return installed ? 'MAIN_MENU' : 'PLAYGROUND';
}
