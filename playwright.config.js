// Tests de bout en bout : chaque test démarre dans un navigateur vierge (données de démo).
const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
  testDir: 'tests',
  timeout: 30000,
  retries: 1,   // un aléa de temps de réponse ne bloque pas ; un vrai bug échoue deux fois
  fullyParallel: true,
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:8766/',
    viewport: { width: 1600, height: 900 },
    serviceWorkers: 'block',
  },
  // Utilise le Google Chrome installé (aucun téléchargement de navigateur nécessaire)
  projects: [{ name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome', viewport: { width: 1600, height: 900 } } }],
  webServer: {
    command: 'python3 -m http.server 8766 --bind 127.0.0.1',
    url: 'http://127.0.0.1:8766/index.html',
    reuseExistingServer: true,
    stdout: 'ignore',
    stderr: 'ignore',
  },
});
