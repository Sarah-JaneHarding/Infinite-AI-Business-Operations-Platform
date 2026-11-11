# Legacy shell (not built)

These files are the earlier, tabbed shell. They import `src/data/mockData`, `src/data/warehouseData` and
`src/data/educationEcosystemData`, which were never committed: the repository's `.gitignore` had a bare `data/`
rule that also ignored `src/data/`. Without those files this code cannot compile, so it is kept here, outside the
build (see `tsconfig.json`), instead of being deleted.

To bring it back: restore the three data files into `src/data/`, move this folder back under `src/`, and wire it into `src/App.tsx`.
The current shell is `src/App.tsx` with the screens in `src/ui/`.
