import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep } from '../utils.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';

export async function showMainMenu() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);

    while (true) {
        console.clear();
        console.log(centerBlock(getLogo()));

        const choice = await p.select({
            message: theme.primary(' [ root@arch-term ]~# ') + chalk.white('Select Action:'),
            options: [
                { value: 'SHELL', label: 'Open Arch Shell', hint: 'Login to proot-distro' },
                { value: 'PLAYGROUND', label: 'XTerm Console', hint: 'Package Manager / Settings' },
                { value: 'RECOVERY', label: 'Recovery Mode', hint: 'Fix, Reset, & Advanced Tools' },
                { value: 'GUI', label: 'Start Desktop', hint: 'VNC Server' },
                { value: 'CUSTOM', label: 'Personalize', hint: 'Theme & Fonts' },
                { value: 'EXIT', label: 'Shutdown', hint: 'Exit' },
            ],
        });

        if (p.isCancel(choice) || choice === 'EXIT') return 'EXIT';

        if (choice === 'SHELL') return 'SHELL';
        if (choice === 'PLAYGROUND') return 'PLAYGROUND';
        if (choice === 'RECOVERY') return 'RECOVERY_MENU';
        if (choice === 'GUI') return 'GUI';
        if (choice === 'CUSTOM') return 'CUSTOM';
    }
}
