import * as p from '@clack/prompts';
import chalk from 'chalk';
import { archlogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';

export async function showMainMenu() {
    while (true) {
        console.clear();
        console.log(centerBlock(archlogo));

        const choice = await p.select({
            message: chalk.cyan(' [ root@arch-term ]~# ') + chalk.white('Select Action:'),
            options: [
                { value: 'SHELL', label: 'Open Arch Shell', hint: 'Login to proot-distro' },
                { value: 'PLAYGROUND', label: 'XTerm Console', hint: 'Package Manager / Settings' },
                { value: 'RECOVERY', label: 'Recovery Mode', hint: 'Fix, Reset, & Advanced Tools' },
                { value: 'GUI', label: 'Start Desktop (GUI)', hint: 'VNC Server' },
                { value: 'CUSTOM', label: 'Personalize', hint: 'Theme & Fonts' },
                { value: 'EXIT', label: 'Shutdown', hint: 'Exit' },
            ],
        });

        if (p.isCancel(choice) || choice === 'EXIT') return 'EXIT';

        if (choice === 'SHELL') return 'SHELL';
        if (choice === 'PLAYGROUND') return 'PLAYGROUND';
        if (choice === 'RECOVERY') return 'RECOVERY_MENU';

        if (choice === 'GUI' || choice === 'CUSTOM') {
            p.log.warn('Feature coming soon!');
            await sleep(1000);
            // Loop back to menu
        }
    }
}
