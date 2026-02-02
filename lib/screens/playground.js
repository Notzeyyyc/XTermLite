import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, pkg, sleep } from '../utils.js';
import { isArchInstalled } from '../system.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';

async function installPackage(packageName, spinner) {
    spinner.start(`Process: ${packageName}...`);

    if (packageName === 'ohhmyzsh' || packageName === 'oh-my-zsh') {
        spinner.message('Installing ZSH & Dependencies...');
        
        const installCmd = `
        pacman -S --noconfirm zsh git curl
        if [ ! -d "/root/.oh-my-zsh" ]; then
            sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended
        fi
        
        # Inject XTermLite config into .zshrc if not present
        if ! grep -q "XTERM_LITE_INJECT" /root/.zshrc; then
            echo '
# --- XTERM_LITE_INJECT START ---
export PROMPT="%F{cyan}[ root@arch-term ]~# %f"
clear
neofetch
# --- XTERM_LITE_INJECT END ---
            ' >> /root/.zshrc
        fi
        
        chsh -s $(which zsh)
        `;

        return new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'bash', '-c', installCmd], { stdio: 'ignore' });
            
            child.on('close', (code) => {
                if (code === 0) {
                    spinner.stop('Oh My Zsh installed & configured successfully.');
                } else {
                    spinner.stop(chalk.red('Failed to install Oh My Zsh.'));
                }
                resolve();
            });
        });
    } else {
        // Generic Package Installation via Pacman
        spinner.message(`Downloading & Installing ${packageName}...`);
        
        return new Promise((resolve) => {
            const child = spawn('proot-distro', ['login', 'archlinux', '--', 'pacman', '-S', '--noconfirm', packageName], { stdio: 'ignore' });
            
            child.on('close', (code) => {
                if (code === 0) {
                    spinner.stop(chalk.green(`Package '${packageName}' installed successfully.`));
                } else {
                    spinner.stop(chalk.red(`Failed to install '${packageName}' (Package not found or network error).`));
                }
                resolve();
            });
        });
    }
}

export async function showPlayground() {
    const installed = isArchInstalled();
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    
    console.clear();
    console.log(centerBlock(getLogo()));

    if (installed) {
        p.log.success(centerText(chalk.green('SYSTEM STATUS: ONLINE (ARCH LINUX)')));
        p.log.info(centerText(chalk.gray('Manager Mode. Type "help" for commands.')));
    } else {
        p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
        p.log.info(centerText(chalk.gray('Sys info: Type "install" to begin system setup.')));
    }
    console.log('');

    while (true) {
        const promptLabel = installed ? chalk.cyan('xterm@manager:~$') : chalk.cyan('xterm@install:~$');

        const cmd = await p.text({
            message: theme.primary(promptLabel),
            placeholder: '',
            validate: (value) => {
                if (!value) return 'Please enter a command';
            }
        });

        if (p.isCancel(cmd)) return installed ? 'MAIN_MENU' : 'EXIT';

        const input = cmd.trim();
        const args = input.split(' ');
        const mainCmd = args[0].toLowerCase();

        if (mainCmd === 'help') {
            p.log.step('Available Commands:');
            if (installed) {
                 console.log(chalk.white('  xterm -i <pkg> ') + chalk.gray('- Install package (e.g., ohhmyzsh)'));
                 console.log(chalk.white('  reinstall      ') + chalk.gray('- Wipe & Reinstall System'));
                 console.log(chalk.white('  back           ') + chalk.gray('- Return to Main Menu'));
            } else {
                 console.log(chalk.white('  install        ') + chalk.gray('- Start Arch Linux Installation'));
            }
            console.log(chalk.white('  clear          ') + chalk.gray('- Clear screen'));
            console.log(chalk.white('  exit           ') + chalk.gray('- Exit program'));
        } 
        else if (mainCmd === 'install' && !installed) {
            const confirm = await p.confirm({ message: 'This will download ~700MB data. Continue?' });
            if (confirm) return 'INSTALLER';
        }
        else if (mainCmd === 'reinstall' && installed) {
            p.log.warn(chalk.red('WARNING: This will DELETE your current Arch system and all data inside it.'));
            const confirm = await p.confirm({ message: 'Are you sure you want to proceed with Re-installation?' });
            
            if (confirm) {
                const s = p.spinner();
                s.start('Removing current installation...');
                
                await new Promise((resolve) => {
                     const child = spawn('proot-distro', ['remove', 'archlinux'], { stdio: 'ignore' });
                     child.on('close', () => resolve());
                });
                
                s.stop(chalk.green('System Removed. Starting fresh install...'));
                await sleep(1000);
                return 'INSTALLER';
            }
        }
        else if (mainCmd === 'xterm' && installed) {
            if (args[1] === '-i' && args[2]) {
                const s = p.spinner();
                await installPackage(args[2], s);
            } else {
                p.log.error('Usage: xterm -i <package_name>');
            }
        }
        else if (mainCmd === 'back' && installed) {
            return 'MAIN_MENU';
        }
        else if (mainCmd === 'clear') {
            console.clear();
            console.log(centerBlock(getLogo()));
            if (installed) {
                p.log.success(centerText(chalk.green('SYSTEM STATUS: ONLINE (ARCH LINUX)')));
            } else {
                p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
            }
        }
        else if (mainCmd === 'panic') {
            return 'KERNEL_PANIC';
        }
        else if (mainCmd === 'exit') {
            return 'EXIT';
        }
        else {
            p.log.error(`Command not found: ${input}`);
        }
    }
}
