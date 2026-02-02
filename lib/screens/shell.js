import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { getLogo } from '../ascii.js';
import { centerBlock, centerText, sleep } from '../utils.js';
import { loadSettings } from '../config.js';
import { getTheme } from '../themes.js';

export async function startShell() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    console.clear();
    
    // Check real environment
    const prootPath = shell.which('proot-distro')?.toString();
    
    if (prootPath) {
        // Real Shell Execution
        console.log(centerBlock(getLogo()));
        p.log.info(centerText(theme.primary('Initializing Arch Linux Environment...')));
        await sleep(800);

        const mode = await p.select({
            message: theme.primary('Select Shell Mode:'),
            options: [
                { value: 'NORMAL', label: 'Normal Arch Terminal', hint: 'Default proot-distro login' },
                { value: 'WM', label: 'XTerminal | Modded terminal by XTermLite', hint: 'Split pane + keybind (no VNC)' },
                { value: 'BACK', label: 'Back to Main Menu' }
            ]
        });

        if (p.isCancel(mode) || mode === 'BACK') return 'MAIN_MENU';

        return new Promise((resolve) => {
            let child;

            if (mode === 'WM') {
                p.note(
                    [
                        'Prefix: Ctrl+b (fallback) / Ctrl+a',
                        'Split horizontal: prefix then |',
                        'Split vertical: prefix then -',
                        'Move pane: prefix then h/j/k/l',
                        'Close pane: prefix then x',
                        'Detach: prefix then d'
                    ].join('\n'),
                    'XTerminal'
                );

                const tmuxScript = `
                    set -e
                    if ! command -v tmux >/dev/null 2>&1; then
                        pacman -S --noconfirm tmux
                    fi

                    cat > "$HOME/.tmux.conf" <<'EOF'
set -g prefix C-b
set -g prefix2 C-a
set -g history-limit 20000
setw -g mode-keys vi
set -g status-interval 2

bind | split-window -h
bind - split-window -v

bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

bind r source-file ~/.tmux.conf \\; display-message "reloaded"
EOF

                    tmux start-server
                    tmux source-file "$HOME/.tmux.conf" >/dev/null 2>&1 || true
                    tmux new-session -A -s xtermshell
                `.replace(/^\s+/gm, '').trim();

                child = spawn(prootPath, ['login', 'archlinux', '--', 'bash', '-lc', tmuxScript], {
                    stdio: 'inherit',
                    shell: false
                });
            } else {
                child = spawn(prootPath, ['login', 'archlinux'], {
                    stdio: 'inherit',
                    shell: false
                });
            }

            child.on('close', (code) => {
                // Return to menu when user types 'exit'
                if (code && code !== 0) {
                    p.log.error(`Failed to start Arch shell (exit code: ${code}).`);
                }
                resolve('MAIN_MENU');
            });
            child.on('error', () => {
                p.log.error('Failed to start Arch shell process.');
                resolve('MAIN_MENU');
            });
        });
    } else {
        // Simulated Shell for Windows/Dev
        console.log(centerBlock(getLogo()));
        p.log.info(centerText(theme.primary('Win32 Environment Detected. Starting XTermLite Pseudo-Shell...')));
        console.log('');
        
        while (true) {
            const cmd = await p.text({
                message: theme.primary('root@archlinux') + chalk.white(':') + theme.secondary('~') + chalk.white('$'),
                validate: () => {} 
            });

            if (p.isCancel(cmd)) return 'MAIN_MENU';

            const input = (cmd || '').trim();
            
            if (input === 'exit') {
                return 'MAIN_MENU';
            } else if (input === 'clear') {
                console.clear();
                console.log(centerBlock(getLogo()));
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
