const fs = require('fs');
const path = require('path');

const DIRS = [
    'C:\\bogamdata',
    'C:\\Revisit',
    'C:\\Revisit\\logs'
];

const FILES = [
    { path: 'C:\\bogamdata\\visit_today.csv', content: 'name,phone,jumin,chart,type,date\n' },
    { path: 'C:\\Revisit\\visit_list.txt', content: '' },
    { path: 'C:\\Revisit\\visit_new.txt', content: '' }
];

console.log('Checking environment...');

// 1. Create directories
DIRS.forEach(dir => {
    if (!fs.existsSync(dir)) {
        console.log(`Creating directory: ${dir}`);
        fs.mkdirSync(dir, { recursive: true });
    } else {
        console.log(`Directory exists: ${dir}`);
    }
});

// 2. Create dummy files if they don't exist (to prevent errors in other scripts)
FILES.forEach(file => {
    if (!fs.existsSync(file.path)) {
        console.log(`Creating file: ${file.path}`);
        fs.writeFileSync(file.path, file.content);
    } else {
        console.log(`File exists: ${file.path}`);
    }
});

console.log('Environment setup complete.');
