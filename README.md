## App lokal starten

Voraussetzungen:
- Node.js installieren
- Expo Go App auf dem Smartphone installieren

Setup:

```bash
npm install
```
Eine .env Datei im Projektordner anlegen und die benötigten Werte eintragen:
```
BETTER_AUTH_URL=...
DATABASE_URL=...
RESEND_API_KEY=...
```

App starten:
```
npx expo start --tunnel
```
