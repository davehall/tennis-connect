# Editing Club Data (Option B: Bulk/Manual)

This project stores the club dataset in a base64-encoded file used at runtime:

- Runtime dataset (base64): `assets/data/rk7a9nq3.b64.txt`
- Editable JSON (after export): `assets/data/clubs.json`

Use this workflow when you want to do bulk or manual edits in a friendly JSON file.

## Prerequisites

- Node.js installed
- Run commands from the project root: `app/`

## Steps

1) Export the dataset to JSON

```sh
npm run data:export
```

This creates/updates `assets/data/clubs.json` with a pretty-printed array of clubs.

2) Edit the JSON

- Open `assets/data/clubs.json` and make changes.
- Common fields: `courts`, `floodlit`, `indoor`, `court_surface`, `court_type`, `website`, `logo`, `favicon`, `favicon_url`, `address`, `notes`, `county`, `sport`.
- Keep the structure valid JSON (matching brackets/commas, string quotes, etc.).

3) Import the JSON back into the base64 dataset

```sh
npm run data:import
```

This re-encodes the JSON and writes `assets/data/rk7a9nq3.b64.txt`.
A timestamped backup of the previous base64 file is created alongside it:
`assets/data/rk7a9nq3.backup-YYYYMMDD-HHMMSS.b64.txt`.

4) (Optional) Re-export to keep JSON in sync

```sh
npm run data:export
```

This ensures `assets/data/clubs.json` matches the current base64 dataset.

## Verifying in the app

- Rebuild the app and serve if needed:

```sh
npm run build
npx serve -l 3000 .
```

- Then visit http://localhost:3000/ to see changes.

## Troubleshooting

- Import failed: Ensure `assets/data/clubs.json` is valid JSON and the top-level is an array.
- Lost a change: Restore from the latest `assets/data/rk7a9nq3.backup-*.b64.txt` by copying it over `rk7a9nq3.b64.txt`.
- Need to change a single club quickly: Use the one-off updater instead of bulk editing:

```sh
npm run club:update -- --id 123 --courts 6
```

## Notes

- The UI displays `club.courts` (if present) and uses `court_surface`, `court_type`, `indoor`, and `floodlit` in various views.
- Keep IDs stable. Changing `id` values can affect cross-references and sorting.
