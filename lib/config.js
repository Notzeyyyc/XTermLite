import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = path.join(__dirname, '..', 'settings.json');

const DEFAULT_SETTINGS = {
    theme: 'Classic Arch',
    logo: 'Arch',
    username: null,
    liteMode: false
};

let cachedSettings = null;

function applyRuntimeFlags(settings) {
    process.env.XTERM_LITE_MODE = settings?.liteMode ? '1' : '0';
}

export function loadSettings() {
    try {
        if (cachedSettings) {
            applyRuntimeFlags(cachedSettings);
            return { ...cachedSettings };
        }

        if (fs.existsSync(CONFIG_PATH)) {
            const data = fs.readFileSync(CONFIG_PATH, 'utf-8');
            cachedSettings = { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
            applyRuntimeFlags(cachedSettings);
            return { ...cachedSettings };
        }
    } catch (err) {
        console.error('Error loading settings:', err);
    }
    cachedSettings = { ...DEFAULT_SETTINGS };
    applyRuntimeFlags(cachedSettings);
    return { ...cachedSettings };
}

export function saveSettings(settings) {
    try {
        const next = { ...DEFAULT_SETTINGS, ...(settings || {}) };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), 'utf-8');
        cachedSettings = next;
        applyRuntimeFlags(cachedSettings);
    } catch (err) {
        console.error('Error saving settings:', err);
    }
}
