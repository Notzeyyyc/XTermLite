import * as p from '@clack/prompts';
import chalk from 'chalk';
import { archlogo } from '../ascii.js';
import { centerText, centerBlock, sleep, stripAnsi } from '../utils.js';

export async function showKernelPanic(errorMsg = 'CRITICAL_PROCESS_DIED') {
    console.clear();
    
    // Force another clear for persistent buffers
    process.stdout.write('\x1Bc'); 

    // 1. Red Logo
    // Get clean logo chars and make them red
    const cleanLogo = stripAnsi(archlogo);
    const redLogo = cleanLogo.split('\n')
        .map(line => line ? chalk.red(line) : line)
        .join('\n');
    
    console.log(centerBlock(redLogo));
    
    // 2. ASCII Text "KERNEL PANIC"
    const panicAscii = `
  _  ________ _____  _   _ ______ _      
 | |/ /  ____|  __ \\| \\ | |  ____| |     
 | ' /| |__  | |__) |  \\| | |__  | |     
 |  < |  __| |  _  /| . \` |  __| | |     
 | . \\| |____| | \\ \\| |\\  | |____| |____ 
 |_|\\_\\______|_|  \\_\\_| \\_|______|______|
    `;

    console.log(centerBlock(chalk.red.bold(panicAscii)));
    
    console.log('\n');
    console.log(centerText(chalk.bgRed.black.bold(' SYSTEM FAILURE DETECTED ')));
    console.log('\n');
    
    console.log(centerText(chalk.red(`STOP CODE: ${errorMsg}`)));
    console.log(centerText(chalk.gray('Collecting system info... 100%')));
    console.log(centerText(chalk.yellow('Rebooting...')));

    await sleep(5000);
    
    return 'BOOT';
}
