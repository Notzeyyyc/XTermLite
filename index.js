#!/usr/bin/env node

import * as p from '@clack/prompts';
import chalk from 'chalk';
import { centerText, sleep } from './lib/utils.js';

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

async function runState(state) {
    switch (state) {
        case 'BOOT': {
            const { showBootScreen } = await import('./lib/screens/boot.js');
            return showBootScreen();
        }
        case 'PLAYGROUND': {
            const { showPlayground } = await import('./lib/screens/playground.js');
            return showPlayground();
        }
        case 'INSTALLER': {
            const { runInstaller } = await import('./lib/screens/installer.js');
            return runInstaller();
        }
        case 'MAIN_MENU': {
            const { showMainMenu } = await import('./lib/screens/menu.js');
            return showMainMenu();
        }
        case 'SHELL': {
            const { startShell } = await import('./lib/screens/shell.js');
            return startShell();
        }
        case 'CUSTOM': {
            const { showCustomScreen } = await import('./lib/screens/custom.js');
            return showCustomScreen();
        }
        case 'GUI': {
            const { showGUIScreen } = await import('./lib/screens/gui.js');
            return showGUIScreen();
        }
        case 'KERNEL_PANIC': {
            const { showKernelPanic } = await import('./lib/screens/kernelpanic.js');
            return showKernelPanic();
        }
        case 'KERNEL_CORRUPT': {
            const { showKernelCorrupt } = await import('./lib/screens/kernelpanic.js');
            return showKernelCorrupt();
        }
        case 'RECOVERY_BASIC': {
            const { showBasicRecovery } = await import('./recovery/recovery.js');
            return showBasicRecovery();
        }
        case 'RECOVERY_ADVANCED': {
            const { showAdvancedRecovery } = await import('./recovery/recovery-xtl.js');
            return showAdvancedRecovery();
        }
        default:
            return null;
    }
}

// Run Flow
(async () => {
    let currentState = 'BOOT';

    while (currentState !== 'EXIT') {
        switch (currentState) {
            case 'RECOVERY_MENU':
                // Intermediate menu to choose recovery type
                console.clear();
                const recChoice = await p.select({
                    message: chalk.red('Select Recovery Tier:'),
                    options: [
                        { value: 'BASIC', label: 'Basic Recovery', hint: 'Fix Shell, Reset Config, Wipe' },
                        { value: 'ADVANCED', label: 'XTL Advanced', hint: 'Multi-Distro, Storage, Network' },
                        { value: 'BACK', label: 'Back to Main Menu' }
                    ]
                });
                if (recChoice === 'BASIC') currentState = 'RECOVERY_BASIC';
                else if (recChoice === 'ADVANCED') currentState = 'RECOVERY_ADVANCED';
                else currentState = 'MAIN_MENU';
                break;
            default:
                currentState = (await runState(currentState)) || 'EXIT';
                break;
        }
    }

    await shutdown();
})();
