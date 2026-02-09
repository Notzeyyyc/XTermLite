import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { centerBlock, centerText, sleep } from '../lib/utils.js';
import { bootAndVerifyDistro, showKernelPanic } from '../lib/screens/kernelpanic.js';

function isValidHttpUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function isTarXzUrl(value) {
    try {
        const url = new URL(String(value || '').trim());
        return url.pathname.toLowerCase().endsWith('.tar.xz');
    } catch {
        return false;
    }
}

async function runCommandWithCode(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, options);
        child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
        child.on('error', () => resolve(1));
    });
}

function getInstalledDistroList() {
    if (!shell.which('proot-distro')) return '';
    return shell.exec('proot-distro list', { silent: true }).stdout || '';
}

function isDistroInstalled(alias) {
    const list = getInstalledDistroList();
    return list.includes(alias) && list.includes('installed');
}

async function validateCustomRootfsUrl(url) {
    const trimmed = String(url || '').trim();
    if (!trimmed) return 'URL cannot be empty';
    if (/\s/.test(trimmed)) return 'URL must not contain spaces';
    if (!isValidHttpUrl(trimmed)) return 'URL must start with http:// or https://';
    if (!isTarXzUrl(trimmed)) return 'URL must end with .tar.xz';
    return undefined;
}

async function preflightUrlReachable(url) {
    const curlPath = shell.which('curl')?.toString();
    if (!curlPath) return true;
    const code = await runCommandWithCode(curlPath, ['-fsIL', String(url).trim()], { stdio: 'ignore', shell: false });
    return code === 0;
}

async function installCustomArchFromUrl({ url, targetAlias, replaceExisting }) {
    const s = p.spinner();

    if (!shell.which('proot-distro')) {
        p.log.error('proot-distro not found. Install it first.');
        return false;
    }

    s.start('Validating URL...');
    const error = await validateCustomRootfsUrl(url);
    if (error) {
        s.stop(chalk.red('Invalid URL.'));
        p.log.error(error);
        return false;
    }

    s.message('Checking URL reachability...');
    const ok = await preflightUrlReachable(url);
    if (!ok) {
        s.stop(chalk.red('URL unreachable.'));
        p.log.error('Unable to access URL (check connection/link).');
        return false;
    }
    s.stop(chalk.green('URL OK.'));

    if (replaceExisting && isDistroInstalled(targetAlias)) {
        const confirm = await p.confirm({
            message: `Distro "${targetAlias}" is already installed. Remove and replace it with the new rootfs?`
        });
        if (!confirm || p.isCancel(confirm)) return false;

        console.log(chalk.gray('--- Transferring control to proot-distro (remove) ---'));
        const removeCode = await runCommandWithCode('proot-distro', ['remove', targetAlias], { stdio: 'inherit', shell: false });
        console.log(chalk.gray('--- proot-distro finished ---'));
        if (removeCode !== 0) {
            p.log.error('Remove failed.');
            return false;
        }
    }

    const args = ['install'];
    if (targetAlias !== 'archlinux') {
        args.push('--override-alias', targetAlias, 'archlinux');
    } else {
        args.push('archlinux');
    }

    console.log(chalk.gray('--- Transferring control to proot-distro (install) ---'));
    const code = await runCommandWithCode('proot-distro', args, {
        stdio: 'inherit',
        shell: false,
        env: { ...process.env, PD_OVERRIDE_TARBALL_URL: String(url).trim() }
    });
    console.log(chalk.gray('--- proot-distro finished ---'));

    if (code !== 0) {
        p.log.error('Install failed.');
        return false;
    }

    return true;
}

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
    const preflight = await bootAndVerifyDistro(distro, { title: `Booting ${distro}` });
    if (!preflight.ok) return await showKernelPanic(preflight.stopCode);

    console.clear();
    p.log.info(chalk.green(`Booting into ${distro}... (Type 'exit' to return)`));
    await sleep(700);
    return new Promise((resolve) => {
        const child = spawn('proot-distro', ['login', distro], { stdio: 'inherit', shell: false });
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
    const preflight = await bootAndVerifyDistro('archlinux', { title: 'Booting archlinux' });
    if (!preflight.ok) return await showKernelPanic(preflight.stopCode);

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
                { value: 'CUSTOM_DISTRO', label: 'custom-distro', hint: 'Install custom rootfs from XTerm-Team or your own RootFS' },
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
                    
                    if (action === 'LOGIN') {
                        const next = await loginDistro(distro);
                        if (typeof next === 'string') return next;
                    }
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
        else if (choice === 'CUSTOM_DISTRO') {
            const url = await p.text({
                message: 'Enter rootfs URL (.tar.xz):',
                placeholder: 'https://.../archlinux-aarch64-pd-vX.Y.Z.tar.xz',
                validate: (val) => validateCustomRootfsUrl(val)
            });

            if (p.isCancel(url)) continue;

            const mode = await p.select({
                message: 'Install mode:',
                options: [
                    { value: 'DEFAULT', label: 'Default (replace archlinux)', hint: 'XTermLite uses this as the main Arch' },
                    { value: 'DUAL', label: 'Dual boot (install alongside)', hint: 'Install as a new alias' },
                    { value: 'BACK', label: chalk.gray('back') }
                ]
            });

            if (p.isCancel(mode) || mode === 'BACK') continue;

            if (mode === 'DEFAULT') {
                const installed = isDistroInstalled('archlinux');
                if (installed) {
                    p.note('This will replace your current Arch Linux installation.', 'Warning');
                }

                const ok = await installCustomArchFromUrl({
                    url,
                    targetAlias: 'archlinux',
                    replaceExisting: true
                });

                if (ok) {
                    p.note('Custom Arch installed as the default.', 'Success');
                    const reboot = await p.confirm({ message: 'Reboot XTermLite now?' });
                    if (reboot && !p.isCancel(reboot)) return 'BOOT';
                }
            } else if (mode === 'DUAL') {
                const alias = await p.text({
                    message: 'Alias name for the new distro:',
                    placeholder: 'archlinux-alt',
                    validate: (val) => {
                        const v = String(val || '').trim();
                        if (!v) return 'Alias cannot be empty';
                        if (!/^[a-z0-9][a-z0-9._-]*$/.test(v)) return 'Invalid alias';
                        if (v === 'archlinux') return 'Use Default mode for alias "archlinux"';
                    }
                });

                if (p.isCancel(alias)) continue;

                if (isDistroInstalled(String(alias).trim())) {
                    p.log.error(`Alias "${String(alias).trim()}" is already installed.`);
                    continue;
                }

                const ok = await installCustomArchFromUrl({
                    url,
                    targetAlias: String(alias).trim(),
                    replaceExisting: false
                });

                if (ok) {
                    p.note(`Custom Arch installed as "${String(alias).trim()}".`, 'Success');
                    const reboot = await p.confirm({ message: 'Reboot XTermLite now?' });
                    if (reboot && !p.isCancel(reboot)) return 'BOOT';
                }
            }
        }
        else if (choice === 'SETUP_STORAGE') {
            const s = p.spinner();
            await setupStorage(s);
        }
        else if (choice === 'MOUNT_SESSION') {
             const next = await mountStorageSession();
             if (typeof next === 'string') return next;
        }
        else if (choice === 'WIFI_FIX') {
            const preflight = await bootAndVerifyDistro('archlinux', { title: 'Booting archlinux' });
            if (!preflight.ok) return await showKernelPanic(preflight.stopCode);

            const s = p.spinner();
            s.start('Fixing DNS...');
            const fixCmd = `echo "nameserver 8.8.8.8" > /etc/resolv.conf`;
            spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', fixCmd], { stdio: 'ignore' });
            await sleep(1000);
            s.stop('DNS reset to Google DNS (8.8.8.8).');
        }
    }
}
