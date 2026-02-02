import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'settings.json');

const DEFAULT_SETTINGS = {
    theme: 'Classic Arch',
    logo: 'Arch',
    username: null
};

export function loadSettings() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
    return DEFAULT_SETTINGS;
}

export function saveSettings(settings) {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(settings, null, 2), 'utf-8');
    } catch (err) {
        console.error('Error saving settings:', err);
    }
}
