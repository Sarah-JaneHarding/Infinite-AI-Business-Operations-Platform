# GitHub is the source of truth

The copy of this repository on GitHub (`Sarah-JaneHarding/infinite-ai-business-operations-platform`, branch `main`)
is the real one. Anything else is a working copy.

## What that means

- **A change is real when it is on `main`** and the CI workflow (`.github/workflows/ci.yml`) has passed.
  A change that exists only in AI Studio, a zip file or a laptop is not part of the product.
- **AI Studio exports are working copies.** An export (the `.zip`) differs from GitHub in ways that matter:
  it carries a `.env` file, and has no `package-lock.json` and no `Dockerfile`. Do not unzip one over
  the repository. To use work done in AI Studio, push it to a branch, open a pull request and let CI run.
- **Never commit secrets.** `.env` and `.env.*` are ignored; only `.env.example` (names, no values) is tracked. CI
  fails if any other environment file is tracked. If a real value was ever in a zip, a chat or a commit, rotate it:
  deleting the file does not make the value safe again.
- **One lockfile.** `package-lock.json` is the lockfile that CI and the `Dockerfile` use (`npm ci`). `bun.lock`
  is also tracked but nothing uses it; do not rely on it.

## How to make a change

1. `git checkout -b fix/short-description` from an up-to-date `main`.
2. Make the change. Run `npm run lint`, `npm test` and `npm run build` locally.
3. Push the branch and open a pull request. Do not commit directly to `main`.
4. Merge when CI is green.

## Related

- `legacy/README.md`: the earlier shell that is kept out of the build.
- The education platform (`infinite-ai-ecosystem`) is the product this repository supports. This repository must not
  gain a second path to a model provider or hold learner personal information.
