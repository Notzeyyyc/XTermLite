import * as p from '@clack/prompts';
import chalk from 'chalk';
import { archlogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';

export async function showBootScreen() {
    console.clear();
    console.log(centerBlock(archlogo));
    
    p.intro(centerText(chalk.bgCyan.black(' INITIALIZING XTERM-OS (ARCH EDITION) ')));
    
    const s = p.spinner();
    s.start(centerText('Checking Systems...'));
    await sleep(1500);
    
    const installed = isArchInstalled();
    
    if (installed) {
        s.stop(centerText(chalk.green('Arch Linux Detected! System Ready.')));
        await sleep(1000);
        return 'MAIN_MENU';
    } else {
        s.stop(centerText(chalk.yellow('Arch Linux NOT found. Entering Setup Playground...')));
        await sleep(1500);
        return 'PLAYGROUND';
    }
}
