import * as p from '@clack/prompts';
import chalk from 'chalk';
import { spawn } from 'child_process';
import shell from 'shelljs';
import { getLogo } from '../ascii.js';
import { centerBlock, centerText, sleep } from '../utils.js';
import { loadSettings, saveSettings } from '../config.js';
import { getTheme, getTmuxTheme } from '../themes.js';

export async function startShell() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    const tmuxTheme = getTmuxTheme(settings.theme);
    console.clear();
    
    const prootPath = shell.which('proot-distro')?.toString();
    
    if (prootPath) {
        console.log(centerBlock(getLogo()));
        p.log.info(centerText(theme.primary('Initializing Arch Linux Environment...')));
        await sleep(800);

        const isValidUsername = (value) => /^[a-z_][a-z0-9_-]*$/.test(String(value || ''));

        const runInArch = (command, stdio = 'ignore') => new Promise((resolve) => {
            const child = spawn(prootPath, ['login', 'archlinux', '--', 'bash', '-lc', command], { stdio, shell: false });
            child.on('close', (code) => resolve(code === 0));
            child.on('error', () => resolve(false));
        });

        const ensureArchUser = async (username) => {
            if (!username || username === 'root') return true;
            const s = p.spinner();
            s.start(`Preparing user "${username}"...`);

            const setupCmd = `
                set -e
                pacman -S --noconfirm sudo
                mkdir -p /etc/sudoers.d
                if [ ! -f /etc/sudoers.d/99-wheel ]; then
                    echo '%wheel ALL=(ALL:ALL) ALL' > /etc/sudoers.d/99-wheel
                    chmod 0440 /etc/sudoers.d/99-wheel
                fi
                if ! id "${username}" >/dev/null 2>&1; then
                    useradd -m -G wheel "${username}"
                    echo "${username}:1234" | chpasswd
                else
                    usermod -aG wheel "${username}" || true
                fi
            `.replace(/^\s+/gm, '').trim();

            const ok = await runInArch(setupCmd);
            s.stop(ok ? chalk.green('User ready.') : chalk.red('Failed to prepare user.'));
            await sleep(400);
            return ok;
        };

        const loginChoiceOptions = [];
        if (settings.username && isValidUsername(settings.username)) {
            loginChoiceOptions.push({ value: 'SAVED', label: `${settings.username}`, hint: 'Non-root (recommended)' });
        }
        loginChoiceOptions.push({ value: 'ROOT', label: 'root', hint: 'Full privileges' });
        loginChoiceOptions.push({ value: 'User', label: 'Create / Use another user', hint: 'Non-root session' });
        loginChoiceOptions.push({ value: 'BACK', label: 'Back to Main Menu' });

        const loginChoice = await p.select({
            message: theme.primary('Login as:'),
            options: loginChoiceOptions
        });

        if (p.isCancel(loginChoice) || loginChoice === 'BACK') return 'MAIN_MENU';

        let username = 'root';
        if (loginChoice === 'SAVED') username = settings.username;
        if (loginChoice === 'NEW') {
            const nextUsername = await p.text({
                message: 'Enter username:',
                placeholder: 'e.g. xtermuser',
                validate: (val) => {
                    if (!val) return 'Username cannot be empty';
                    if (!isValidUsername(val)) return 'Invalid username format';
                }
            });
            if (p.isCancel(nextUsername)) return 'MAIN_MENU';
            username = String(nextUsername).trim();
            settings.username = username;
            saveSettings(settings);
        }

        if (!(await ensureArchUser(username))) return 'MAIN_MENU';

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
                        `Login: ${username}`,
                        'Prefix: Ctrl+b (fallback) / Ctrl+a',
                        'Split horizontal: prefix then |',
                        'Split vertical: prefix then -',
                        'Move pane: prefix then h/j/k/l',
                        'Close pane: prefix then x',
                        'Detach: prefix then d'
                    ].join('\n'),
                    'XTerminal'
                );

                const tmuxConf = `
set -g prefix C-b
set -g prefix2 C-a
set -g history-limit 20000
setw -g mode-keys vi
set -g status-interval 2
set -g status on
set -g status-position bottom
set -g status-justify left
set -g status-style "bg=${tmuxTheme.statusBg},fg=${tmuxTheme.statusFg}"
set -g message-style "bg=${tmuxTheme.messageBg},fg=${tmuxTheme.messageFg}"
set -g message-command-style "bg=${tmuxTheme.messageBg},fg=${tmuxTheme.messageFg}"
set -g pane-border-style "fg=${tmuxTheme.paneBorder}"
set -g pane-active-border-style "fg=${tmuxTheme.paneActiveBorder}"
set -g clock-mode-colour ${tmuxTheme.accent}

set -g status-left-length 60
set -g status-right-length 120
set -g status-left "#[fg=${tmuxTheme.accent},bold] XTermLite #[fg=${tmuxTheme.muted}]│#[fg=${tmuxTheme.secondary}] #S #[fg=${tmuxTheme.muted}]│#[fg=${tmuxTheme.windowFg}] #(whoami)@#H "
set -g status-right "#[fg=${tmuxTheme.windowFg}]%Y-%m-%d #[fg=${tmuxTheme.muted}]│#[fg=${tmuxTheme.statusFg}] %H:%M "

setw -g window-status-separator "  "
setw -g window-status-style "bg=${tmuxTheme.statusBg},fg=${tmuxTheme.windowFg}"
setw -g window-status-current-style "bg=${tmuxTheme.statusBg},fg=${tmuxTheme.windowActiveFg},bold"
setw -g window-status-format "#[fg=${tmuxTheme.windowFg}]#I:#W"
setw -g window-status-current-format "#[fg=${tmuxTheme.windowActiveFg},bold]#I:#W"

set -g mode-style "bg=${tmuxTheme.modeBg},fg=${tmuxTheme.modeFg}"
set -g display-panes-colour ${tmuxTheme.accent}
set -g display-panes-active-colour ${tmuxTheme.secondary}

bind | split-window -h
bind - split-window -v

bind h select-pane -L
bind j select-pane -D
bind k select-pane -U
bind l select-pane -R

bind r source-file ~/.tmux.conf \\; display-message "reloaded"
                `.trim();

                const tmuxScript = `
                    set -e
                    if ! command -v tmux >/dev/null 2>&1; then
                        pacman -S --noconfirm tmux
                    fi

                    if [ "${username}" = "root" ]; then
                        cat > "$HOME/.tmux.conf" <<'EOF'
${tmuxConf}
EOF
                        tmux start-server
                        tmux source-file "$HOME/.tmux.conf" >/dev/null 2>&1 || true
                        tmux new-session -A -s xtermshell
                    else
                        cat > /tmp/xtermlite_tmux_user.sh <<'EOS'
set -e
cat > "$HOME/.tmux.conf" <<'EOF'
${tmuxConf}
EOF
tmux start-server
tmux source-file "$HOME/.tmux.conf" >/dev/null 2>&1 || true
tmux new-session -A -s xtermshell
EOS
                        chmod 755 /tmp/xtermlite_tmux_user.sh
                        exec sudo -iu "${username}" bash /tmp/xtermlite_tmux_user.sh
                    fi
                `.replace(/^\s+/gm, '').trim();

                child = spawn(prootPath, ['login', 'archlinux', '--', 'bash', '-lc', tmuxScript], {
                    stdio: 'inherit',
                    shell: false
                });
            } else {
                if (username === 'root') {
                    child = spawn(prootPath, ['login', 'archlinux'], {
                        stdio: 'inherit',
                        shell: false
                    });
                } else {
                    child = spawn(prootPath, ['login', 'archlinux', '--', 'bash', '-lc', `exec sudo -iu "${username}"`], {
                        stdio: 'inherit',
                        shell: false
                    });
                }
            }

            child.on('close', (code) => {
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
