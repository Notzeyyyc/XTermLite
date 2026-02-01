import shell from 'shelljs';
import fs from 'fs';
import path from 'path';
import os from 'os';
import chalk from 'chalk';
import { sleep, stripAnsi } from './utils.js';

export function isArchInstalled() {
    if (process.platform === 'win32') {
        // Dev mode override: check for a local flag file to simulate installed state checks
        if (fs.existsSync(path.resolve('.mock_installed'))) return true;
        return false;
    };
    
    // Check if proot-distro exists first
    if (!shell.which('proot-distro')) return false;

    const check = shell.exec('proot-distro list', { silent: true });
    
    // proot-distro output: "archlinux (installed)" or similar. 
    // We strip ansi to be safe and lowercase it.
    const cleanOutput = stripAnsi(check.stdout).toLowerCase();
    
    // Check specifically for archlinux being installed
    // Matches: "archlinux (installed)" or "* archlinux" (depending on version/display)
    // Safer to check if 'archlinux' appears and 'installed' triggers within the context
    // or we can run a dummy exec
    if (cleanOutput.includes('archlinux') && cleanOutput.includes('installed')) {
        return true;
    }

    // Fallback: Try to execute a simple command inside archlinux
    const testExec = shell.exec('proot-distro login archlinux -- true', { silent: true });
    return testExec.code === 0;
}

export async function configureZshrc(spinner) {
    spinner.start('Configuring shell autostart (.zshrc)...');
    try {
        const zshrcPath = path.join(os.homedir(), '.zshrc');
        // We pass the index.js path. process.cwd() is used assuming it's run from root. 
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
