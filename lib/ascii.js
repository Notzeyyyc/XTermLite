import chalk from 'chalk';
import { loadSettings } from './config.js';
import { getTheme } from './themes.js';

export function getLogo() {
    const settings = loadSettings();
    const theme = getTheme(settings.theme);
    const logoType = settings.logo || 'Arch';

    const clr = {
        primary: theme.logo,
        white: chalk.white,
        gray: chalk.gray
    };

    if (logoType === 'Linux') {
        return `
${clr.primary('      .---.      ')}
${clr.primary('     /     \\     ')}
${clr.primary('    () ()  /     ')}
${clr.primary('    (_ )_)/      ')}
${clr.primary('   /  _  \\       ')}
${clr.primary('  / / \\ \\ \\      ')}
${clr.primary(' / /   \\ \\ \\     ')}
${clr.primary('(_ )   (_ )      ')}
        `;
    }

    if (logoType === 'XTerm') {
        return `
${clr.primary('__  _______ ___ ___ __  __ ')}
${clr.primary('\\ \\/ /_   _| __| _ \\  \\/  |')}
${clr.primary(' >  <  | | | _||   / |\\/| |')}
${clr.primary('/_/\\_\\ |_| |___|_|_\\_|  |_|')}
        `;
    }

    // Default: Arch
    return `
${clr.primary('          /\\')}
${clr.primary('         /  \\')}
${clr.primary('        / /\\ \\')}
${clr.primary('       / /  \\ \\')}
${clr.primary('      / /    \\ \\')}
${clr.primary('     / /  /\\  \\ \\')}
${clr.primary('    / /__/  \\__\\ \\')}
${clr.primary('   /____________  \\')}
${clr.primary('                \\__\\')}
`;
}

// Keep export for backward compatibility but it should really be dynamic
export const archlogo = getLogo();
