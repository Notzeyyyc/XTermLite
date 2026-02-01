import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { sleep } from '../utils.js';
import { configureZshrc } from '../system.js';

async function runCommand(command, args, spinner, loadingText) {
    return new Promise((resolve, reject) => {
        spinner.start(loadingText);
        
        const child = spawn(command, args, { stdio: 'pipe' });
        
        child.on('close', (code) => {
            if (code === 0) {
                spinner.stop(loadingText + ' [DONE]');
                resolve();
            } else {
                spinner.stop(chalk.red(loadingText + ' [FAILED]'));
                reject(new Error(`Command ${command} failed with code ${code}`));
            }
        });

        child.on('error', (err) => {
            spinner.stop(chalk.red(loadingText + ' [ERROR]'));
            reject(err);
        });
    });
}

// Function to run setup inside the guest OS
async function configureGuestOS(spinner) {
    spinner.start('Configuring Guest OS (Neofetch & Shell)...');
    
    const setupScript = `
    pacman -Syu --noconfirm neofetch
    echo '
        PS1="\\[\\e[1;36m\\][ root@arch-term ]~# \\[\\e[0m\\]"
        clear
        neofetch
    ' > /root/.bashrc
    `;

    return new Promise((resolve, reject) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', setupScript], { stdio: 'ignore' });
        
        child.on('close', (code) => {
            if (code === 0) {
                spinner.stop('Guest OS Configured (Neofetch & custom PS1 installed).');
                resolve();
            } else {
                spinner.stop(chalk.yellow('Guest OS Config Partial (Error in setup script).'));
                resolve(); // We don't block install on this
            }
        });
    });
}

export async function runInstaller() {
    console.log('');
    p.note('Starting Real Arch Linux Bootstrap...', 'INSTALLER');
    
    const s = p.spinner();

    try {
        // 1. Check/Install proot-distro
        if (!shell.which('proot-distro')) {
            await runCommand('pkg', ['install', 'proot-distro', '-y'], s, 'Installing proot-distro...');
        } else {
            s.start('Checking dependencies...');
            await sleep(500);
            s.stop('proot-distro is already installed.');
        }

        // 2. Install Arch Linux via proot-distro
        s.stop('Preparing to download Arch Linux image...');
        console.log(chalk.gray('--- Transferring control to proot-distro ---'));
        
        await new Promise((resolve, reject) => {
            // --override to reinstall if exists (assume we want to fix/install)
            // But if user says "gw udh install disuruh install lagi", we might NOT want to override always.
            // However, this function IS the installer. So we assume they WANT to install.
            const child = spawn('proot-distro', ['install', 'archlinux'], { stdio: 'inherit' });
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('proot-distro install failed'));
            });
        });

        console.log(chalk.gray('--- Installation process completed ---'));
        console.log('');

        // 3. Configure Guest (Arch) Environment
        await configureGuestOS(s);

        // 4. Configure Host (Termux) Autostart
        await configureZshrc(s);

        // 5. Finalize
        s.start('Finalizing system...');
        await sleep(1000);
        s.stop(chalk.green('Arch Linux System Ready!'));
        
        p.note('Arch Linux is successfully installed on your device.', 'SUCCESS');
        await sleep(1500);
        return 'MAIN_MENU';

    } catch (error) {
        p.log.error(`Installation Error: ${error.message}`);
        
        if (error.message.includes('failed')) {
             return 'KERNEL_PANIC';
        }
        
        await sleep(2000);
        return 'PLAYGROUND';
    }
}
