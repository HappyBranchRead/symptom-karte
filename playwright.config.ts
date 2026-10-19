import {defineConfig} from '@playwright/test';
export default defineConfig({
 testDir: './test/browser',
 use: {baseURL: 'http://127.0.0.1:3100', viewport: {width: 375, height: 812}},
 webServer: {command: 'npm run start -- --port 3100', url: 'http://127.0.0.1:3100', reuseExistingServer: false},
});
