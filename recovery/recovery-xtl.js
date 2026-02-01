import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { archlogo } from '../lib/ascii.js';
import { centerBlock, centerText, sleep } from '../lib/utils.js';

async function installDistro(distro, spinner) {
    spinner.start(`Installing ${distro}...`);
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['install', distro], { stdio: 'inherit' });
        child.on('close', (code) => {
            if(code === 0) spinner.stop(`${distro} Installed!`);
            else spinner.stop(chalk.red('Installation failed.'));
            resolve();
        });
    });
}

async function loginDistro(distro) {
    console.clear();
    p.log.info(chalk.green(`Booting into ${distro}... (Type 'exit' to return)`));
    await sleep(1000);
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', distro], { stdio: 'inherit', shell: true });
        child.on('close', () => resolve());
    });
}

async function setupStorage(spinner) {
    spinner.start('Requesting Android Storage Permissions...');
    // Just run termux-setup-storage to trigger the popup
    await new Promise(r => {
        const child = spawn('termux-setup-storage', [], { stdio: 'ignore' });
        setTimeout(r, 3000); 
    });
    spinner.stop('Permission prompt triggered.');
    p.note('Please "Allow" storage access if prompted.', 'Android Permission');
}

async function mountStorageSession() {
    console.clear();
    // Use the raw path /storage/emulated/0 instead of /sdcard symlink for reliability
    const androidStorage = '/storage/emulated/0';
    
    p.log.info(chalk.yellow(`Mounting ${androidStorage} -> /sdcard inside Arch...`));
    await sleep(1000);
    
    return new Promise((resolve) => {
        // We bind to /sdcard in guest.
        const child = spawn('proot-distro', ['login', 'archlinux', '--bind', `${androidStorage}:/sdcard`], { stdio: 'inherit', shell: true });
        child.on('close', () => resolve());
    });
}

export async function showAdvancedRecovery() {
    console.clear();
    const header = `
  __  __ _____ __    
  \\ \\/ /|_   _|  |   
   >  <   | | |  |__ 
  /_/\\_\\  |_| |_____|
    `;
    
    console.log(centerBlock(chalk.magenta.bold(header)));
    console.log(centerText(chalk.bgMagenta.black.bold(' ADVANCED POWER TOOLS ')));
    console.log('');

    while (true) {
        const choice = await p.select({
            message: chalk.magenta('Available Tools:'),
            options: [
                { value: 'MULTI_DISTRO', label: 'distro-manager', hint: 'Install Ubuntu, Kali, etc.' },
                { value: 'SETUP_STORAGE', label: 'grant-storage', hint: 'Request Android Storage Permission' },
                { value: 'MOUNT_SESSION', label: 'mount-session', hint: 'Login with internal storage access' },
                { value: 'WIFI_FIX', label: 'net-fix', hint: 'Reset DNS configuration' },
                { value: 'EXIT', label: chalk.gray('back'), hint: 'Return to Main Menu' },
            ],
        });

        if (p.isCancel(choice) || choice === 'EXIT') return 'MAIN_MENU';

        if (choice === 'MULTI_DISTRO') {
            const distro = await p.select({
                message: 'Select Distribution:',
                options: [
                    { value: 'ubuntu', label: 'Ubuntu LTS' },
                    { value: 'debian', label: 'Debian Stable' },
                    { value: 'kali', label: 'Kali Linux' },
                    { value: 'alpine', label: 'Alpine Linux' },
                    { value: 'fedora', label: 'Fedora Workstation' },
                    { value: 'BACK', label: chalk.gray('back') }
                ]
            });

            if (distro !== 'BACK' && !p.isCancel(distro)) {
                // Check if installed
                const list = shell.exec('proot-distro list', { silent: true }).stdout;
                if (list.includes(distro) && list.includes('installed')) {
                    const action = await p.select({
                        message: `${distro} detected. Action?`,
                        options: [
                            { value: 'LOGIN', label: 'Login' },
                            { value: 'REMOVE', label: 'Remove' }
                        ]
                    });
                    
                    if (action === 'LOGIN') await loginDistro(distro);
                    if (action === 'REMOVE') {
                        const s = p.spinner();
                        s.start(`Removing ${distro}...`);
                        shell.exec(`proot-distro remove ${distro}`, { silent: true });
                        s.stop(`${distro} removed.`);
                    }
                } else {
                    const confirm = await p.confirm({ message: `Install ${distro}?` });
                    if (confirm) {
                        const s = p.spinner();
                        await installDistro(distro, s);
                    }
                }
            }
        }
        else if (choice === 'SETUP_STORAGE') {
            const s = p.spinner();
            await setupStorage(s);
        }
        else if (choice === 'MOUNT_SESSION') {
             await mountStorageSession();
        }
        else if (choice === 'WIFI_FIX') {
            const s = p.spinner();
            s.start('Fixing DNS...');
            const fixCmd = `echo "nameserver 8.8.8.8" > /etc/resolv.conf`;
            spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', fixCmd], { stdio: 'ignore' });
            await sleep(1000);
            s.stop('DNS reset to Google DNS (8.8.8.8).');
        }
    }
}
