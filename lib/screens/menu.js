import * as p from '@clack/prompts';
import chalk from 'chalk';
import { archlogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';

export async function showMainMenu() {
    // Loop only handled by the main index controller via state logic? 
    // Actually the index.js loop handles the high level state. 
    // This function can just return the next state.
    
    console.clear();
    console.log(centerBlock(archlogo));

    const choice = await p.select({
        message: chalk.cyan(' [ root@arch-term ]~# ') + chalk.white('Select Action:'),
        options: [
            { value: 'SHELL', label: '🐚 Open Arch Shell', hint: 'Login to proot-distro' },
            { value: 'GUI', label: '🖥️  Start Desktop (GUI)', hint: 'VNC Server' },
            { value: 'CUSTOM', label: '🎨 Personalize', hint: 'Theme & Fonts' },
            { value: 'EXIT', label: '❌ Shutdown', hint: 'Exit' },
        ],
    });

    if (p.isCancel(choice)) return 'EXIT';
    if (choice === 'EXIT') return 'EXIT';

    if (choice === 'SHELL') {
        return 'SHELL';
    }

    if (choice === 'GUI' || choice === 'CUSTOM') {
        p.log.warn('Feature coming soon!');
        await sleep(1000);
        return 'MAIN_MENU'; // Stay in menu
    }

    return 'EXIT';
}
