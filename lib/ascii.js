import chalk from 'chalk';
import { loadSettings } from './config.js';
import { getTheme } from './themes.js';

let cachedKey = null;
let cachedLogo = null;

function normalizeDistro(value) {
    const v = String(value || '').trim().toLowerCase();
    if (!v) return '';
    if (v.includes('arch')) return 'arch';
    if (v.includes('ubuntu')) return 'ubuntu';
    if (v.includes('debian')) return 'debian';
    if (v.includes('kali')) return 'kali';
    if (v.includes('alpine')) return 'alpine';
    if (v.includes('fedora')) return 'fedora';
    return v;
}

function buildLogo(lines, colorFn) {
    const colored = lines.map((line) => (line ? colorFn(line) : line));
    return `\n${colored.join('\n')}\n`;
}

function getDistroLogo(distroKey, clr) {
    if (distroKey === 'ubuntu') {
        return buildLogo(
            [
                ' _   _ ____  _   _ _____ _   _ ',
                '| | | |  _ \\| | | |_   _| | | |',
                '| |_| | |_) | | | | | | | |_| |',
                '|  _  |  __/| |_| | | | |  _  |',
                '|_| |_|_|    \\___/  |_| |_| |_|'
            ],
            clr.primary
        );
    }
    if (distroKey === 'debian') {
        return buildLogo(
            [
                ' ____  _____ ____  _    _    ',
                '|  _ \\| ____|  _ \\| |  | |   ',
                '| | | |  _| | |_) | |  | |   ',
                '| |_| | |___|  _ <| |__| |___',
                '|____/|_____|_| \\_\\____|_____|'
            ],
            clr.primary
        );
    }
    if (distroKey === 'kali') {
        return buildLogo(
            [
                ' _  __    _    _     ___ ',
                '| |/ /   / \\  | |   |_ _|',
                "| ' /   / _ \\ | |    | | ",
                '| . \\  / ___ \\| |___ | | ',
                '|_|\\_\\/_/   \\_\\_____|___|'
            ],
            clr.primary
        );
    }
    if (distroKey === 'alpine') {
        return buildLogo(
            [
                '    /\\   _      _ ',
                '   /  \\ | |__ _| |',
                '  / /\\ \\| / _` | |',
                ' / ____ \\| (_| | |',
                '/_/    \\_\\__,_|_|'
            ],
            clr.primary
        );
    }
    if (distroKey === 'fedora') {
        return buildLogo(
            [
                ' _____ _____ ____   ___  ____  ',
                '|  ___| ____|  _ \\ / _ \\|  _ \\ ',
                '| |_  |  _| | |_) | | | | |_) |',
                '|  _| | |___|  _ <| |_| |  _ < ',
                '|_|   |_____|_| \\_\\\\___/|_| \\_\\'
            ],
            clr.primary
        );
    }
    if (distroKey === 'arch') {
        return buildLogo(
            [
                '          /\\',
                '         /  \\',
                '        / /\\ \\',
                '       / /  \\ \\',
                '      / /    \\ \\',
                '     / /  /\\  \\ \\',
                '    / /__/  \\__\\ \\',
                '   /____________  \\',
                '                \\__\\'
            ],
            clr.primary
        );
    }
    return null;
}

export function getLogo(options = {}) {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    const logoType = options.logoType || settings.logo || 'Arch';
    const distroKey = normalizeDistro(options.distro);
    const key = `${settings.theme || ''}|${logoType}|${distroKey}`;
    if (cachedKey === key && cachedLogo) return cachedLogo;

    const clr = {
        primary: theme.logo,
        white: chalk.white,
        gray: chalk.gray
    };

    if (distroKey) {
        const distroLogo = getDistroLogo(distroKey, clr);
        if (distroLogo) {
            cachedKey = key;
            cachedLogo = distroLogo;
            return cachedLogo;
        }
    }

    if (logoType === 'Linux') {
        cachedKey = key;
        cachedLogo = buildLogo(
            [
                '      .---.      ',
                '     /     \\     ',
                '    () ()  /     ',
                '    (_ )_)/      ',
                '   /  _  \\       ',
                '  / / \\ \\ \\      ',
                ' / /   \\ \\ \\     ',
                '(_ )   (_ )      '
            ],
            clr.primary
        );
        return cachedLogo;
    }

    if (logoType === 'XTerm') {
        cachedKey = key;
        cachedLogo = buildLogo(
            [
                '__  _______ ___ ___ __  __ ',
                '\\ \\/ /_   _| __| _ \\  \\/  |',
                ' >  <  | | | _||   / |\\/| |',
                '/_/\\_\\ |_| |___|_|_\\_|  |_|'
            ],
            clr.primary
        );
        return cachedLogo;
    }

    cachedKey = key;
    cachedLogo = buildLogo(
        [
            '          /\\',
            '         /  \\',
            '        / /\\ \\',
            '       / /  \\ \\',
            '      / /    \\ \\',
            '     / /  /\\  \\ \\',
            '    / /__/  \\__\\ \\',
            '   /____________  \\',
            '                \\__\\'
        ],
        clr.primary
    );
    return cachedLogo;
}

// Keep export for backward compatibility but it should really be dynamic
export const archlogo = getLogo();
