import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';

export async function showBootScreen() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);

    console.clear();
    console.log(centerBlock(getLogo()));
    
    p.intro(centerText(theme.primary.inverse.black(' INITIALIZING XTERMLITE ')));
    
    const s = p.spinner();
    s.start(centerText('Checking Systems & Updates...'));
    
    // Check for updates (Silent)
    let updateMsg = null;
    
    // Only check if git is available
    if (shell.which('git')) {
        // Try fetch with a simple timeout simulation by just running it
        // If user has no internet, this might timeout locally (git usually waits)
        // But for better UX we normally do this async. For CLI simplicity we do sync here.
        const fetch = shell.exec('git fetch origin', { silent: true });
        
        if (fetch.code === 0) {
            const status = shell.exec('git status -uno', { silent: true }).stdout;
            // Check if local branch is behind remote
            if (status.includes('behind')) {
                updateMsg = 'New Update Available!';
            }
        }
    }
    
    await sleep(1000);
    
    const installed = isArchInstalled();
    
    if (updateMsg) {
        s.stop(centerText(chalk.yellow(updateMsg)));
        p.note(centerText('Go to Recovery Mode > Update Bootloader'), centerText(chalk.yellow('SYSTEM NOTIFICATION')));
        await sleep(2000);
    } else {
        if (installed) {
            s.stop(centerText(chalk.green('XTermLite Detected! System Ready.')));
        } else {
            s.stop(centerText(chalk.yellow('XTermLite NOT found. Entering Setup Interface...')));
        }
    }

    await sleep(1000);
    return installed ? 'MAIN_MENU' : 'PLAYGROUND';
}
