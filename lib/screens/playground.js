import * as p from '@clack/prompts';
import chalk from 'chalk';
import { archlogo } from '../ascii.js';
import { centerText, centerBlock, pkg } from '../utils.js';

export async function showPlayground() {
    console.clear();
    console.log(centerBlock(archlogo));
    p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
    p.log.info(centerText(chalk.gray('Sys info: Type "install" to begin system setup.')));
    console.log('');

    while (true) {
        const cmd = await p.text({
            message: chalk.cyan('xterm@install:~$'), 
            placeholder: '',
            validate: (value) => {
                if (!value) return 'Please enter a command';
            }
        });

        if (p.isCancel(cmd)) return 'EXIT';

        const input = cmd.toLowerCase().trim();

        if (input === 'help') {
            p.log.step('Available Commands:');
            console.log(chalk.white('  install  ') + chalk.gray('- Start Real Arch Linux Installation'));
            console.log(chalk.white('  clear    ') + chalk.gray('- Clear screen'));
            console.log(chalk.white('  exit     ') + chalk.gray('- Exit program'));
        } 
        else if (input === 'install') {
            const confirm = await p.confirm({ message: 'This will download ~700MB data. Continue?' });
            if (confirm) {
                return 'INSTALLER';
            }
        }
        else if (input === 'clear') {
            console.clear();
            console.log(centerBlock(archlogo));
            p.log.warn(centerText(chalk.yellow('SYSTEM STATUS: UNINITIALIZED')));
        }
        else if (input === 'panic') {
            return 'KERNEL_PANIC';
        }
        else if (input === 'exit') {
            return 'EXIT';
        }
        else {
            p.log.error(`Command not found: ${input}`);
        }
    }
}
