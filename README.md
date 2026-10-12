# Ekta Padel — nightly backups

Written every night by `.github/workflows/nightly-backup.yml` on `main`.

- `backups/YYYY-MM-DD.json` — full backup, saved on nights when the data changed (the last 60 days are kept here; git history has every version)
- `backups/latest.json` — the newest backup
- `backups/status.json` — when the job last ran and last saw a change

To restore: open a file → "Download raw file" → in the app, Manage → Data → JSON File → 📥 Import.
