import * as p from '@clack/prompts';
import chalk from 'chalk';
import { sleep } from '../utils.js';

const DEFAULT_INSTALLER_URL = 'https://raw.githubusercontent.com/Notzeyyyc/XTermLite-Tools/main/install.sh';

export async function runInstaller() {
    console.log('');
    p.note('Auto installer is disabled. Use manual installer via curl.', 'INSTALLER');
    p.note(`curl -L ${DEFAULT_INSTALLER_URL} -o xterm-installer.sh && bash xterm-installer.sh`, 'Manual Install');
    p.note('If curl is not installed: pkg install curl', 'Termux');
    await sleep(1200);
    return 'PLAYGROUND';
}
