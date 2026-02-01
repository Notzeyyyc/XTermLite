#!/usr/bin/env node

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { centerText, sleep } from './lib/utils.js';
import { showBootScreen } from './lib/screens/boot.js';
import { showPlayground } from './lib/screens/playground.js';
import { runInstaller } from './lib/screens/installer.js';
import { showMainMenu } from './lib/screens/menu.js';
import { showKernelPanic } from './lib/screens/kernelpanic.js';
import { startShell } from './lib/screens/shell.js';

async function shutdown() {
    p.outro(centerText(chalk.cyan('XTerm Engine Offline.')));
    await sleep(500);
    process.exit(0);
}

// Global SIGINT
process.on('SIGINT', () => {
    console.log('');
    p.outro(chalk.red('Emergency Shutdown.'));
    process.exit(1);
});

// Run Flow
(async () => {
    let currentState = 'BOOT';

    while (currentState !== 'EXIT') {
        switch (currentState) {
            case 'BOOT':
                currentState = await showBootScreen();
                break;
            case 'PLAYGROUND':
                currentState = await showPlayground();
                break;
            case 'INSTALLER':
                currentState = await runInstaller();
                break;
            case 'MAIN_MENU':
                currentState = await showMainMenu();
                break;
            case 'SHELL':
                currentState = await startShell();
                break;
            case 'KERNEL_PANIC':
                currentState = await showKernelPanic();
                break;
            default:
                console.error('Unknown state:', currentState);
                currentState = 'EXIT';
                break;
        }
    }

    await shutdown();
})();
