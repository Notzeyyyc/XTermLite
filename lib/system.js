import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { sleep } from './utils.js';

export function isArchInstalled() {
    if (process.platform === 'win32') return false; 
    const check = shell.exec('proot-distro list', { silent: true });
    return check.stdout.includes('arch') && check.stdout.includes('Installed');
}

export async function configureZshrc(spinner) {
    spinner.start('Configuring shell autostart (.zshrc)...');
    try {
        const zshrcPath = path.join(os.homedir(), '.zshrc');
        // We pass the index.js path. process.cwd() is used assuming it's run from root. 
        // Or we can use import.meta.url resolution if needed, but cwd is standard for CLI apps.
        const appPath = process.cwd().replace(/\\/g, '/'); 
        const autostartBlock = `
# XTERM-OS AUTOSTART
if [ -z "$XTERM_SESSION" ]; then
    export XTERM_SESSION=1
    echo "Booting XTerm-OS..."
    node "${appPath}/index.js"
fi
`;
        fs.appendFileSync(zshrcPath, autostartBlock);
        await sleep(1000);
        spinner.stop('Shell autostart enabled in .zshrc.');
        return true;
    } catch (err) {
        await sleep(1000);
        spinner.stop(chalk.red(`Failed to update .zshrc: ${err.message}`));
        return false;
    }
}
