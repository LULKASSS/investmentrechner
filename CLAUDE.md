# Investmentrechner

Rentenlücke, Sparrate und Töpfe als Geschichte für den Beratungstermin und später für die Beratungs-Website.
Gehört Lukas, Sprache in App, Code-Kommentaren und Commits: **Deutsch**.

## Aufbau
- `index.html` – die ganze App (HTML, CSS, JS in einer Datei). Wird 1:1 von GitHub Pages ausgeliefert: https://lulkasss.github.io/investmentrechner/
- `desktop/` – Mac-App (Electron): `main.js` liefert die Seite über `app://rechner/` aus. Beim Start (und bei „Neu laden“, ⌘R) holt sie die aktuelle `index.html` von GitHub Pages und merkt sie sich, ohne Netz nimmt sie die gemerkte, beim ersten Mal die eingebaute. Neu bauen ist nur bei Änderungen an `desktop/` nötig. Kein Preload, keine Berechtigungen.
- `scripts/check.mjs` – Fehlercheck ohne Browser (Syntax, doppelte IDs, Dokumente/Schlüssel im Repo).
- `scripts/serve.mjs` – Dev-Server auf :5180.
- `test/app.spec.js` – Browsertests (Mac-Fenster und iPhone). `test/kern.spec.js` – Rechenkern ohne Browser. `test/zufall.spec.js` – Zufallseingaben quer durch alle Seiten (`ZUFALL=40 npx playwright test zufall` für mehr Durchläufe). `test/desktop.spec.js` – Test der Mac-App.

## Befehle
- `npm test` – Fehlercheck + alle Tests (≈30 s). Muss vor jedem Commit grün sein.
- `npm run dev` – lokal ansehen: http://localhost:5180
- `npm run app` – Mac-App aus dem Quellcode starten; `npm run app:install` – bauen, signieren, nach /Applications.

## Regeln
- Repo ist **öffentlich**: keine Kundendaten, Namen, erzeugten PDF-Vorschläge oder Zugangsdaten committen.
- Rechengrößen (Rentenwert, BBG, Beitragssätze, Steuer) stehen gesammelt in `const K` am Anfang des Rechenkerns. Jährlich zum 1.1./1.7. prüfen, Quelle im Kommentar.
- Kein Titelbalken oben links: kein Logo, kein App-Name, kein Zeichen als Menü-Knopf. Der Platz gehört dem Inhalt (Lukas, 11.10.2026). Gilt auch für die Startseite.
- Look und Bewegung: Skill `app-ui` (Linear/Vercel, Flieder, Geist). Ändert sich hier etwas Grundsätzliches, den Skill mitziehen.
- Die Seite muss ohne `window.claude` laufen (Download fällt auf normalen Browser-Download zurück).
- Bis 10.10.2026 lebte der Rechner als Claude-Artifact (V37–V60, https://claude.ai/artifact/EtxDnY49AxpjHXw71zRfh4). Ab jetzt ist dieses Repo die Quelle; das Artifact wird nicht mehr gepflegt.
- Offen vor dem öffentlichen Start: Impressum, Hinweis „Modellrechnung“ prominent, eigene Domain.

## Bausteine der Lösung (Stand 10.10.2026)
- Bonus-Bausteine (Depot, Einmalzahlung, Immobilie) werden unter „Dazu als Bonus“ angehakt und **direkt darunter** eingestellt (aufklappende `.split-wrap`). Ergebnis steht als **Spalte in der Lösungs-Pille** (`#solPill .sp-col`), „Zusammen“ rechnet alle Spalten zusammen. Ring, Spalten und „Zusammen“ zeigen dieselben Zahlen.
- Einmalzahlung = „Erspartes“ aus den Daten (ein Wert, `S.ersp`). Mit Erspartem ist sie vorausgewählt; abwählen bleibt abgewählt, auch wenn man das Ersparte später ändert.
- Kapital wird überall gleich formatiert (`fK`: unter 1 Mio. auf 100 € genau), in App und PDF.
- Annahme (von Lukas zu prüfen): Einmalzahlung im Depot mit demselben Netto-Faktor wie die Depot-Sparrate; die Vorabpauschale auf den Einmalbetrag ist nicht eigens gerechnet.

## Bewegung und Look (Stand 13.10.2026, angelehnt an Trade Republic)
- Zahlen rollen statt zu zählen: `tween()` baut jede Ziffer als Band 0–9 (`odo()`), die echte Zahl bleibt als Text im Element (Tests, Kopieren). Eurozeichen in großen Zahlen kleiner.
- Feder-Kurve `--spring` (knapp 4 % Nachschwingen) für alles, was auftaucht oder gleitet: Umschalter, Chips, Wert-Blase, Karten beim Seitenwechsel (leicht versetzt), neue Spalten in der Lösungs-Pille. Antippbares gibt beim Drücken nach (`scale(.96)`).
- Felder und Chips gefüllt statt umrandet, keine Mono-Versalien mehr als Etiketten.
- Weg: große Zahl über der Kurve (Kapital, Wertzuwachs als Chip). Maus/Finger auf der Kurve zeigt dort den Wert je Alter, die Zahl wächst beim ersten Zeichnen mit der Linie.
- Wenig Text: nichts doppelt zeigen (Sparrate und Renditen nur rechts, nicht nochmal in der Kurve).
- Datenaufnahme ohne Frage-Überschriften: die Feldnamen reichen, am PC steht „Weiter“ rechts auf Höhe der Felder.
- Lücke: eine Karte als Überblick (`#gapCard`), füllt den Bildschirm. Oben Lücke und Kapital groß, darin die Säulen Heute → Mit 67 mit den Beträgen, unten nur Inflation und gesetzliche Rente laut Renteninfo (korrigierbar). Beim ersten Mal bauen sich die Säulen auf, dann ploppen Lücke und Kapital oben auf.
- Weiterblättern (Lücke → Weg → Lösung): die Karten teilen sich (`teilen()`): leere Hüllen wachsen aus den alten Karten an den Platz der neuen, dann blendet der Inhalt ein. Zurück und Sprünge gleiten seitlich. Weg: Einstellungen links, Kurve rechts.
