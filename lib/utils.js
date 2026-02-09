import { createRequire } from 'module';
const require = createRequire(import.meta.url);
let cachedPkg = null;

export function getPkg() {
    if (cachedPkg) return cachedPkg;
    cachedPkg = require('../package.json');
    return cachedPkg;
}

export const sleep = (ms = 1000) => {
    const multiplier = process.env.XTERM_LITE_MODE === '1' ? 0.25 : 1;
    const duration = Math.max(0, Math.floor(Number(ms) * multiplier));
    return new Promise((r) => setTimeout(r, duration));
};

export const stripAnsi = (str) => str.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

export const getTermWidth = () => process.stdout.columns || 80;

export const centerText = (str) => {
    const visibleLen = stripAnsi(str).length;
    const padding = Math.max(0, Math.floor((getTermWidth() - visibleLen) / 2));
    return ' '.repeat(padding) + str;
};

export const centerBlock = (str) => {
    const lines = str.split('\n');
    const visibleWidths = lines.map(l => stripAnsi(l).length);
    const maxContentWidth = Math.max(...visibleWidths);
    const padding = Math.max(0, Math.floor((getTermWidth() - maxContentWidth) / 2));
    const padStr = ' '.repeat(padding);
    return lines.map(l => l ? padStr + l : l).join('\n');
};

