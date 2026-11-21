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
  the way, so one tap on play (lock screen, Control Center, or headphones) restarts the music. Not tried
  on a phone when this was written. (Updated below: check A was reported as passing.) It is a long shot
  that this also brings the music back by itself.
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
- **Check A, music after a brew.** Reported by the owner as passing: after a brew has stopped the music,
  one press of play brings it back without opening the music app. Not stated, so not assumed: whether the
  brew was ended with Reset (the quick way) or with Done after a real brew, where play was pressed, and
  on which phone. Nothing was said about the music coming back by itself.
- **Check B, two brews in a row.** Reported by the owner as passing: a brew started straight after
  another one still has its cues. Not stated: whether the first brew was ended with Reset or with Done
  and New brew.
- **Where Checkpoint 1 stands.** Both phones are reported as working, and checks A and B pass. Nothing on
  the device checklist is waiting, apart from the two items that are expected to fail for now (17 and
  18), which have not been reported. The next step is the owner's: say "promote" when ready.

## Promote, 2026-11-20

- **The owner said "Promote".** That closes Checkpoint 1.
- **What was done.** `scripts/promote.sh` ran for the first time. 128 tests passed, `classic.html` was
  confirmed as the original, and the tested app was copied from `next/` to the root: 31 files in `app/`,
  `vendor/`, `assets/`, plus `index.html` and `manifest.webmanifest`. The live app is version 2.0.0-m1.4.
- **Checked on the Mac before the push.** The root copies are identical to `next/`. Served locally, the
  root opens the new app as the live copy (its storage names start `kw:live:`), runs a brew, and resets.
  `classic.html` is the old calculator, and `/next/` is still the test copy.
- **Not checked, because a Mac cannot.** The live Home Screen icon on the phones: Part 4 of `TESTING.md`.
  Expected, not verified: each phone's live copy starts with fresh settings and asks the grind question
  again, and an existing icon keeps its old picture and name until it is deleted and added again.
- **Not promoted.** `next/audio-test.html`, the sound test page, stays on the test copy only.
- **Undoing a promote.** Revert the promote commit and push, and the old page is back at the root. Until
  then the old calculator is always at `classic.html`.
- **Pushed and checked, 2026-11-20.** After the owner's push the site's front page is the new app. All 31
  promoted files on the site match the repo, the 32 files of the test copy still match, and
  `classic.html` is still the original. Opened in a desktop browser, the live link shows the new app with
  its one-time grind question and no errors. What the live Home Screen icon does on the phones is for
  the owner to report: Part 4 of `TESTING.md`.
- **First report from the phones, 2026-11-20.** The owner's words: "the old app link works, but the icon
  didn't update. it's just a blank "K" app". Taken as: the old calculator still opens (P5 in Part 4 of
  `TESTING.md`), and the usual Home Screen icon still has its old picture, a blank tile with the letter
  K. Not stated, so not assumed: which phone or phones, whether the old calculator was opened from the
  button in Settings or from its link, whether the icon opens the new app, and whether deleting the icon
  and adding it again had been tried.
- **Why the icon is a "K".** Checked in the files: `classic.html`, which was the front page until the
  promote, names no icon picture at all, and its title is "Kalita Wave Calculator". With no picture to
  use, a phone draws the first letter of the name. An iPhone copies the picture when an icon is made and
  does not fetch it again, so a promote cannot change an icon that already exists. Both are long-standing
  iPhone behaviour, not something tested here, and the report fits them. This was listed as expected
  before the push.
- **What a new icon will get.** Checked on the Mac: the live front page names `assets/icon-180.png` as
  its icon and "Kalita Wave" as its name, and the site serves that picture, byte for byte the one the
  Kalita Next icon uses. That icon was reported as showing the dripper (check 15). Not verified: a new
  icon made from the live link on the phones. The steps are in Part 4 of `TESTING.md`, "Getting the
  dripper icon, step by step". The old calculator stores nothing on the phone, so removing the old icon
  loses only the settings the new app has saved inside it since the promote.
- **Two things noticed on the way.** The live address typed in lower case (`kalita-wave`) is an error
  page, so the capitals matter. And once the live icon is remade, it and Kalita Next show the same
  picture, told apart by the name under the icon and by the "NEXT" label inside the test copy. A marked
  icon for the test copy would be an app change, and the owner has not asked for one.
- **The new icon, 2026-11-20.** Asked whether the newly made icon shows the brown dripper, the owner
  answered "Yes, both phones". So an icon made from the live link gets the dripper picture on both
  phones. Not stated, so not assumed: that it opens full screen, that the grind question and a real brew
  went through on it (P2 to P4 in `TESTING.md`), and whether the old "K" icon was removed.

## Where things stand at the end of Milestone 1, 2026-11-20

- **Live.** The live app and the test copy are both version 2.0.0-m1.4. The original calculator is at
  `classic.html`. Each phone has a live icon with the dripper picture, and a Kalita Next icon for the
  test copy.
- **Still unproven on the phones.** Listed under "Not verified yet" in `TESTING.md`. None of it holds up
  Milestone 2.
- **To settle with the owner at the start of Milestone 2.**
  1. Service worker. Checkpoint 2b needs the app to open in airplane mode. Today a cold start with no
     network most likely fails (item 17 in `TESTING.md`, not reported yet). Proposed at kickoff: a small
     service worker that prefers the network and uses its saved copy only when offline.
  2. Rounding collisions in R1. Proposed: merge two pours that round to the same target or the same
     second. Needs a yes.
  3. A card that prints Origami with no filter named. The bean form will have to ask which filter.
  4. The V60 and Chemex tips are still drafts waiting for review.
- **Owed.** Before any step toward other households or a public release, the reminder that the commit
  history carries a personal email address.
- **Not to be offered again** unless the owner brings the music up: the sound choice on the brew screen
  and the "Resume music" shortcut ("Music after a brew" above).
- **Optional, and it needs the owner's OK like any install.** GitHub's command-line tool (`gh`), so
  Claude can push without GitHub Desktop.

## Screen rework, 2026-11-21 (version 2.0.0-m1.5)

- **What the owner asked for.** In their words: the app "looks a bit amaturish overall", "I'd like to
  remove the vertical scrolling", and "add a visual to each steps count down. perhaps shading moving
  across each of the steps as they complete". Of the timer's clock and its "Pour to" card: "i like how
  the font is big to see from several feet away, but it's unnecessarly large". A screenshot from one
  phone came with that. It shows a Dynamic Island, and its proportions fit the iPhones that are 393
  points wide; that width is a reading of the picture, not something the owner said.
- **What changed.** One typeface everywhere, the phone's own, in place of the serif. The brew screen and
  the timer are each exactly one screen tall, and the pour plan gives up height first. On the timer each
  step row is shaded from left to right as its time runs, with a thin line at the moving edge, and a
  finished row stays shaded. At that phone's width the clock went from about 122 px to about 75 px and
  the "Pour to" weight from 64 px to about 55 px. Both stay above the brief's floors of 64 and 40.
- **Decisions the owner did not specify.** Any of these can be undone.
  1. Settings moved from the top right to a round button at the bottom left, beside Start. The top right
     now holds the same two things on both screens: g / oz and "?".
  2. Technique tips left the brew screen for a page of their own, opened from the pour plan ("Wave 185
     tips"). The sentence that grind and finish time are rules of thumb is on that page.
  3. The recipe's name ("House default") is under the app name. The footer used to carry it.
  4. On the timer, "what is next" is a strip at the bottom of the "Pour to" card. In the heads-up window
     the strip fills and shows the countdown number. It replaces the separate "next" card.
  5. At the target the card reads "Let it drain", with "Tap Done when the bed is dry" above it.
  6. A switch shows its chosen side as a white pill with a brown ring, so Start is the only solid brown
     button on the brew screen.
  7. The dose row and the grind row share one card, with the grind note on one line under them.
- **Where it still scrolls.** Settings, Scale help, and the other sheets are lists and scroll as before.
  A dose outside a brewer's hard limits (36 g on the Wave 155) adds a red warning and an eighth row, and
  that screen scrolls by about 30 px at the screenshot phone's size. A caution (45 g on the Wave 185)
  still fits.
- **Checked on the Mac.** In a desktop browser at 393 by 771 (the screenshot phone, less its status bar
  and with its home bar area allowed for), at 375 by 647 (an iPhone SE), and at 430 by 839: the brew
  screen and the timer fit with no scrolling at 36 g on the Wave 185 and 18 g on the Wave 155, in grams
  and in ounces. The count-in, the heads-up, the last pour, the target, pause, and Done all draw
  correctly; the flash at the start of a pour was looked at by forcing it. Settings, Scale help, the tips
  page, calibration, and the sound test page look right.
- **Not verified.** Anything on an iPhone. This Mac has no iPhone simulator (Xcode is not installed), so
  the layout has only been seen in a desktop browser, whose engine is not Safari's. Part 5 of
  `TESTING.md` is the phone checklist.
- **A rule from now on.** The brew screen and the timer must not scroll vertically. Whatever Milestone 2
  adds to those two screens has to fit the same way. The Milestone 2 session was told, and it kept off
  the screen files while this was done.

## Pushing without GitHub Desktop, 2026-11-21

- **The owner asked:** "can you push things for me so i don't need to do anything?" A command-line push
  is still refused on this Mac: git has no GitHub sign-in of its own, only GitHub Desktop does.
- **Two ways were put to the owner.** A key that can push to this repo only (nothing installed, one line
  pasted into one GitHub page). Or GitHub's command-line tool, `gh` (installed with Homebrew, which is
  already on this Mac, then a sign-in approved in the browser; it works for every repo the owner has).
  The owner's answer: "can i just log into github here?" Taken as a wish for a plain sign-in, which is
  the second way. It needs an install, so the owner was asked for a yes to that before anything was
  installed. The owner then asked "which is better/simpler/more secure?" and, told that the key unlocks
  this one repo while the sign-in unlocks every repo on the account, answered "Yes, use the key".
  Nothing was installed.
- **What was set up on this Mac.** A key pair made for this purpose: the private half is the file
  `~/.ssh/kalita_wave_deploy`, with no passphrase so a push needs nobody at the keyboard; the public half
  is beside it with `.pub`. Its fingerprint is `SHA256:t/S1DC6NUfTnVRHVZEiyJMHexi2UGkL54DxmPdrXagw`.
  GitHub's own server keys, fetched from `https://api.github.com/meta`, are in
  `~/.ssh/kalita_wave_known_hosts`. In this repo's local git settings (not committed) there is a second
  remote named `deploy` that pushes over SSH with that key. The `origin` remote that GitHub Desktop uses
  is unchanged, so Push origin in GitHub Desktop still works as before.
- **The owner's part.** Adding the public half to the repo on GitHub: Settings, Deploy keys, Add deploy
  key, with "Allow write access" ticked. Until that is done the key opens nothing.
- **How to push with it.** `git push deploy main`, then `git fetch origin` so git's picture of GitHub is
  up to date, then check the site.
- **How to take it away.** Delete the key on that same GitHub page. To clean up the Mac as well: delete
  the two key files and run `git remote remove deploy` and `git config --unset core.sshCommand` in the
  repo.
- **When to ask before a push.** Asked when Claude should still ask first, the owner chose "Only for the
  live app". So, from the moment Claude can push: changes to the test copy and to the docs are pushed
  when they are ready, and the owner is told what went out. A push that changes the live app still needs
  the owner's word, and that word is the same as before: "promote". This replaces rule 2 of the brief
  ("Ask before every push"). `CLAUDE.md` says so since the first push with the key.
- **The key was added, 2026-11-21.** The owner added the public half on GitHub under the title
  "Claude on this Mac", with write access. The screenshot they sent of the Deploy keys page shows one
  key, "Read/write", with the fingerprint written above. GitHub then accepted the key from this Mac.
- **The first push with it, 2026-11-21.** `24ffb0f..f6f9275`, six commits: the screen rework
  (2.0.0-m1.5) and the notes written since the promote. Before it: the difference from GitHub touched
  none of the live app files, and all 132 tests passed. After it, checked on the site: the test copy
  serves 2.0.0-m1.5 and all 34 of its files match the push; the 31 files of the live app match too, and
  it still says 2.0.0-m1.4; `classic.html` is the original calculator.
- **The owner asked what the push went to:** "so are we pushing to a test environment? is this something
  i can keep saved on my phone to see changes before we push to the shared live file?" Yes to both. It
  is the test copy, the Kalita Next icon. Every change goes there first, and the live app that both
  phones use changes only on "promote".

## Second promote, 2026-11-21 (version 2.0.0-m1.5)

- **The phone report.** Asked "Does the new look work on your phone?", the owner answered "Looks good".
  Not stated, so not assumed: which phone or phones, which of the Part 5 checks were run, and whether a
  real brew was timed with it.
- **The owner's word.** "push to live prod version". Read as "promote": it came straight after "Looks
  good", and the live app is the only thing it can mean.
- **What was done.** `scripts/promote.sh` ran. 132 tests passed, `classic.html` was confirmed as the
  original, and the test copy was copied to the root. Eight files under `app/` changed, two of them new
  (`ui/parts.js`, `ui/technique.js`). The live app is now 33 files, each identical to its twin in
  `next/`. `next/audio-test.html` stays on the test copy only, as before.
- **Checked on the Mac before the push.** Served locally at 393 by 771: the root opens as the live copy,
  version 2.0.0-m1.5, with no "NEXT" label. The brew screen and the timer each fit with no scrolling,
  the shade moves across the current step, Done and New brew work, and the browser reports no errors.
  `classic.html` is the old calculator and `/next/` is still the test copy.
- **What the phones keep.** Settings, gear, and the grind answer. The rework changed nothing about what
  is stored or under which names, so the live icon should open with everything as it was. Expected, not
  verified on a phone.
- **Not checked, because a Mac cannot.** The live icon on either phone. For the second phone nothing has
  been reported about this version at all, on the test copy or the live one. Part 6 of `TESTING.md` is
  the short list.
- **Undoing it.** Revert the promote commit and push: the live app is 2.0.0-m1.4 again.
- **Pushed and checked, 2026-11-21.** `a77ad19..982de7b`, pushed with the key. On the site afterward:
  the live app serves 2.0.0-m1.5 and all 33 of its files match the push, the 34 files of the test copy
  match too, and `classic.html` is the original calculator. Opened in a desktop browser at 393 by 771,
  the live link shows the new look with no "NEXT" label, fits with no scrolling, and reports no errors.
  What the Kalita icon shows on the phones is for the owner to report: Part 6 of `TESTING.md`.
- **The phones, 2026-11-21.** Asked "Does the Kalita icon show the new look on both phones?", the owner
  answered "Yes, both phones". So the live icon shows the new look on both. Not stated, so not assumed:
  that the version line was read, that the settings carried over with no grind question, that the timer
  was looked at on the second phone, and that a real brew was run with it (L2 to L4 in Part 6 of
  `TESTING.md`).

## Grind and Brew parts, 2026-11-21 (version 2.0.0-m1.6)

- **What the owner asked for.** With a screenshot of the test copy, the grind row circled: "can we make
  this part a little smaller. don't htink the grind size needs to be so large. we usually don't change
  the grind size much. still want to see it there, but can be slightly smaller than the amount of beans
  we are grinding. and is there something we can do to separate the top portion which is for grinding,
  and bottom which is for brewing? do it and push to test site".
- **The grind row.** The grind number is 24 px; the dose stays 34 px. Finer and Coarser are drawn as
  outlines 44 px tall and 88 px wide, where they were 56 by 96. Their tap area is still 56 px tall, so
  they are as easy to hit as before. The row is 12 px shorter.
- **The two parts.** The brew screen now has two labelled parts. "Grind" is the card with the dose and
  the grind setting. "Brew" is one card with water, water temperature, and finish time across its top
  and the pour plan under them. Those three numbers used to stand alone between the two cards. There is
  16 px between the two parts, against 10 px between other things.
- **Decisions the owner did not specify.** Any of these can be undone.
  1. The words "Grind" and "Brew" for the two parts.
  2. The three numbers moved into the Brew card.
  3. The label "Pour plan" is gone from the brew screen. "Brew" stands in its place, with the tips link
     ("Wave 185 tips") to its right.
  4. The sizes: 24 px for the grind number, 44 px for the outlines of Finer and Coarser.
- **Checked on the Mac.** In a desktop browser at 393 by 771: the brew screen fits with no scrolling, in
  grams and in ounces, at 36 g on the Wave 185 and 18 g on the Wave 155, with a caution showing (45 g on
  the Wave 185), and with a grind adjustment showing. Where the tap areas of Undo and the tips link
  meet, Undo keeps all of its own. 36 g on the Wave 155 still scrolls, by 28 px. It also fits at 393 by
  706 (the height of the owner's screenshot, which was taken in Safari), at 375 by 647 (an iPhone SE),
  and at 430 by 839. The tips page opens from its new place. The timer and Done are unchanged and were
  run once. 133 tests pass. One is new: the grind number must stay smaller than the dose, and Finer and
  Coarser must keep their full tap area.
- **Not verified.** Anything on an iPhone. Part 7 of `TESTING.md` is the phone checklist.
- **Where it is.** On the test copy only. The live app stays at 2.0.0-m1.5 until the owner says
  "promote".
- **Pushed and checked, 2026-11-21.** `afc955e..ee31f5d`. On the site afterward: the test copy serves
  2.0.0-m1.6 and all 34 of its files match the push; the live app still serves 2.0.0-m1.5 and its 33
  files are unchanged; `classic.html` is the original calculator. Opened in a desktop browser at 393 by
  771, the test link shows the two parts, fits with no scrolling, and reports no errors.

## Grind beside the grams, and the drain question, 2026-11-21 (version 2.0.0-m1.7)

- **What the owner said about 2.0.0-m1.6.** "i don't love it. since the grind size rarely changes,
  think we can put it on the same line as the grams just with a smaller numbering to the right of the
  grams as a recommendation? and afterwards we can ask if it drained too fast/slow after the poiur is
  done so we can adjust for next time? plan before build". Then, while the plan was being made: "would
  still want an easy way to inc/dec the grams of beans though", "that would also free up vertical
  space", "changeing the grind size (from a standard recommendation) just isn't something that i'll do
  until after we brew", and "if we changed it recently, maybe have a popup recommendation. can that be
  shared between my wife and I?"
- **The plan.** Shown as a drawing of two screens and four steps, with two choices left open and a pick
  named for each. The owner answered "Build it", so both picks stand: the message about a changed grind
  is a line on the brew screen, not a popup that must be closed, and the small "Grind" and "Brew"
  labels stay.
- **Brew screen.** The Grind part is one row: minus, the grams, plus, and beside them the grind number,
  set smaller (24 px against 34). Finer, Coarser, and the "Start here. 17 to 19 is normal" line are
  gone from this screen. The row is 87 px shorter than the card it replaces, and the pour plan rows
  grew from 44 px to 52 px with it. A tap on the grind number opens a grind page with the range, the
  microns, and Finer and Coarser.
- **After Done.** The Done screen asks "How did it drain?" with Too fast, About right, and Too slow.
  Too slow moves the grind one step coarser for the next brew, too fast one step finer, about right
  leaves it. The clock's own reading is ringed with a dashed line as a suggestion and is never applied
  by itself. The change is counted from the grind the brew was made with, so a changed answer replaces
  the earlier one and never stacks. Skipping the question changes nothing.
- **The message.** After an answer that moved the grind, the brew screen shows a line under the row,
  for example "Grind is now 19, was 18. Last brew drained slow." with Undo, and draws the grind number
  in the accent colour. It stays until the next brew starts.
- **Where the rule comes from.** Brief 6.3: more than 25 s over the target suggests one step coarser,
  more than 25 s under suggests one step finer, "Apply or dismiss; never automatic". Both numbers are
  in `constants.js`, and the rule is in the new `engine/dialin.js`. Nothing was invented. The brief's
  rule also listens to taste, bitter or sour; that part waits for the bean log in Milestone 2.
- **Where this departs from the brief, by the owner's wish.**
  1. Brief 5.2 put "finer and coarser buttons beside the grind on the brew screen". They are on the
     grind page now, one tap away.
  2. Brief 5.2 wanted the grind always shown as "Virtuoso 18, start here, 17-19 is normal". The brew
     screen shows "18" and "Virtuoso grind"; the rest of that line is on the grind page.
  3. Brief 6.3 put the dial-in line "on the next brew of that bean". The question is asked straight
     after Done instead, and the next brew shows what came of it.
  4. Brief 6.2's `brews` table gains one field, `drain`: fast, ok, or slow, empty until answered.
- **Sharing between the two phones.** Not possible in this version, and the owner was told so: each
  phone still stores everything by itself, and shared storage is what Milestone 2 builds. What this
  version saves is in the shape Milestone 2 will sync. The house record, which stands in for a bag
  until then, carries `grind_offset` and `grind_change` (`brew_id`, `from_offset`, `drain`,
  `changed_at`), and each saved brew carries `drain`. The Milestone 2 session was given this as part of
  its work.
- **Decisions the owner did not specify.** Any of these can be undone.
  1. The words: "How did it drain?", "Too fast", "About right", "Too slow", and the hint "The clock
     says slow. Tap to confirm, or pick another."
  2. The dose reads "36 g" over "coffee". In ounces the line under it gives the dose in ounces.
  3. A grind changed by hand on the grind page clears the message, since Undo would no longer mean one
     thing.
  4. "Back to timer" on the Done screen takes the answer back together with its grind change.
  5. At the end of the grinder's range the grind stays where it is, and the Done screen says so.
- **Checked on the Mac.** In a desktop browser at 393 by 771: the brew screen fits with the message
  showing and without it, in grams and in ounces, at 36 g on the Wave 185, at 18 g on the Wave 155, with
  a caution (45 g on the Wave 185), and with a warning (36 g on the Wave 155, which scrolled by 28 px
  in 2.0.0-m1.6 and now fits). The whole round was run: Start, Done, each answer in turn, "Back to
  timer", Done again, New brew, the message, Undo, and a new Start that clears the message. The numbers
  saved on the way were read back and are right at each step. The brew screen, the timer, and the Done
  screen also fit at 375 by 647 (an iPhone SE), and the brew screen at 430 by 839 and at 393 by 706.
  One case was found that scrolls: the largest dose (60 g) on the Wave 185 at the iPhone SE size with
  the message showing, by 79 px. Other doses outside a brewer's limits were not all tried at that size.
  145 tests pass, 12 of them new.
- **Not verified.** Anything on an iPhone. Part 8 of `TESTING.md` is the phone checklist.
- **Where it is.** On the test copy only. The live app stays at 2.0.0-m1.5 until the owner says
  "promote".
- **Pushed and checked, 2026-11-21.** `96dea6c..3745ae4`. On the site afterward: the test copy serves
  2.0.0-m1.7 and all 36 of its files match the push; the live app still serves 2.0.0-m1.5 and its 33
  files are unchanged; `classic.html` is the original calculator. Opened in a desktop browser at 393 by
  771, the test link shows the one-row Grind part with no Finer or Coarser, fits with no scrolling, and
  reports no errors.

