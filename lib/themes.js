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

export function getTheme(name) {
    return themes[name] || themes['Classic Arch'];
}
