import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { archlogo } from '../ascii.js';
import { centerBlock, centerText, sleep } from '../utils.js';

export async function startShell() {
    console.clear();
    
    // Check real environment
    const hasProot = shell.which('proot-distro');
    
    if (hasProot) {
        // Real Shell Execution
        console.log(centerBlock(archlogo));
        p.log.info(centerText(chalk.green('Initializing Arch Linux Environment...')));
        await sleep(800);

        return new Promise((resolve) => {
            // We use 'inherit' to let the shell take over the terminal
            const child = spawn('proot-distro', ['login', 'archlinux'], {
                stdio: 'inherit',
                shell: true
            });

            child.on('close', (code) => {
                // Return to menu when user types 'exit'
                resolve('MAIN_MENU');
            });
        });
    } else {
        // Simulated Shell for Windows/Dev
        console.log(centerBlock(archlogo));
        p.log.info(centerText(chalk.yellow('Win32 Environment Detected. Starting XTermLite Pseudo-Shell...')));
        console.log('');
        
        while (true) {
            const cmd = await p.text({
                message: chalk.green('root@archlinux') + chalk.white(':') + chalk.blue('~') + chalk.white('$'),
                validate: () => {} 
            });

            if (p.isCancel(cmd)) return 'MAIN_MENU';

            const input = (cmd || '').trim();
            
            if (input === 'exit') {
                return 'MAIN_MENU';
            } else if (input === 'clear') {
                console.clear();
                console.log(centerBlock(archlogo));
            } else if (input === 'ls') {
                console.log('bin  etc  home  lib  mnt  opt  proc  root  sbin  tmp  usr  var');
            } else if (input === 'neofetch') {
                console.log(chalk.cyan('      /\\'));
                console.log(chalk.cyan('     /  \\      ') + 'OS: Arch Linux ARM aarch64');
                console.log(chalk.cyan('    / /\\ \\     ') + 'Kernel: 5.10.117-android');
                console.log(chalk.cyan('   / /  \\ \\    ') + 'Shell: zsh 5.9');
                console.log(chalk.cyan('  / /    \\ \\   ') + 'Terminal: xterm-256color');
                console.log(chalk.cyan(' / /  /\\  \\ \\  '));
                console.log(chalk.cyan('/ /__/  \\__\\ \\ '));
            } else if (input !== '') {
                console.log(chalk.red(`zsh: command not found: ${input}`));
            }
        }
    }
}
