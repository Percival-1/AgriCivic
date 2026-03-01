const fs = require('fs');
const path = require('path');

const localesDir = 'c:\\Users\\mathe\\Desktop\\git_project\\vue\\frontend-react\\src\\i18n\\locales';
const locales = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const textsToTranslate = {
    'navigation.speechServices': 'Speech Services',
    'navigation.mapsLocation': 'Maps & Location',
    'admin.translationService': 'Translation Service',
    'admin.smsManagement': 'SMS Management'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function translateText(text, targetLang) {
    if (targetLang === 'en') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        return data[0][0][0];
    } catch (e) {
        console.error(`Error translating "${text}" to ${targetLang}:`, e.message);
        return text; // fallback
    }
}

async function main() {
    for (const file of locales) {
        const langCode = file.replace('.json', '');
        const filePath = path.join(localesDir, file);
        let data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`Processing ${langCode}...`);

        let changed = false;

        if (!data.navigation) data.navigation = {};
        if (!data.admin) data.admin = {};

        for (const [keyPath, englishText] of Object.entries(textsToTranslate)) {
            const [section, key] = keyPath.split('.');
            if (!data[section][key] || data[section][key] === englishText && langCode !== 'en') {
                const translated = await translateText(englishText, langCode);
                data[section][key] = translated;
                changed = true;
                await delay(500); // polite delay
            }
        }

        if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            console.log(`Updated ${file}`);
        } else {
            console.log(`No updates needed for ${file}`);
        }
    }
    console.log('Done!');
}

main();
