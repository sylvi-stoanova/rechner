# Betriebskostenrechner

Der Rechner ermittelt Betriebskosten und Mindestumsatz direkt im Browser. Eingaben werden im lokalen Speicher des Browsers für die jeweilige Website gespeichert. Der PDF-Export erstellt die Datei auf dem Gerät.

## Lokal starten

Node.js 24 installieren und im Projektordner ausführen.

```sh
npm ci
npm run dev
```

Mit `npm test` laufen die automatisierten Berechnungstests. `npm run build` erzeugt die statische Website in `dist`.

## Auf GitHub Pages veröffentlichen

1. Lade das Projekt inklusive `package-lock.json` und `.github/workflows/deploy.yml` in ein öffentliches GitHub-Repository auf den Branch `main`.
2. Öffne im Repository **Settings → Pages** und wähle unter **Build and deployment → Source** die Option **GitHub Actions**.
3. Öffne **Actions → GitHub Pages → Run workflow** und starte den Workflow auf `main`. Weitere Pushes auf `main` starten ihn automatisch.
4. Öffne nach erfolgreichem Lauf die unter **Settings → Pages** angezeigte Adresse.

GitHub Actions übernimmt den Basispfad aus den Pages-Einstellungen. Ein Projekt-Repository läuft beispielsweise unter `https://benutzername.github.io/rechner/`, eine Benutzerwebsite unter `https://benutzername.github.io/`. Die Navigation verwendet Abschnittslinks innerhalb der Seite.

Für einen lokalen Build mit Projektpfad kannst du in PowerShell `$env:PAGES_BASE_PATH = '/rechner/'` setzen und dann `npm run build` und `npm run preview` ausführen. Verwende dabei den tatsächlichen Repository-Namen einschließlich Groß- und Kleinschreibung.
## Bildnachweis

Das Arbeitsplatzfoto von [Mikey Harris](https://unsplash.com/photos/macbook-pro-beside-green-plant-on-table-qVnyj4NYLZs) ist als optimiertes WebP in `src/workspace.webp` eingebunden. Die [Unsplash-Lizenz](https://unsplash.com/license) erlaubt die kommerzielle Nutzung und Bearbeitung. Der Verkauf unveränderter Fotos und der Aufbau eines konkurrierenden Bilddienstes sind ausgenommen.
