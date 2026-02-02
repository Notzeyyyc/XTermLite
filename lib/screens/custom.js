import * as p from '@clack/prompts';
import chalk from 'chalk';
import { getLogo } from '../ascii.js';
import { centerBlock, sleep } from '../utils.js';
import { loadSettings, saveSettings } from '../config.js';
import { getTheme, themes } from '../themes.js';

export async function showCustomScreen() {
    let settings = loadSettings();

    while (true) {
        const theme = getTheme(settings.theme);
        console.clear();
        console.log(centerBlock(getLogo()));
        console.log('');

        const choice = await p.select({
            message: theme.primary('Personalization Menu:'),
            options: [
                { value: 'THEME', label: 'Change UI Theme', hint: `Current: ${settings.theme}` },
                { value: 'LOGO', label: 'Change ASCII Logo', hint: `Current: ${settings.logo}` },
                { value: 'BACK', label: 'Back to Main Menu' }
            ]
        });

        if (p.isCancel(choice) || choice === 'BACK') return 'MAIN_MENU';

        if (choice === 'THEME') {
            const themeChoice = await p.select({
                message: 'Select Theme:',
                options: Object.keys(themes).map(t => ({ value: t, label: t }))
            });

            if (!p.isCancel(themeChoice)) {
                settings.theme = themeChoice;
                saveSettings(settings);
            }
        }

        if (choice === 'LOGO') {
            const logoChoice = await p.select({
                message: 'Select Logo:',
                options: [
                    { value: 'Arch', label: 'Arch Linux' },
                    { value: 'Linux', label: 'Linux (Tux)' },
                    { value: 'XTerm', label: 'XTermLite Text' }
                ]
            });

            if (!p.isCancel(logoChoice)) {
                settings.logo = logoChoice;
                saveSettings(settings);
            }
        }
    }
}
