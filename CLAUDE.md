# Investmentrechner

Rentenlücke, Sparrate und Töpfe als Geschichte für den Beratungstermin und später für die Beratungs-Website.
Gehört Lukas, Sprache in App, Code-Kommentaren und Commits: **Deutsch**.

## Aufbau
- `index.html` – die ganze App (HTML, CSS, JS in einer Datei). Wird 1:1 von GitHub Pages ausgeliefert: https://lulkasss.github.io/investmentrechner/
- `desktop/` – Mac-App (Electron): `main.js` lädt dieselbe `index.html` über `app://rechner/`. Kein Preload, keine Berechtigungen.
- `scripts/check.mjs` – Fehlercheck ohne Browser (Syntax, doppelte IDs, Dokumente/Schlüssel im Repo).
- `scripts/serve.mjs` – Dev-Server auf :5180.
- `test/app.spec.js` – Browsertests (Mac-Fenster und iPhone). `test/desktop.spec.js` – Test der Mac-App.

## Befehle
- `npm test` – Fehlercheck + alle Tests (≈20 s). Muss vor jedem Commit grün sein.
- `npm run dev` – lokal ansehen: http://localhost:5180
- `npm run app` – Mac-App aus dem Quellcode starten; `npm run app:install` – bauen, signieren, nach /Applications.

## Regeln
- Repo ist **öffentlich**: keine Kundendaten, Namen, erzeugten PDF-Vorschläge oder Zugangsdaten committen.
- Rechengrößen (Rentenwert, BBG, Beitragssätze, Steuer) stehen gesammelt in `const K` am Anfang des Rechenkerns. Jährlich zum 1.1./1.7. prüfen, Quelle im Kommentar.
- Look und Bewegung: Skill `app-ui` (Linear/Vercel, Flieder, Geist). Ändert sich hier etwas Grundsätzliches, den Skill mitziehen.
- Die Seite muss ohne `window.claude` laufen (Download fällt auf normalen Browser-Download zurück).
- Bis 10.10.2026 lebte der Rechner als Claude-Artifact (V37–V60, https://claude.ai/artifact/EtxDnY49AxpjHXw71zRfh4). Ab jetzt ist dieses Repo die Quelle; das Artifact wird nicht mehr gepflegt.
- Offen vor dem öffentlichen Start: Impressum, Hinweis „Modellrechnung“ prominent, eigene Domain.
