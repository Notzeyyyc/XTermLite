import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { archlogo } from '../lib/ascii.js';
import { centerBlock, centerText, sleep } from '../lib/utils.js';

async function updateSystem(spinner) {
    spinner.start('Connecting to repository...');
    try {
        if (!shell.which('git')) {
             throw new Error('Git not installed.');
        }

        // Fetch latest data from remote
        const fetch = shell.exec('git fetch origin', { silent: true });
        
        if (fetch.code !== 0) throw new Error('Network Error or Invalid Repo.');

        // Check Status
        // -uno: Ignore untracked files
        const status = shell.exec('git status -uno', { silent: true }).stdout;

        if (status.includes('behind')) {
            spinner.message('New version detected. Downloading...');
            await sleep(1500);
            
            const pull = shell.exec('git pull origin main', { silent: true });
            
            if (pull.code === 0) {
                 spinner.stop(chalk.green('Bootloader Updated Successfully!'));
                 p.note('System will now restart to apply changes.', 'Update Complete');
                 await sleep(2000);
                 process.exit(0); // Force restart
            } else {
                 throw new Error('Merge Failed. Please manual pull.');
            }
        } else {
            spinner.stop(chalk.green('XTermLite is already up to date.'));
        }
    } catch (e) {
        spinner.stop(chalk.red(`Update Failed: ${e.message}`));
    }
}

async function fixShell(spinner) {
    spinner.start('Repairing Shell Environment...');
    try {
        const setupScript = `
        echo "Restoring default shell configurations..."
        cp /etc/skel/.bashrc /root/.bashrc
        chsh -s /bin/bash root
        rm -rf /root/.oh-my-zsh
        rm /root/.zshrc
        echo "Done. Please re-run 'xterm -i ohhmyzsh' in Manager Mode if you want ZSH back."
        `;
        
        await new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', setupScript], { stdio: 'ignore' });
            child.on('close', () => resolve());
        });
        spinner.stop('Shell reset to BASH default.');
    } catch (e) {
        spinner.stop(chalk.red('Failed to repair shell.'));
    }
}

async function softReset(spinner) {
    spinner.start('Performing Soft Reset...');
    try {
        const resetCmd = `
        sed -i '/XTERM_LITE_INJECT/d' /root/.bashrc
        sed -i '/XTERM_LITE_INJECT/d' /root/.zshrc
        echo "XTermLite configurations removed."
        `;
        await new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', resetCmd], { stdio: 'ignore' });
            child.on('close', () => resolve());
        });
        spinner.stop('Soft Reset Complete. Configs cleaned.');
    } catch (e) {
        spinner.stop(chalk.red('Soft Reset Failed.'));
    }
}

async function wipeData(spinner) {
    spinner.start('Wiping XTerm/Arch Linux Data...');
    await new Promise((resolve) => {
        const child = spawn('proot-distro', ['remove', 'archlinux'], { stdio: 'ignore' });
        child.on('close', () => resolve());
    });
    spinner.stop(chalk.green('System Wiped Successfully.'));
}

export async function showBasicRecovery() {
    console.clear();
    
    // Custom Header for Recovery
    const header = `
   ___  ___  ___  ___  _  _  ___  ___  _  _ 
  | _ \\| __|/ __|/ _ \\| || || __|| _ \\| || |
  |   /| _| | (__| (_) | \\/ || _| |   / \\  / 
  |_|_\\|___|\\___|\\___/ \\__/ |___||_|_\\  |_|  
    `;
    
    console.log(centerBlock(chalk.red.bold(header)));
    console.log(centerText(chalk.bgRed.white.bold(' SYSTEM MAINTENANCE MODE ')));
    console.log('');

    const choice = await p.select({
        message: chalk.white('Select Operation:'),
        options: [
            { value: 'UPDATE', label: chalk.green('update-bootloader'), hint: 'Check & Install Latest XTermLite Updates' },
            { value: 'FIX_SHELL', label: chalk.cyan('repair-shell'), hint: 'Restore default Bash/Zsh configs' },
            { value: 'SOFT_RESET', label: chalk.cyan('soft-reset'), hint: 'Clear XTermLite specific configs' },
            { value: 'WIPE', label: chalk.red('factory-reset'), hint: 'Uninstall Arch Linux completely' },
            { value: 'EXIT', label: chalk.gray('back'), hint: 'Return to Main Menu' },
        ],
    });

    if (p.isCancel(choice) || choice === 'EXIT') return 'MAIN_MENU';

    const s = p.spinner();

    if (choice === 'UPDATE') {
        await updateSystem(s);
        // Wait is inside function or restart happens
    } else if (choice === 'FIX_SHELL') {
        await fixShell(s);
    } else if (choice === 'SOFT_RESET') {
        await softReset(s);
    } else if (choice === 'WIPE') {
        p.log.warn(chalk.red.bold('CRITICAL WARNING'));
        const confirm = await p.confirm({ message: 'This action cannot be undone. Uninstall Arch Linux?' });
        if (confirm) {
            await wipeData(s);
            return 'BOOT'; 
        }
    }

    await sleep(1500);
    return 'MAIN_MENU';
}
