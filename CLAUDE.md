# Investmentrechner

Rentenlücke, Sparrate und Töpfe als Geschichte für den Beratungstermin und später für die Beratungs-Website.
Gehört Lukas, Sprache in App, Code-Kommentaren und Commits: **Deutsch**.

## Aufbau
- `index.html` – die ganze App (HTML, CSS, JS in einer Datei). Wird 1:1 von GitHub Pages ausgeliefert: https://lulkasss.github.io/investmentrechner/
- `ziele.html` – **Versuch** Ziele-Planer (Branch, noch nicht abgenommen): Ziele anhaken → je Ziel Sparrate → Zeitstrahl (alles pünktlich vs. Budget) → Plan (Wichtiges zuerst, Rest rückt nach). Rente rechnet mit dem Rechenkern aus `index.html`, 1:1 hineinkopiert (`npm run kern`); der Fehlercheck meldet, wenn beide auseinanderlaufen.
- `desktop/` – Mac-App (Electron): `main.js` lädt dieselbe `index.html` über `app://rechner/`. Kein Preload, keine Berechtigungen.
- `scripts/check.mjs` – Fehlercheck ohne Browser (Syntax, doppelte IDs, Dokumente/Schlüssel im Repo).
- `scripts/serve.mjs` – Dev-Server auf :5180.
- `test/app.spec.js` – Browsertests (Mac-Fenster und iPhone). `test/kern.spec.js` – Rechenkern ohne Browser. `test/zufall.spec.js` – Zufallseingaben quer durch alle Seiten (`ZUFALL=40 npx playwright test zufall` für mehr Durchläufe). `test/desktop.spec.js` – Test der Mac-App.

## Befehle
- `npm test` – Fehlercheck + alle Tests (≈30 s). Muss vor jedem Commit grün sein.
- `npm run dev` – lokal ansehen: http://localhost:5180 (Ziele-Planer: /ziele.html)
- `npm run kern` – Rechenkern nach Änderungen an `const K`/`rechne()` in den Ziele-Planer übernehmen
- `npm run app` – Mac-App aus dem Quellcode starten; `npm run app:install` – bauen, signieren, nach /Applications.

## Regeln
- Repo ist **öffentlich**: keine Kundendaten, Namen, erzeugten PDF-Vorschläge oder Zugangsdaten committen.
- Rechengrößen (Rentenwert, BBG, Beitragssätze, Steuer) stehen gesammelt in `const K` am Anfang des Rechenkerns. Jährlich zum 1.1./1.7. prüfen, Quelle im Kommentar.
- Look und Bewegung: Skill `app-ui` (Linear/Vercel, Flieder, Geist). Ändert sich hier etwas Grundsätzliches, den Skill mitziehen.
- Die Seite muss ohne `window.claude` laufen (Download fällt auf normalen Browser-Download zurück).
- Bis 10.10.2026 lebte der Rechner als Claude-Artifact (V37–V60, https://claude.ai/artifact/EtxDnY49AxpjHXw71zRfh4). Ab jetzt ist dieses Repo die Quelle; das Artifact wird nicht mehr gepflegt.
- Offen vor dem öffentlichen Start: Impressum, Hinweis „Modellrechnung“ prominent, eigene Domain.

## Bausteine der Lösung (Stand 10.10.2026)
- Bonus-Bausteine (Depot, Einmalzahlung, Immobilie) werden unter „Dazu als Bonus“ angehakt und **direkt darunter** eingestellt (aufklappende `.split-wrap`). Ergebnis steht als **Spalte in der Lösungs-Pille** (`#solPill .sp-col`), „Zusammen“ rechnet alle Spalten zusammen. Ring, Spalten und „Zusammen“ zeigen dieselben Zahlen.
- Einmalzahlung = „Erspartes“ aus den Daten (ein Wert, `S.ersp`). Mit Erspartem ist sie vorausgewählt; abwählen bleibt abgewählt, auch wenn man das Ersparte später ändert.
- Kapital wird überall gleich formatiert (`fK`: unter 1 Mio. auf 100 € genau), in App und PDF.
- Annahme (von Lukas zu prüfen): Einmalzahlung im Depot mit demselben Netto-Faktor wie die Depot-Sparrate; die Vorabpauschale auf den Einmalbetrag ist nicht eigens gerechnet.

## Ziele-Planer (Versuch, Stand 10.10.2026)
- Fragen: Alter + Netto → Ziele anhaken (nichts vorausgewählt) → Budget im Monat (Vorschlag 15 % vom Netto) + schon gespart.
- Reihenfolge im Plan: „Muss“ vor „Wunsch“, dann nach Termin. Erspartes geht in dieser Reihenfolge an die Ziele.
- Sparraten aufgerundet wie im Rechner (Seite „Weg“); die Rente ist für dieselben Eingaben exakt die Rechner-Sparrate (Test).
- **Annahmen (von Lukas zu prüfen):** Zielbeträge in heutigen Preisen, +2 % Inflation bis zum Termin. Rendite nach Dauer: unter 3 J. 2 % (Tagesgeld), 3–9 J. 4 % (Mischung), ab 10 J. 7 % (Depot); Notgroschen immer Tagesgeld. Wohnung: 30 % vom Kaufpreis (20 % Eigenkapital + 10 % Nebenkosten). Notgroschen 3 Monatsnetto, Auszeit 6 Monatsnetto. Budget bleibt über die Jahre gleich (keine Gehaltssteigerung). Keine Steuern auf die Ziel-Töpfe.
- Offen: PDF/Übersicht, Anbindung an den Rechner (Rente „genau rechnen“ öffnet ihn nur, Werte werden nicht übergeben), weitere Ziele (Schulden tilgen), Anrede bei Kunden-Version.
