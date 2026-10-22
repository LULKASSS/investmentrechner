# Investmentrechner

Rentenlücke, Sparrate und Töpfe als Geschichte für den Beratungstermin und später für die Beratungs-Website.
Gehört Lukas, Sprache in App, Code-Kommentaren und Commits: **Deutsch**.

## Ziel
- Wofür: Der Kunde sieht im Termin, wofür er investiert (Rente und weitere Ziele) und wie er es erreicht: welche Sparrate die Rentenlücke schließt, was ein Euro mehr oder weniger ausmacht und welche Ziele er ins Budget bekommt oder nach hinten schiebt.
- Wer, wann: Lukas mit dem Kunden im Beratungstermin, am Mac (App) oder Handy; der Kunde spielt am Ende selbst mit der Sparrate. Später auf der Beratungs-Website.
- Gelungen, wenn: der Kunde ohne Erklärung sieht, ob seine Wunsch-Sparrate reicht, den Unterschied zu Lukas' Vorschlag in einem Satz nennen kann und weiß, um wie viel er die Altersvorsorge später erhöhen muss (z. B. mit der nächsten Gehaltserhöhung).
- Abgenommen: Geschichte Daten → Lücke → Weg → Lösung (Okt. 2026); Seite „Ziele“ mit Säulen je Jahr, Zeitstrahl und Karten („ganz cool“, Entwurf 22.10.2026); Lücke als eine Karte mit Säulen; Weg-Kurve mit Marktschwankung, eingezahlt-Fläche und Ziellinie; Ring für die Abdeckung; Lösungs-Pille mit Spalten und „Zusammen“; rollende Zahlen; Vorschlag als PDF.
- Nicht gewollt: Titelbalken oben links (11.10.2026); Mono-Etiketten; viel Text und doppelte Zahlen; Zahlentabellen beim Vergleich der Sparraten und Topf-Flächen in der Lösungs-Kurve (22.10.2026: „zu neutral“, „die Flächen mag ich nicht“); vorgegebene Ziel-Vorschläge zum Antippen (22.10.2026: nur eigene Sparziele eintragen).

## Aufbau
- `index.html` – die ganze App (HTML, CSS, JS in einer Datei). Wird 1:1 von GitHub Pages ausgeliefert: https://lulkasss.github.io/investmentrechner/
- `desktop/` – Mac-App (Electron): `main.js` liefert die Seite über `app://rechner/` aus. Beim Start (und bei „Neu laden“, ⌘R) holt sie die aktuelle `index.html` von GitHub Pages und merkt sie sich, ohne Netz nimmt sie die gemerkte, beim ersten Mal die eingebaute. Neu bauen ist nur bei Änderungen an `desktop/` nötig. Kein Preload, keine Berechtigungen.
- Handy-Homescreen und Browser: beim Öffnen und beim Zurückkehren vergleicht `aufUpdatePruefen()` das Last-Modified von GitHub Pages mit der geladenen Seite und lädt neu, solange noch keine Rechnung läuft (GitHub Pages hält Seiten bis zu 10 Min. im Zwischenspeicher).
- CSS steht in einem `<style>`-Block im `<head>`. Beim Ändern die bestehende Regel anpassen, keine Überschreib-Blöcke anhängen.
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
- Sparrate ist die Zahl der Lösung (22.10.2026): groß im Feld, darunter ein dicker Balken zum Ziehen (`#sparR`) mit Marke „ganze Lücke“ (`#qFull`, setzt zurück). Ab der Marke wird der Balken grün.
- Vergleich (22.10.2026): Weicht die Sparrate vom Vorschlag (ganze Lücke) ab, wird der Vorschlag automatisch zur Vergleichsrate; im Feld „Vergleich“ von Hand änderbar (`S.vgl`), „Entfernen“ schaltet ab (`S.vglAus`), „ganze Lücke“ setzt alles zurück. Farbe des Vergleichs: warmes Orange (`--c-vgl`), nicht Grau. Am Balken: Marke der Vergleichsrate; liegt sie darunter, ist der Balken bis dorthin blass und das Mehr kräftig, liegt sie darüber, steht das fehlende Stück in Orange. Darunter ein Satz: „150 € mehr im Monat bringen dir 1.303 € mehr Rente mit 67.“ Keine Tabelle. Rechnet über `compute().V` mit derselben Aufteilung und demselben Bonus wie die eigene Rate.
- Kurve der Lösung (`#solPathPanel`, `loesungVerlauf()` im Kern): wie die Weg-Kurve (Schwankung, eingezahlt, Ziellinie), aber mit der Sparrate der Lösung samt Depot nach Steuer und Einmalzahlung; endet bei Rentenbeginn beim Kapital von „Zusammen“. Mit Vergleich: orange Linie, beide Linien direkt beschriftet („Sparrate 150 €“ / „Vergleich 227 € +132.500 €“, daneben der Kapital-Unterschied bei Rentenbeginn). Keine Klammer mehr (Lukas, 22.10.2026). Neben dem Kapital steht, was insgesamt eingezahlt ist (Sparrate × Monate + Einmalzahlung), daneben der Wertzuwachs; beim Abtasten je Alter. Zeichnet sich beim ersten Mal, sobald sie im Bild ist.
- Annahme (von Lukas zu prüfen): Einmalzahlung im Depot mit demselben Netto-Faktor wie die Depot-Sparrate; die Vorabpauschale auf den Einmalbetrag ist nicht eigens gerechnet.

## Ziele neben der Rente (Entwurf auf Branch `claude/ziele`, 22.10.2026, nicht abgenommen)
- Anlass (Lukas): „für was investiere ich und wie kann ich das erreichen? welche Ziele muss ich nach hinten schieben?“ – bei Bedarf mehr als Rente rechnen, mit Tagesgeld/Depot statt Rentenrecht und -steuer.
- Daten: neue, optionale Frage 5 „Sparziele“ (`#q4`): nur eigene Ziele, keine Vorschläge (Lukas, 22.10.2026). Je Zeile Name, Betrag (heutige Preise), „in … Jahren“ (leer = 3); darunter immer eine leere Zeile, wer hineintippt, legt das nächste Ziel an. „Rentenlücke berechnen“ steht jetzt dort.
- Seite „Ziele“ (`#ziele`, Reiter nur mit Zielen, von der Lösung aus „Weiter: Deine Ziele“): oben „Jetzt im Monat“ (Rente + Immobilie + Ziele) und Sparbudget; darunter Säulen je Jahr (was in dem Jahr im Monat gespart wird, Budget als Linie, Zuviel rot schraffiert) und je Ziel ein Balken von Start bis Termin mit Griff zum Ziehen (Termin ändern, Rate rechnet sich neu). Karten je Ziel: Name, Betrag, Wann, Tagesgeld/Depot, Sparrate (eigene Rate → Termin rückt nach hinten, „wie gewünscht“ setzt zurück). „+ Sparziel“ legt ein leeres an.
- „Ins Budget einpassen“: was zuerst fällig ist, zuerst; jedes Ziel bekommt den frühesten Termin ab Wunsch, für den es in jedem Sparjahr ins freie Budget passt, und darf dafür später anfangen („Sparen ab 2030“). Rente bleibt, wie sie in der Lösung steht.
- Lösung: reicht die Sparrate nicht für die ganze Lücke, steht darunter „Ab 2027 85 € mehr im Monat in die Altersvorsorge, dann ist die Lücke zu. Zum Beispiel aus der nächsten Gehaltserhöhung.“ (`compute().nachher`, Anlass: Lukas' Kumpel, Thema fürs Update-Gespräch).
- Vorschlag: Abschnitt „Deine Ziele“ (Summe, Säulen, Balken, je Ziel eine Zeile), unter der Kurve der Lösung, sonst eigene Seite.
- Annahmen (von Lukas zu prüfen): Tagesgeld 2 % p. a., Zinsen ohne Steuer (im Sparerpauschbetrag); Depot mit der Rendite beim Sparen (7 %), Abgeltungsteuer auf 70 % des Gewinns beim Verkauf, Vorabpauschale nicht gerechnet; Depot ab 5 Jahren Spardauer (umstellbar); Zielbeträge steigen mit der Inflation bis zum Termin; Erspartes zählt weiter nur für die Rente; die Erhöhung „ab nächstem Jahr“ fließt ganz in die Altersvorsorge.
- Herkunft: Rechenideen aus dem früheren Versuch `ziele.html` (Branch `claude/youthful-maxwell-ip2m3x`), Oberfläche neu im Look des Rechners.

## Bewegung und Look (Stand 13.10.2026, angelehnt an Trade Republic)
- Zahlen rollen statt zu zählen: `tween()` baut jede Ziffer als Band 0–9 (`odo()`), die echte Zahl bleibt als Text im Element (Tests, Kopieren). Eurozeichen in großen Zahlen kleiner.
- Feder-Kurve `--spring` (knapp 4 % Nachschwingen) für alles, was auftaucht oder gleitet: Umschalter, Chips, Wert-Blase, Karten beim Seitenwechsel (leicht versetzt), neue Spalten in der Lösungs-Pille. Antippbares gibt beim Drücken nach (`scale(.96)`).
- Felder und Chips gefüllt statt umrandet, keine Mono-Versalien mehr als Etiketten.
- Weg: große Zahl über der Kurve (Kapital, Wertzuwachs als Chip). Maus über der Kurve, am Handy kurz halten oder seitlich wischen, zeigt den Wert je Alter (senkrecht wischen scrollt nur), die Zahl wächst beim ersten Zeichnen mit der Linie.
- Wenig Text: nichts doppelt zeigen (Sparrate und Renditen nur rechts, nicht nochmal in der Kurve).
- Datenaufnahme ohne Frage-Überschriften: die Feldnamen reichen, am PC steht „Weiter“ rechts auf Höhe der Felder.
- Lücke: eine Karte als Überblick (`#gapCard`), füllt den Bildschirm. Oben Kapital (über der Säule Heute) und Lücke im Monat (über ihrer Säule Mit 67) groß, darunter die Säulen Heute → Mit 67 mit den Beträgen, unten nur Inflation und gesetzliche Rente laut Renteninfo (korrigierbar). Beim ersten Mal bauen sich die Säulen auf, dann ploppen Lücke und Kapital oben auf.
- Weiterblättern (Lücke → Weg → Lösung): die Karten teilen sich (`teilen()`): leere Hüllen wachsen aus den alten Karten an den Platz der neuen, dann blendet der Inhalt ein. Zurück und Sprünge gleiten seitlich. Weg: Einstellungen links, Kurve rechts. Lösung genauso: Sparrate und Bonus links, Ring rechts, darunter Kurve und Pille.
- Vorschlag (PDF/Bild, `buildPdf`): folgt der App. Seite 1: „Dein Investment.“ ohne Logo, Lücke als eine Karte (Ergebnis oben, Säulen, Inflation und Renteninfo unten), Weg als zwei Karten (Einstellungen links, Kurve mit Kapital und Wertzuwachs rechts). Seite 2: Lösung wie in der App (links Sparrate groß mit Balken und Vergleichssatz, Bonus; rechts Ring), Pille, Kurve der Lösung mit Vergleich. Deine Angaben und Annahmen stehen darunter, wenn Platz ist, sonst auf Seite 3 (dann füllt die Kurve Seite 2 bis unten). Keine Mono-Etiketten, Etiketten als gefüllte Pillen.
