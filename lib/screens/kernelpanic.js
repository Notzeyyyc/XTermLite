import * as p from '@clack/prompts';
import chalk from 'chalk';
import shell from 'shelljs';
import { spawn } from 'child_process';
import { getLogo } from '../ascii.js';
import { centerText, centerBlock, sleep, stripAnsi } from '../utils.js';

let cachedRawLogo = null;
let cachedCleanLogo = null;

function colorizeLogo(colorFn, logo) {
    const rawLogo = logo || getLogo();
    if (rawLogo !== cachedRawLogo) {
        cachedRawLogo = rawLogo;
        cachedCleanLogo = stripAnsi(rawLogo);
    }
    return (cachedCleanLogo || '')
        .split('\n')
        .map((line) => (line ? colorFn(line) : line))
        .join('\n');
}

function distroLooksInstalled(distro) {
    if (!shell.which('proot-distro')) return false;
    const out = stripAnsi(shell.exec('proot-distro list', { silent: true }).stdout || '').toLowerCase();
    const alias = String(distro || '').trim().toLowerCase();
    return out.includes(alias) && out.includes('installed');
}

async function runWithExitCode(command, args, options = {}) {
    return new Promise((resolve) => {
        const child = spawn(command, args, options);
        child.on('close', (code) => resolve(typeof code === 'number' ? code : 1));
        child.on('error', () => resolve(1));
    });
}

function progressBar(percent, width = 28) {
    const p = Math.max(0, Math.min(100, Number(percent) || 0));
    const filled = Math.round((p / 100) * width);
    const empty = Math.max(0, width - filled);
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${String(p).padStart(3, ' ')}%`;
}

function stepIcon(status) {
    if (status === 'ok') return chalk.green('✓');
    if (status === 'fail') return chalk.red('✗');
    if (status === 'running') return chalk.cyan('›');
    return chalk.gray('·');
}

function renderBootChecklist({ title, subtitle, steps, statuses, activeIndex, logo }) {
    console.clear();
    process.stdout.write('\x1Bc');

    console.log(centerBlock(colorizeLogo(chalk.cyan, logo)));
    console.log('');
    console.log(centerText(chalk.cyanBright.bold(`XTermLite : ${title}`)));
    console.log(centerText(chalk.gray(subtitle || 'Initializing...')));
    console.log('');

    const total = steps.length || 1;
    const done = statuses.filter((s) => s === 'ok').length;
    const failed = statuses.some((s) => s === 'fail');
    const pct = failed ? Math.floor((Math.max(0, activeIndex) / total) * 100) : Math.floor((done / total) * 100);

    console.log(centerText(chalk.gray(progressBar(pct))));
    console.log('');

    for (let i = 0; i < steps.length; i += 1) {
        const status = statuses[i] || 'pending';
        const icon = stepIcon(i === activeIndex ? 'running' : status);
        const label = steps[i]?.label || '';
        const line = `${icon} ${label}`;
        console.log(centerText(status === 'fail' ? chalk.red(line) : status === 'ok' ? chalk.green(line) : chalk.gray(line)));
    }

    console.log('');
}

export async function bootAndVerifyDistro(distro, options = {}) {
    const alias = String(distro || '').trim() || 'unknown';
    const title = String(options.title || `Booting ${alias}`);
    const logo = getLogo({ distro: alias });

    const steps = [
        { id: 'host', label: 'Host dependencies' },
        { id: 'installed', label: `Distro "${alias}" installed` },
        { id: 'integrity', label: 'Rootfs integrity' },
        { id: 'system', label: 'System files' }
    ];

    if (alias === 'archlinux') steps.push({ id: 'pkg', label: 'Package manager (pacman)' });

    const statuses = steps.map(() => 'pending');

    const mark = (index, status) => {
        statuses[index] = status;
        renderBootChecklist({
            title,
            subtitle: status === 'fail' ? 'Boot check failed.' : 'Running boot checks...',
            steps,
            statuses,
            activeIndex: index,
            logo
        });
    };

    const simulate = Boolean(options.simulate) || process.platform === 'win32';
    const simulateFailAt = options.simulateFailAt;
    const simulateFailIndex =
        typeof simulateFailAt === 'number'
            ? simulateFailAt
            : typeof simulateFailAt === 'string'
                ? steps.findIndex((s) => s.id === simulateFailAt)
                : -1;

    for (let i = 0; i < steps.length; i += 1) {
        mark(i, statuses[i]);
        await sleep(simulate ? 220 : 120);

        if (simulate && simulateFailIndex === i) {
            statuses[i] = 'fail';
            renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
            const stopCodeById = {
                host: 'HOST_DEPENDENCY_MISSING',
                installed: 'DISTRO_NOT_INSTALLED',
                integrity: `DISTRO_CORRUPTED:${alias}`,
                system: `SYSTEM_FILES_MISSING:${alias}`,
                pkg: `PACKAGE_MANAGER_MISSING:${alias}`
            };
            return { ok: false, stopCode: stopCodeById[steps[i].id] || 'BOOT_CHECK_FAILED' };
        }

        if (simulate) {
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }

        const stepId = steps[i].id;
        if (stepId === 'host') {
            if (!shell.which('proot-distro')) {
                statuses[i] = 'fail';
                renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
                return { ok: false, stopCode: 'HOST_DEPENDENCY_MISSING' };
            }
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }

        if (stepId === 'installed') {
            const installed = distroLooksInstalled(alias);
            if (!installed) {
                statuses[i] = 'fail';
                renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
                return { ok: false, stopCode: 'DISTRO_NOT_INSTALLED' };
            }
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }

        if (stepId === 'integrity') {
            const code = await runWithExitCode('proot-distro', ['login', alias, '--', 'true'], { stdio: 'ignore', shell: false });
            if (code !== 0) {
                statuses[i] = 'fail';
                renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
                return { ok: false, stopCode: `DISTRO_CORRUPTED:${alias}` };
            }
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }

        if (stepId === 'system') {
            const osRelease = await runWithExitCode(
                'proot-distro',
                ['login', alias, '--', 'sh', '-lc', 'test -r /etc/os-release'],
                { stdio: 'ignore', shell: false }
            );
            if (osRelease !== 0) {
                statuses[i] = 'fail';
                renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
                return { ok: false, stopCode: `SYSTEM_FILES_MISSING:${alias}` };
            }
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }

        if (stepId === 'pkg') {
            const pacman = await runWithExitCode(
                'proot-distro',
                ['login', alias, '--', 'sh', '-lc', 'command -v pacman >/dev/null 2>&1'],
                { stdio: 'ignore', shell: false }
            );
            if (pacman !== 0) {
                statuses[i] = 'fail';
                renderBootChecklist({ title, subtitle: 'Boot check failed.', steps, statuses, activeIndex: i, logo });
                return { ok: false, stopCode: `PACKAGE_MANAGER_MISSING:${alias}` };
            }
            statuses[i] = 'ok';
            renderBootChecklist({ title, subtitle: 'Running boot checks...', steps, statuses, activeIndex: i, logo });
            continue;
        }
    }

    renderBootChecklist({ title, subtitle: 'Boot checks completed.', steps, statuses, activeIndex: steps.length - 1, logo });
    await sleep(simulate ? 600 : 250);
    return { ok: true };
}

export async function showKernelPanic(errorMsg = 'CRITICAL_PROCESS_DIED') {
    console.clear();
    
    // Force another clear for persistent buffers
    process.stdout.write('\x1Bc'); 

    console.log(centerBlock(colorizeLogo(chalk.red)));
    
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
    console.log(centerText(chalk.gray('Collecting crash report... 100%')));
    console.log(centerText(chalk.gray('Kernel state: HALTED')));
    console.log(centerText(chalk.yellow('Rebooting XTermLite...')));

    await sleep(5000);
    
    return 'BOOT';
}

export async function showKernelCorrupt(errorMsg = 'ROOTFS_INSTALL_FAILED') {
    while (true) {
        console.clear();
        process.stdout.write('\x1Bc');

        console.log(centerBlock(colorizeLogo(chalk.red)));

        const corruptAscii = `
 _  __ _____  ____  _   _ ______ _        _____ ____  _____  _____  _    _ _____ _______ 
| |/ // ____|/ __ \\| \\ | |  ____| |      / ____/ __ \\|  __ \\|  __ \\| |  | |  __ \\__   __|
| ' /| |    | |  | |  \\| | |__  | |     | |   | |  | | |__) | |__) | |  | | |__) | | |   
|  < | |    | |  | | . \` |  __| | |     | |   | |  | |  _  /|  _  /| |  | |  ___/  | |   
| . \\| |____| |__| | |\\  | |____| |____ | |___| |__| | | \\ \\| | \\ \\| |__| | |      | |   
|_|\\_\\\\_____|\\____/|_| \\_|______|______| \\_____\\____/|_|  \\_\\_|  \\_\\\\____/|_|      |_|   
        `;

        console.log(centerBlock(chalk.red.bold(corruptAscii)));
        console.log('');
        console.log(centerText(chalk.bgRed.black.bold(' KERNEL CORRUPT ')));
        console.log('');
        console.log(centerText(chalk.red(`STOP CODE: ${errorMsg}`)));
        console.log(centerText(chalk.gray('System locked to prevent further damage.')));
        console.log(centerText(chalk.gray('Maintenance input required.')));
        console.log('');

        const input = await p.text({
            message: chalk.red('xterm@safemode:~#'),
            placeholder: '',
            validate: () => {}
        });

        if (p.isCancel(input)) continue;

        const cmd = String(input || '').trim().toLowerCase();
        if (cmd === 'reinstall') return 'INSTALLER';
        if (cmd === 'switch' || cmd === 'distro') return 'RECOVERY_ADVANCED';
    }
}
