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
import { showCustomScreen } from './lib/screens/custom.js';
import { showGUIScreen } from './lib/screens/gui.js';
import { showBasicRecovery } from './recovery/recovery.js';
import { showAdvancedRecovery } from './recovery/recovery-xtl.js';

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
            case 'CUSTOM':
                currentState = await showCustomScreen();
                break;
            case 'GUI':
                currentState = await showGUIScreen();
                break;
            case 'KERNEL_PANIC':
                currentState = await showKernelPanic();
                break;
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
            case 'RECOVERY_BASIC':
                currentState = await showBasicRecovery();
                break;
            case 'RECOVERY_ADVANCED':
                currentState = await showAdvancedRecovery();
                break;
            default:
                console.error('Unknown state:', currentState);
                currentState = 'EXIT';
                break;
        }
    }

    await shutdown();
})();
