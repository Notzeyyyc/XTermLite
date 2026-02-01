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

async function symlinkStorage(spinner) {
    spinner.start('Setting up Storage Access...');
    if (!shell.test('-d', '~/storage')) {
        await new Promise(r => {
            const child = spawn('termux-setup-storage', [], { stdio: 'ignore' });
            p.log.warn('Please allow storage permission on the popup!');
            setTimeout(r, 5000); 
        });
    }
    spinner.stop('Storage permissions requested.');
    p.note('To access SD Card inside Arch, use the "mount-session" option.', 'Storage Bind');
}

async function mountStorageSession() {
    console.clear();
    p.log.info(chalk.yellow('Starting Arch Linux with /sdcard mounted at /sdcard...'));
    await sleep(1000);
    
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', 'archlinux', '--bind', '/sdcard:/sdcard'], { stdio: 'inherit', shell: true });
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
                { value: 'STORAGE_BIND', label: 'storage-setup', hint: 'Initialize Termux storage access' },
                { value: 'MOUNT_SESSION', label: 'mount-session', hint: 'Login with /sdcard access' },
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
        else if (choice === 'STORAGE_BIND') {
            const s = p.spinner();
            await symlinkStorage(s);
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
