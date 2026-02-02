import chalk from 'chalk';

export const themes = {
    'Classic Arch': {
        primary: chalk.cyan,
        secondary: chalk.blue,
        accent: chalk.white,
        logo: chalk.bold.cyan
    },
    'Cyberpunk': {
        primary: chalk.magenta,
        secondary: chalk.cyan,
        accent: chalk.yellow,
        logo: chalk.bold.magenta
    },
    'Matrix': {
        primary: chalk.green,
        secondary: chalk.greenBright,
        accent: chalk.gray,
        logo: chalk.bold.green
    },
    'Dracula': {
        primary: chalk.hex('#bd93f9'), // Purple
        secondary: chalk.hex('#ff79c6'), // Pink
        accent: chalk.hex('#f8f8f2'), // Foreground
        logo: chalk.bold.hex('#bd93f9')
    }
};

const tmuxThemes = {
    'Classic Arch': {
        statusBg: 'colour236',
        statusFg: 'colour252',
        accent: 'colour51',
        secondary: 'colour39',
        muted: 'colour240',
        paneBorder: 'colour238',
        paneActiveBorder: 'colour51',
        messageBg: 'colour238',
        messageFg: 'colour51',
        modeBg: 'colour51',
        modeFg: 'colour235',
        windowFg: 'colour245',
        windowActiveFg: 'colour51'
    },
    'Cyberpunk': {
        statusBg: 'colour234',
        statusFg: 'colour252',
        accent: 'colour201',
        secondary: 'colour51',
        muted: 'colour240',
        paneBorder: 'colour238',
        paneActiveBorder: 'colour201',
        messageBg: 'colour236',
        messageFg: 'colour201',
        modeBg: 'colour201',
        modeFg: 'colour234',
        windowFg: 'colour245',
        windowActiveFg: 'colour201'
    },
    'Matrix': {
        statusBg: 'colour232',
        statusFg: 'colour120',
        accent: 'colour46',
        secondary: 'colour82',
        muted: 'colour238',
        paneBorder: 'colour238',
        paneActiveBorder: 'colour46',
        messageBg: 'colour232',
        messageFg: 'colour46',
        modeBg: 'colour46',
        modeFg: 'colour232',
        windowFg: 'colour120',
        windowActiveFg: 'colour46'
    },
    'Dracula': {
        statusBg: 'colour235',
        statusFg: 'colour253',
        accent: 'colour141',
        secondary: 'colour212',
        muted: 'colour240',
        paneBorder: 'colour238',
        paneActiveBorder: 'colour141',
        messageBg: 'colour236',
        messageFg: 'colour141',
        modeBg: 'colour141',
        modeFg: 'colour235',
        windowFg: 'colour253',
        windowActiveFg: 'colour141'
    }
};

export function getTheme(name) {
    return themes[name] || themes['Classic Arch'];
}

export function getTmuxTheme(name) {
    return tmuxThemes[name] || tmuxThemes['Classic Arch'];
}
