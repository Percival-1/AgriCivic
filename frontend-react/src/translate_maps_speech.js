import fs from 'fs';
import path from 'path';

const localesDir = 'c:\\Users\\mathe\\Desktop\\git_project\\vue\\frontend-react\\src\\i18n\\locales';
const locales = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'));

const textsToTranslate = {
    'maps.title': 'Maps & Location Services',
    'maps.subtitle': 'Geocoding, routing, and distance calculation features',
    'maps.geocodingSearch': 'Geocoding Search',
    'maps.geocodingDesc': 'Search for any address and get its coordinates. The search provides autocomplete suggestions as you type.',
    'maps.routeDisplay': 'Route Display',
    'maps.distanceCalculator': 'Distance Calculator',
    'maps.searchPlaceholder': 'Search for any location...',
    'maps.selectedLocation': 'Selected Location',
    'maps.name': 'Name:',
    'maps.address': 'Address:',
    'maps.latitude': 'Latitude:',
    'maps.longitude': 'Longitude:',
    'maps.howItWorks': 'How It Works',
    'maps.step1Title': '1. Autocomplete',
    'maps.step1Desc': 'As you type, the system fetches address suggestions from the backend API. Minimum 2 characters required.',
    'maps.step2Title': '2. Geocoding',
    'maps.step2Desc': 'When you select a suggestion or press Enter, the address is geocoded to get precise latitude and longitude coordinates.',
    'maps.step3Title': '3. Validation',
    'maps.step3Desc': 'The system validates the location coordinates to ensure they are within valid ranges and represent real locations.',
    'maps.routeDesc': 'Select origin and destination to display the route on the map with polylines, distance, and turn-by-turn directions.',
    'maps.origin': 'Origin',
    'maps.enterOrigin': 'Enter origin...',
    'maps.destination': 'Destination',
    'maps.enterDestination': 'Enter destination...',
    'maps.showRoute': 'Show Route',
    'maps.features': 'Features',
    'maps.feature1Title': 'Polyline Display',
    'maps.feature1Desc': 'Routes are displayed as blue polylines on the map showing the exact path between locations.',
    'maps.feature2Title': 'Distance & Duration',
    'maps.feature2Desc': 'Automatically calculates and displays the total distance and estimated travel time.',
    'maps.feature3Title': 'Turn-by-Turn',
    'maps.feature3Desc': 'Provides step-by-step directions with distance for each turn along the route.',
    'maps.distanceDesc': 'Calculate the distance and travel time between two locations using different travel modes.',
    'maps.travelModes': 'Travel Modes',
    'maps.driving': '🚗 Driving',
    'maps.drivingDesc': 'Calculates distance and time for car travel via roads and highways. Best for long distances.',
    'maps.walking': '🚶 Walking',
    'maps.walkingDesc': 'Calculates pedestrian routes using sidewalks and pedestrian paths. Best for short distances.',
    'maps.bicycling': '🚴 Bicycling',
    'maps.bicyclingDesc': 'Calculates routes suitable for bicycles, including bike lanes and paths.',
    'maps.transit': '🚌 Transit',
    'maps.transitDesc': 'Calculates routes using public transportation like buses, trains, and metro.',

    'speech.title': 'Speech Services',
    'speech.subtitle': 'Convert speech to text and text to speech',
    'speech.sttTab': 'Speech-to-Text',
    'speech.ttsTab': 'Text-to-Speech',
    'speech.supportedFormats': 'Supported Formats & Languages',
    'speech.formats': 'Formats:',
    'speech.languages': 'Languages:',
    'speech.languagesSupported': 'languages supported',
    'speech.multipleLanguages': 'Multiple languages',
    'speech.selectLanguage': 'Select Language',
    'speech.uploadAudio': 'Upload Audio',
    'speech.recordAudio': 'Record Audio',
    'speech.transcribeAudio': 'Transcribe Audio',
    'speech.transcribing': 'Transcribing...',
    'speech.recentTranscriptions': 'Recent Transcriptions'
};

const delay = ms => new Promise(res => setTimeout(res, ms));

async function translateText(text, targetLang) {
    if (targetLang === 'en') return text;
    try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const data = await res.json();
        let fullTranslation = '';
        if (data && data[0]) {
            data[0].forEach(part => {
                if (part[0]) fullTranslation += part[0];
            });
        }
        return fullTranslation || text;
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

        if (!data.maps) data.maps = {};
        if (!data.speech) data.speech = {};

        for (const [keyPath, englishText] of Object.entries(textsToTranslate)) {
            const [section, key] = keyPath.split('.');
            if (!data[section][key] || data[section][key] === englishText && langCode !== 'en') {
                const translated = await translateText(englishText, langCode);
                data[section][key] = translated;
                changed = true;
                await delay(200); // polite delay
            }
        }

        if (changed) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 4));
            console.log(`Updated ${file}`);
        } else {
            console.log(`No updates needed for ${file}`);
        }
    }
    console.log('Done mapping maps & speech tools!');
}

main();
