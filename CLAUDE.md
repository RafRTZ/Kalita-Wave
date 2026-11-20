# Kalita Wave brew app

Static web app on GitHub Pages (https://rafrtz.github.io/Kalita-Wave/), used daily by two people on iPhones.
The owner is not a developer: explain in plain language, and ask when unsure.

- Full spec: `docs/BUILD_BRIEF.md` (read it before changing anything).
- Answers to open questions and decisions made so far: `docs/DECISIONS.md`.
- The owner's iPhone checklist: `docs/TESTING.md`.

## Rules (brief section 3)

1. Never break the live app. Edit app code only under `next/`. The root app files (`index.html`, `app/`,
   `vendor/`, `assets/`, `manifest.webmanifest`) change only when the owner says "promote", and only through
   `scripts/promote.sh`. `classic.html` is frozen forever.
2. Ask before every push. Show `git diff --stat origin/main` first and say in one line what will change on
   the live site. Local commits are fine, with plain messages.
3. No secrets anywhere; the repo is public. Never ask for a key or password in chat: give the exact
   dashboard field or command instead. Never commit `.env` files, card photos, names, or email addresses.
4. Ask before installing anything on the Mac.
5. No build step, no framework, no runtime CDN. Plain HTML, CSS, and ES modules. Third-party code is
   vendored and pinned under `next/vendor/` with its version and source URL.
6. Brew logic is pure: nothing in `next/app/engine/` touches the DOM, storage, or network. Every coffee
   constant lives in `next/app/engine/constants.js`. Worked examples T1-T12 (brief 5.1) are normative: if
   output differs, the code is wrong or the brief is ambiguous. Stop and say which.
7. Do not invent coffee or gear facts. Brew constants come from the brief. Gear catalog entries need a
   manufacturer source URL; anything unsourced is `verified: false`, and the owner is told.
8. Say what could not be verified. iPhone audio, the silent switch, wake lock, camera capture, and Home
   Screen mode cannot be proven on a Mac. They go on the device checklist, never reported as working.
9. Current docs over memory for Supabase and the Claude API (links in brief section 9).
10. Stop at every checkpoint and report in the format of brief section 8.
11. When the brief is ambiguous or wrong, stop and ask. Record the answer in `docs/DECISIONS.md`.
12. No open-source license file. No analytics. No third-party brand logos.

## Commands

- Run tests: `node --test` (Node's built-in runner, no dependencies). They must pass before every commit.
- Serve locally: `node scripts/serve.mjs`, then open http://localhost:8080/next/ (the root `/` is the live app).
- Promote, only when told: `sh scripts/promote.sh`.
- Regenerate icons after editing the drawing: `node scripts/make-icons.mjs`.

## Layout

- `next/app/engine/`: pure brew and timer logic. `next/app/data/`: gear catalog and household data.
  `next/app/platform/`: storage, audio, wake lock, channel. `next/app/ui/`: screens and `styles.css`.
- `tests/`: `*.test.js`, importing from `next/app/`.
- `supabase/` arrives in Milestone 2.

## Conventions

- Storage keys are `kw:<channel>:v1:<name>`. The channel comes from the URL: `/next/` is `next`, anything
  else is `live`. Never read or write another channel's keys.
- Bump `APP_VERSION` in `next/app/platform/channel.js` with every change the owner will test on a phone.
- Colours are tokens in the `:root` block of `styles.css`; no raw colour values anywhere else. Text is at
  least 14 px (body 16 px), contrast at least 4.5:1, touch targets at least 56 px. Tests enforce these.
- Writing style everywhere (UI text, comments, docs): no en dashes or em dashes, no emojis, no filler.
- Pushing: git on this Mac has no GitHub sign-in. After approving a push, the owner clicks Push origin in
  GitHub Desktop. Then check that `/next/` is live and the root app is unchanged.
- Owed reminder: before any step toward other households or a public release, tell the owner again that
  the commit history carries a personal email address (see `docs/DECISIONS.md`).
