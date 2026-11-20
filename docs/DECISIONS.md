# Decisions

Answers to questions the build brief left open. Newest section last. If something here disagrees with
`BUILD_BRIEF.md`, this file wins, because it records what the owner said after the brief was written.

## Kickoff, 2026-11-20 (owner: "OK, use defaults")

### Questions with an agreed default

1. **Service worker versus "must open with no network".** Milestone 1 ships with no service worker, as the
   brief says. A cold start in airplane mode is on the device checklist so the real behaviour is seen. To be
   settled before Milestone 2, whose checklist requires airplane mode to work. The likely fix is a small
   service worker that prefers the network and uses its saved copy only when offline.
2. **Finer and coarser buttons before beans exist.** In Milestone 1 the per-bag offset is stored against the
   house default recipe (storage name `house`). From Milestone 2 each bean has its own `grind_offset`.
3. **Typical total brew time.** Not asked for. The one-time question asks only for the grind setting.
4. **Recording actual time.** Shown on the Done screen and kept on the phone in the Milestone 2 `brews`
   shape (storage name `brews`). There is no history screen yet.
5. **Dose limits.** Every brewer accepts 5 to 60 g in 1 g steps. Advisories warn; nothing blocks. Each
   brewer remembers its own last dose. The Wave 155 starts at 20 g until the owner gives a usual dose.
6. **Cue overlaps.** With a 3 s heads-up, the heads-up tone replaces the T-3 tick. The count-in ticks for
   its last 3 seconds and the pour chime plays at 0:00.
7. **Sound after a reload or force-quit.** The run resumes at the right second straight away and shows a
   "Tap to turn sound back on" bar, because iPhone audio needs a tap.
8. **"Repo root otherwise untouched".** Read as: `index.html` is unchanged. Milestone 1 adds `classic.html`,
   `CLAUDE.md`, `.gitignore`, `.nojekyll`, `docs/`, `tests/`, `scripts/`, `next/`, and `.claude/launch.json`.
9. **Custom grinder default.** `micronsPerUnit` = 1000 / (max - min + step). Gives 25 for the Virtuoso.
10. **Meaning of `verified`.** True means the fact is in a manufacturer-authored document, wherever it is
    hosted. The Virtuoso `micronsPerUnit` of 25 is an estimate and is marked unverified.
11. **The brief is public.** `docs/BUILD_BRIEF.md` is committed and will be public after the first push.

### Readings of the brief

- "Total" in the R1 and R2 formulas is the rounded total. T3 only matches that way.
- Identity (R0) leaves water, steps, and time unchanged. Grind still goes through the grinder formula. When
  a card prints no drain time, the finish time is the baseline formula.
- Advisory limits are inclusive: a dose equal to a hard limit is a caution, not a warning. "The other Wave
  fits" means the dose is inside that brewer's hard limits.
- R1 does not enforce the 20 s minimum gap. Inside hard limits this only shows up on the provisional V60 at
  10 g (pours at 0:25 and 0:40). Left as is.
- "17-19 is normal" is the shown setting plus or minus one grinder step.
- Calibration stores the grinder offset in whole steps: the owner's setting minus the app's setting for the
  same brew with zero offsets.
- In ounces, targets and water show one decimal; the dose shows two (36 g is 1.27 oz).
- The channel comes from the URL: a path containing `/next/` is `next`, anything else is `live`. Settings
  and calibration entered on `/next/` do not carry to the live icon. In Milestone 1 each phone holds its own.
- Milestone 1 gear screens: view gear, switch brewer and grinder, add the provisional V60 and Chemex, custom
  grinder, scale notes, calibration. No custom brewer or custom scale form.
- "Brew screen" and "timer screen" are one screen in different states.

## Milestone 1 build, 2026-11-20

### Decisions made while building (the brief did not specify these)

- **Where numbers live.** Engine constants, the house recipe, and timer constants are in
  `next/app/engine/constants.js`. Brewer, grinder, and scale profiles are catalog data in
  `next/app/data/catalog/`. Catalog files are `.js` modules that export plain data.
- **Done button.** It appears once the last pour has started. "Back to timer" on the Done screen undoes a
  Done tapped by accident; the clock carries on as if it had not been tapped.
- **A brew nobody finishes.** It ends itself 10 minutes after the target with no time recorded, and the
  screen is allowed to sleep. A run left paused for 30 minutes, or left on the Done screen for 30 minutes,
  is dropped the next time the app is opened.
- **Pause** works during the count-in too. The screen is kept awake while paused.
- **Late cues.** A cue up to 0.3 seconds late still plays at once. Anything older is a missed cue and is
  never replayed.
- **Audio hand-back.** The app closes its audio at Done, Reset, and when sound is switched off, so other
  apps get the phone's audio back.
- **Audio session type, provisional.** "Play cues when the phone is on silent" on uses `playback`; off uses
  `ambient`. To be confirmed or changed by the sound test in `docs/TESTING.md`.
- **Reset** is a one-second press and hold. A keyboard gets a confirm box instead.
- **Dose entry.** Typed doses are rounded to whole grams and kept within 5 to 60 g.
- **Per-recipe grind adjustment** is cleared when the active grinder changes, because it is counted in the
  old grinder's numbers.
- **Custom grinder.** Saving one does not make it active; "Use this" does.
- **Cards for an "other" device.** The rebuilt recipe's intermediate targets are rounded to 5 g.
- **Test copy name.** One manifest serves both copies. On `/next/` the page suggests the name
  "Kalita Next" for the Home Screen.
- **Records kept on the phone** use the field names planned for the Milestone 2 tables: gear has `kind`,
  `catalog_id`, `custom`, `offset`, `note`, `active`; a brew has `bean_id`, `member_id`, `brewed_at`,
  `brewer_id`, `dose_g`, `water_g`, `grind_setting`, `target_s`, `actual_s`, `rating`, `taste`, `note`.
- **Extra files.** `.claude/launch.json` lets Claude Code start the local server. `scripts/make-icons.mjs`
  draws the icon. `scripts/serve.mjs` is the local server.

### Gear sources checked on 2026-11-20

- **Baratza Virtuoso.** Baratza's chart (as republished by Clive Coffee) lists Virtuoso: espresso 8,
  AeroPress 12, Hario V60 15, automatic brewer 18, Chemex 20, French press 28. It does not separate the
  original Virtuoso from the Virtuoso+. Baratza's manual confirms 40 settings and the ranges 1 to 14
  espresso, 16 to 32 filter or drip, 34 to 40 press. The manual prints no model number and no micron
  figures, so "model 586" rests on the owner and 25 microns per setting stays an unverified estimate.
- **Acaia Lunar 2021.** Every step in the brief matches Acaia's manual for firmware 1.0.016. Added from the
  manual: a double tap on Power switches the scale off by default; the sleep timer can be 5, 10, 20, 30, or
  60 minutes, or off; zero tracking, filter, and calibration steps for a drifting reading.
- **Eureka Precisa.** The brief said its manual could not be retrieved. It was found: Eureka's own
  "Digital scale Precisa" user handbook (Conti Valerio S.r.l., 11-2021), on a third-party host. The entry
  is now marked verified from that handbook: double tap the right-hand TARE button to switch grams and
  ounces. Still unconfirmed: whether a Bluetooth version switches units the same way, and whether
  starting the scale's timer keeps it from switching off after 3 minutes.

### Open questions for the owner

1. **Service worker** (kickoff item 1). Needed before Milestone 2 if a cold start in airplane mode must
   work.
2. **Audio session type.** Waiting for the sound test results. (Answered below: sound test result.)
3. **Rounding collisions in R1.** For some future card, scaling to a small dose could round two pours to
   the same target or the same second. Milestone 1 cannot reach that case (it only has the house recipe).
   Proposed for Milestone 2: merge the two pours. Needs a yes.
4. **Origami with no filter named.** The engine returns "unknown" for that device, so the bean form will
   have to ask which filter. Milestone 2.
5. **Usual dose on the Wave 155.** 20 g is assumed. (Answered below: 18 g.)
6. **Draft tips** for the V60 and the Chemex wait for review.
7. **Commit history shows a personal email address.** The two commits already on GitHub carry it as the
   author, and new commits will too unless git is switched to GitHub's no-reply address. (Answered below:
   accepted for now, with a reminder owed.)
8. **Commit trailer.** Local commits end with a "Co-Authored-By: Claude" line, which contains a no-reply
   address. Say so if it should be dropped before the first push. (No objection; kept.)

## Owner answers after the Checkpoint 1 report, 2026-11-20

- **Usual doses.** 36 g when brewing for two, on the Wave 185. 18 g for a single cup, on the Wave 155. The
  155 now starts at 18 g (it was 20 g by assumption).
- **Eureka Precisa.** Not a Bluetooth version, as far as the owner knows. The double tap on TARE is the
  expected fix for ounces.
- **Personal email in commit history.** Accepted for now, because the app is only for the owner's
  household. A reminder is owed: before any step toward other households or a public release, raise this
  again. At that point new commits should use GitHub's no-reply address, and the older commits need a
  decision (rewrite the history, or leave it). The owner has been told that the repo is public today, so
  the address is already readable in the history.
- **Service worker and draft tips.** Explained in chat. No decision yet: the service worker question stays
  open for Milestone 2, and the V60 and Chemex tips stay marked as drafts.
- **How pushes happen.** git on this Mac has no saved GitHub sign-in, so the command-line push was refused.
  Until that changes, the owner pushes by clicking Push origin in GitHub Desktop after Claude has shown
  what the push would change. Installing GitHub's command-line tool (`gh`) would let Claude push directly;
  that needs the owner's OK, like any install.

## Sound test result, 2026-11-20

Run by the owner on an iPhone, from the Home Screen icon, on version 2.0.0-m1.2, with the page
`next/audio-test.html`. All four situations were tried. "Heard" means the cues were audible.

| Audio session type | Silent ON, music playing | Silent ON, no music | Silent OFF, music playing | Silent OFF, no music |
|---|---|---|---|---|
| auto | silent, music kept on | silent | heard, music stopped | heard |
| ambient | silent, music kept on | silent | heard, music kept on | heard |
| transient | silent, music kept on | silent | heard, music kept on | heard |
| transient-solo | silent, music stopped | silent | heard, music stopped | heard |
| playback | heard, music stopped | heard | heard, music stopped | heard |
| play-and-record | silent, music stopped | silent | heard, music stopped | heard |

- **Finding.** No type is both heard on silent and friendly to other audio. Only `playback` is heard with
  the switch on silent, and it always stops the music. `ambient` and `transient` never stop the music and
  are heard over it when the ringer is on, but the silent switch mutes them.
- **Decision (final).** The brief's fallback applies, and it is what was built. The setting "Play cues when
  the phone is on silent" is on by default and uses `playback`. Switched off, it uses `ambient`.
- **What that means in the kitchen.** Setting on: cues are always heard, and music or a podcast stops when
  a brew starts. Setting off: music keeps playing with the cues over it, and with the phone on silent
  there is no sound, only the on-screen cues. A web app cannot do better: sound that mixes with music
  while ignoring the silent switch needs the native app in brief section 7.
- **Why the app never leaves the type on `auto`.** `auto` is the worst of both: muted on silent, and it
  stops the music when the ringer is on. The app sets `playback` or `ambient` before every sound.
- **`transient`** behaved the same as `ambient` here. `ambient` is kept. If cues prove hard to hear over
  music, `transient` is the one to try next.
- **After Done.** Music does not come back by itself. Reported by the owner on iOS 27.2.1 with the
  on-silent setting on, and found annoying. See "Music after a brew" below.
- **Also reported by the phone.** It offers the audio session and wake lock controls in Home Screen mode.
  Whether the screen really stays on for a whole brew is checklist item 3.

## Checkpoint 1 device results, 2026-11-20

- The owner ran the 16 checks in `docs/TESTING.md` from the Home Screen icon and reported every one as
  passing, on a phone running iOS 27.2.1. Only that phone had been checked at that point. (Updated below:
  second phone.)
- The sound test (Part 1) is complete; see "Sound test result" above.
- Known: with the on-silent setting on, music stops at Start and stays off after Done. The owner finds
  that annoying. A web app cannot hand the music back: see "Music after a brew" below.
- Not reported yet: the two checks that are expected to fail for now (a cold start in airplane mode, and
  cues while the phone is locked).
- Nothing at the repo root has changed. The next step is the owner's: say "promote" when ready.

## Music after a brew, 2026-11-20

The owner's report: with the on-silent setting on, music stops at Start and does not come back after Done.

- **Why.** When Safari's engine lets go of the phone's audio, it does not tell other apps that they may
  resume. That was a deliberate change in 2020: WebKit commit "Do not notify other applications when
  deactivating the audio session" (https://commits.webkit.org/220003@main). A web page cannot change it.
- **Why not both at once.** WebKit's engineers describe two fixed behaviours: audio that mixes with other
  apps and obeys the silent switch, or audio that interrupts other apps and ignores the switch
  (https://bugs.webkit.org/show_bug.cgi?id=252746, the comments by Jer Noble).
- **How this was checked.** Claude read that commit and those bug comments directly. A research pass over
  the Safari 27 source reported that the same call is still in place in iOS 27.0 to 27.2, and that a request
  for mixing options is still open (https://github.com/w3c/audio-session/issues/18); those two points
  were not re-checked line by line.
- **So.** No web app can make the music come back by itself. The native app in brief section 7 could.
- **What the app now does (from version 2.0.0-m1.4).** At Done, Reset, and New brew it first switches to
  the music-friendly audio type, then closes its audio half a second later. The aim is to be fully out of
  the way, so one tap on play (lock screen, Control Center, or headphones) restarts the music. Not yet
  tried on a phone. It is a long shot that this also brings the music back by itself.
- **Ways to ease it, as put to the owner.**
  1. On days with music or a podcast, use the "Off" side of the on-silent switch: nothing stops, and the
     cues play over it when the ringer is on. This works today.
  2. A one-tap sound choice on the brew screen (cues even on silent, cues over music, or no sound), so the
     choice is made per brew without opening Settings. Not built.
  3. A "Resume music" button on the Done screen that runs an Apple Shortcut the owner creates once. Not
     built, not tested from a Home Screen app, and one more moving part.
- **Owner's answer, 2026-11-20: "No, leave it."** Asked whether to add the sound choice to the brew screen
  (option 2). It is not being added. The on-silent switch stays where it is, in Settings, and the app stays
  as version 2.0.0-m1.4 has it. Option 3 was not asked for either. Neither is to be offered again unless
  the owner brings the music up, or the two checks in Part 3 of `TESTING.md` change the picture.

## Second phone, and the 2.0.0-m1.4 push, 2026-11-20

- **Second phone.** The owner's report, in full: "worked on 2nd phone". Taken as: the app was used on the
  second phone and nothing went wrong. Not stated, so not assumed: which of the checks were run there,
  that phone's iOS version, and whether it was on version 2.0.0-m1.3 or 2.0.0-m1.4.
- **Push.** The owner pushed 2.0.0-m1.4. Checked straight after: the test copy on the site serves
  2.0.0-m1.4, all 32 files under `next/` match the repo, and `index.html` and `classic.html` on the site
  are still the original calculator.
- **Where Checkpoint 1 stands.** Both phones are now reported as working. The audio change in 2.0.0-m1.4
  (Part 3 of `TESTING.md`, checks A and B) has not been reported on a phone yet. The next step is the
  owner's: say "promote" when ready.

