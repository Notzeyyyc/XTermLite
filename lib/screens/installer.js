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
        
        // Optional: you can stream output to spinner if you want verbose logs
        // child.stdout.on('data', (data) => {
        //    spinner.message(chalk.dim(data.toString().trim()));
        // });

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
        // This process takes a long time and needs internet. 
        // We use 'inherit' for stdio if we want the user to see progress bar from proot-distro, 
        // but that breaks the spinner UI. 
        // proot-distro doesn't have a JSON output compliant mode easily.
        // We'll trust the process and just show a spinner. 
        // OR better: we pause the spinner and let proot-distro take over console for download bar.
        
        s.stop('Preparing to download Arch Linux image...');
        console.log(chalk.gray('--- Transferring control to proot-distro ---'));
        
        await new Promise((resolve, reject) => {
            // --override to reinstall if exists (or maybe check first?)
            // We assume clean install or reinstall
            const child = spawn('proot-distro', ['install', 'archlinux'], { stdio: 'inherit' });
            child.on('close', (code) => {
                if (code === 0) resolve();
                else reject(new Error('proot-distro install failed'));
            });
        });

        console.log(chalk.gray('--- Installation process completed ---'));
        console.log('');

        // 3. Configure Autostart
        await configureZshrc(s);

        // 4. Finalize
        s.start('Finalizing system...');
        await sleep(1000);
        s.stop(chalk.green('Arch Linux System Ready!'));
        
        p.note('Arch Linux is successfully installed on your device.', 'SUCCESS');
        await sleep(1500);
        return 'MAIN_MENU';

    } catch (error) {
        p.log.error(`Installation Error: ${error.message}`);
        
        // Simulating error handling for fallback or panic
        if (error.message.includes('failed')) {
             return 'KERNEL_PANIC';
        }
        
        await sleep(2000);
        return 'PLAYGROUND';
    }
}
