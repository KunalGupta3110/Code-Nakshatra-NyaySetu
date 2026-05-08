const { execSync } = require('child_process');
const { existsSync } = require('fs');
const { join } = require('path');

function run(command, options = {}) {
  console.log(`> ${command}`);
  execSync(command, { stdio: 'inherit', ...options });
}

console.log('NyaySetu setup helper started.');

const backendPath = join(__dirname, '..', 'backend');
const backendPackage = join(backendPath, 'package.json');

if (!existsSync(backendPackage)) {
  console.warn('Warning: backend/package.json not found. Skipping backend dependency install.');
  process.exit(0);
}

try {
  console.log('Installing backend dependencies...');
  run('npm install', { cwd: backendPath });
  console.log('Backend dependencies installed successfully.');
} catch (error) {
  console.error('Failed to install backend dependencies.');
  process.exit(1);
}

console.log('Setup helper completed. Root dependencies were installed by npm already.');
console.log('Next step: create a .env file if needed, then use npm start or npm run dev.');
