# Testing on the iPhones

This is the owner's checklist. Nothing on it can be proven on a Mac, so nothing on it counts as working
until it has been tried on a real phone. Do every item on both phones.

**Status, 2026-11-20:** Part 1 is done. All 16 checks in Part 2 were reported as passing on one phone,
running iOS 27.2.1. The second phone was reported as working; which checks were run there, and its iOS
version, have not been noted. Both checks in Part 3 were reported as passing. The owner then said
"promote", so the live app is now the new app. Part 4 is the short list for the live icon. First report
on it: the old calculator still opens, and the usual icon kept its old picture, a blank tile with a "K".
That is what an icon made before the promote does. A new icon was then made on each phone with the steps
in Part 4, and both were reported as showing the dripper.

**Since 2026-11-21:** the owner asked for a calmer look, no vertical scrolling, and shading on the steps.
That is version 2.0.0-m1.5. It went to the test copy first (the Kalita Next icon). The owner tried it
there, answered "Looks good", and asked for it on the live app. So since the second promote, also on
2026-11-21, the live app is 2.0.0-m1.5 as well. Part 5 is its checklist; which of its checks were run,
and on which phone, has not been noted. Part 6 is the short list for the live icon: the owner has
reported that the icon shows the new look on both phones, and nothing else from that list yet.

**Also since 2026-11-21:** the owner asked for a smaller grind row and for the screen to be split into a
part for grinding and a part for brewing. That was version 2.0.0-m1.6. The owner looked at it and did not
love it, and asked for the grind beside the grams and a question after each brew instead. That is version
2.0.0-m1.7, on the test copy only (the Kalita Next icon). Part 8 is its checklist. Part 7 is kept as a
record of the version it replaced.

**And then, the same day:** the owner sent two screenshots of 2.0.0-m1.7 from a phone, the brew screen and
the timer just after Start, and asked that the bottom section stay exactly the same between the two. The
screenshots show the one-row Grind part as designed and both screens fitting at 36 g on the Wave 185; no
check from Part 8 was reported in words. Version 2.0.0-m1.8 keeps the list of pours and the buttons in
place. It is on the test copy only. Part 9 is its checklist, and nothing in it has been tried on a phone
yet.

## Where things are

- **Test copy:** https://rafrtz.github.io/Kalita-Wave/next/ gets every change first.
- **Live app:** https://rafrtz.github.io/Kalita-Wave/ is the new app since the promote of 2026-11-20,
  and version 2.0.0-m1.5 since the second promote of 2026-11-21. It changes only when you say "promote".
- **Original calculator, frozen:** https://rafrtz.github.io/Kalita-Wave/classic.html

## Set up each phone

1. Open the test copy link in Safari.
2. Tap Share, then Add to Home Screen. If the name is not already "Kalita Next", type that, so it cannot
   be mixed up with the live icon.
3. Open it from the new icon. From here on, always use the icon, not Safari.
4. Tap the settings button (three sliders: a round button at the bottom left, beside Start, from version
   2.0.0-m1.5; at the top right before that) and scroll to "About this copy". It should say
   "Test copy (next)", "Opened from the Home Screen", and the version named in the chat after the latest
   push (2.0.0-m1.2 after the first one).
5. Note each phone's iOS version (Settings app, General, About). Keeping the screen awake needs iOS 18.4
   or later.

After any later push: wait two minutes, close the app fully, and reopen it. If "About this copy" still
shows the old version, wait ten minutes and try again. GitHub lets phones keep files for ten minutes.

## Part 1: the sound test (done)

Done on 2026-11-20, all four situations. The full table is in `DECISIONS.md`. What it settled:

- Only one audio type is heard with the ringer on silent, and it stops music from other apps.
- So the app keeps its switch, in Settings: "Play cues when the phone is on silent".
  - **On (the default):** cues are always heard, and music or a podcast stops when a brew starts.
  - **Off:** music keeps playing with the cues over it, and the silent switch mutes the cues.

The Sound test page is still there (Settings, "About this copy") if a new phone or a new iOS version
needs checking.

## Part 2: Checkpoint 1 checklist

Use a real brew where it says so. Tick each box on each phone.

| # | Check | How | Pass looks like |
|---|---|---|---|
| 1 | Cues with the silent switch on | Ringer on silent, volume up, on-silent setting on (its default), start a brew | You hear ticks in the count-in, a chime at 0:00, and a tone, ticks, and chime before each pour |
| 2 | Cues with music playing | Start music in another app, then start a brew. Then switch the on-silent setting off, ringer on, and do it again | Setting on: you hear the cues and the music stops, which is expected. Setting off: the music keeps playing and you hear the cues over it. Known, and not a failure: with the setting on, the music stays off after Done until you start it again |
| 3 | Screen stays on for a whole brew | Start a brew and do not touch the phone | The screen is still on at the finish time, about four and a half minutes later |
| 4 | Switch apps for 20 seconds | Mid-brew, open another app, wait 20 s, come back | The clock is right to the second. No pile-up of late sounds. If sound is off, a red bar says so and one tap brings it back |
| 5 | Force-quit mid-brew | Mid-brew, swipe the app away, then open it again | The timer comes back at the right second with the red "Sound is off" bar. One tap brings sound back |
| 6 | Readable at arm's length | Phone on the counter, stand where you pour | You can read the elapsed time and "Pour to ... g" without leaning in |
| 7 | g / oz switch | Tap oz on the brew screen and on the timer | Every target shows in ounces. 36 g on the Wave 185 reads 3.2, 7.4, 11.8, 16.0, 20.3 |
| 8 | Scale help, ounces | Put each scale into ounces on purpose, tap ?, follow "Scale is showing ounces" | The steps get that scale back to grams. If not, write what worked in "Our note" |
| 9 | Grind calibration | First open asks once. Or: Settings, Grinders, Calibrate | After you enter your real setting, the brew screen shows that number for that brew |
| 10 | The house recipe | No changes: Wave 185 at 36 g | Water 576 g, Virtuoso 18 before calibration, finish 4:25, pours at 0:00 to 90, 0:40 to 210, 1:20 to 335, 2:00 to 455, 2:40 to 576 |
| 11 | Brewer switch | Tap Wave 155, change its dose, tap Wave 185, tap Wave 155 again | The 155 starts at 18 g and the 185 at 36 g, and each remembers its own dose. 36 g on the 155 shows a warning that names the Wave 185, and Start still works |
| 12 | Reset is hard to hit by accident | During a brew, tap Reset quickly, then hold it | A quick tap does nothing. Holding for one second resets |
| 13 | Pause and Done | Pause, wait, resume. Tap Done at the end | The clock picks up where it paused. Done shows target next to actual. "Back to timer" undoes a Done tapped by accident |
| 14 | Wet-hand taps | Use the app with wet fingers | Buttons are big enough to hit first time |
| 15 | Home Screen icon | Look at the icon | A brown dripper with wave lines on cream |
| 16 | The live app is untouched (before the promote only) | Open your usual Kalita icon or the live link | It is exactly the old calculator. Since the promote it shows the new app: see Part 4 |

## Part 3: two checks for version 2.0.0-m1.4

This version changes how the app lets go of the phone's audio when a brew ends. One phone is enough.

| # | Check | How | Pass looks like |
|---|---|---|---|
| A | Music after a brew | The steps are spelled out under "Check A, step by step" below | The music restarts with one press of play. Say so if it ever comes back by itself |
| B | Two brews in a row | The steps are spelled out under "Check B, step by step" below | You hear the cues in the second brew too |

### Check A, step by step

What it is for: with the on-silent setting on, music stops when a brew starts and does not come back by
itself. This check finds out whether one press of play brings it back, without opening the music app.

Set up:

1. Silent mode on the phone: on or off, it makes no difference to this check.
2. Volume: up far enough to hear music.
3. Open the test copy from the Kalita Next icon and tap the settings button (three sliders: top right in
   version 2.0.0-m1.4, bottom left beside Start from 2.0.0-m1.5).
   - Scroll to the bottom, to "About this copy". It must say Version 2.0.0-m1.4 or later.
   - Scroll back up to "Timer and sound". "Sound cues" must be On, and "Play cues when the phone is on
     silent" must be On. Both start that way. Leave the other settings alone.
   - Tap Done at the top right to close Settings. That is a different Done from the one in step 7.

Run it:

4. Open the music or podcast app and start something playing. Leave it playing.
5. Go back to Kalita Next. The music should still be playing.
6. Tap Start. The music stops, and you hear ticks and then a chime. That is expected.
7. End the brew, one of two ways:
   - Quick, no coffee needed: after the first chime, press and hold Reset (bottom left) for one second.
     The app goes back to the brew screen.
   - Real brew: when you finish, tap the Done button at the bottom right. It only appears once the last
     pour has started (2:40 for 36 g on the Wave 185, 2:00 for 18 g on the Wave 155). The app shows the
     Done screen. Do not tap "Back to timer".
8. Wait two seconds. Do not open the music app.
9. Press play in one of these places:
   - Control Center: swipe down from the top right corner of the screen (on a phone with a Home button,
     swipe up from the bottom edge), then tap play on the music controls.
   - Lock screen: press the side button to lock the phone, wake it, then tap play on the music controls.
   - Headphones: press their play button.

What to report:

- **Pass:** the music starts again from that one press.
- **Fail:** nothing plays, or there are no music controls, or the controls show something other than the
  music. Say which, and where play was pressed.
- Also say so if the music ever comes back by itself, with no press at all.

The quick way and the real brew run the same code in the app, but a phone may treat four minutes of
silence differently from ten seconds. If the quick way passes, try it once more at the end of a real brew.

### Check B, step by step

What it is for: the app now closes its audio when a brew ends. This check makes sure a brew started right
after another one still has its sounds. No music is needed.

1. Same set-up as check A: Version 2.0.0-m1.4, both sound switches On, volume up.
2. Tap Start. You hear ticks and then a chime.
3. End the brew, one of two ways:
   - Quick, no coffee needed: after the first chime, press and hold Reset (bottom left) for one second.
   - Real brew: tap Done at the end, then tap New brew on the Done screen.
4. As soon as the brew screen is back, tap Start again.
5. Listen for the ticks and the chime again.

What to report:

- **Pass:** the second brew has its ticks and chime, the same as the first.
- **Fail:** the second brew is silent, or a red bar says "Sound is off. Tap here to turn it back on."
  Say which.

Hold Reset for one second to clear the second brew afterwards.

## Part 4: after the promote

The live app became the new app with the promote of 2026-11-20. Do these on each phone, with your usual
Kalita icon, not Kalita Next. Wait two to ten minutes after the push first.

| # | Check | How | Pass looks like |
|---|---|---|---|
| P1 | The live icon shows the new app | Open your usual Kalita icon | The new brew screen, with no "NEXT" label beside the name. In Settings, "About this copy" says "Live copy" and Version 2.0.0-m1.4 |
| P2 | It opens as an app | Look at the screen after opening it from the icon | Full screen, with no Safari address bar. "About this copy" says "Opened from the Home Screen" |
| P3 | The grind question | The live copy asks its one question on first open | After you enter your real setting, the brew screen shows that number |
| P4 | One real brew | Make coffee from the live icon | Cues play, the screen stays on, and Done shows target next to actual |
| P5 | The old calculator is still there | Settings, "About this copy", "Original calculator" | The old calculator opens |

Reported so far, 2026-11-20: P5 passes ("the old app link works"). The usual icon did not change its
picture ("it's just a blank "K" app"). A new icon was then made from the live link with the steps below,
and it shows the brown dripper on both phones ("Yes, both phones"). P1 to P4 have not been reported one
by one.

Good to know:

- The live copy keeps its own settings on each phone. Nothing carries over from Kalita Next, so set the
  sound switches and the grind setting once more.
- An icon made before the promote keeps its old picture and name. An iPhone copies the picture at the
  moment the icon is made and does not fetch it again. The old calculator page had no icon picture, so
  the phone drew the first letter of its name, a "K" on a blank tile. The steps below make a new icon.
- If P2 fails and Safari's address bar shows, make a new icon the same way.
- Kalita Next stays as the test copy. Later changes land there first.

### Getting the dripper icon, step by step

Do this on each phone. It makes the new icon first and removes the old one last, so there is always a
working icon.

1. Open the live link in Safari, not from an icon: https://rafrtz.github.io/Kalita-Wave/
   - Typed by hand, the capital K and the capital W matter. In lower case the site shows an error page.
   - Tapping the link in a message or a note, or scanning a code for it with the camera, avoids typing.
2. Check the page before going on. It must be the new brew screen, with no "NEXT" label beside the name.
   - If it is the old calculator, the phone is showing a kept copy. Reload the page, or wait ten minutes
     and reload.
   - If it says "NEXT", this is the test copy. Take `next/` off the end of the address.
3. Tap Share, then Add to Home Screen, the same way the Kalita Next icon was made.
4. Look at the small picture beside the name before tapping Add.
   - It should be the brown dripper on cream, and the name should read "Kalita Wave". Tap Add.
   - If the picture is a "K", or a small snapshot of the page, tap Cancel, reload the page, and try once
     more. If it is still not the dripper, stop and report it.
5. The Home Screen now has two icons: the new dripper named "Kalita Wave", and the old "K". Open the
   new one. It should fill the screen, with no Safari address bar.
6. Answer the grind question and set the sound switches once more. A new icon is expected to start with
   fresh settings.
7. Remove the old "K" icon: touch and hold it until a menu appears, choose the delete or remove option,
   and confirm. The wording differs between iPhone versions. This removes only that icon and the
   settings saved inside it. The old calculator saved nothing, so nothing of it is lost, and it stays
   available under Settings, "About this copy", "Original calculator".

Afterwards the live icon and Kalita Next show the same dripper picture. The name under the icon tells
them apart, and inside the app the test copy says "NEXT" beside the name. Moving Kalita Next to another
screen, or into a folder, keeps it out of the way of the morning brew.

What to report:

- **Pass:** the new icon shows the dripper and opens the new app full screen.
- **Fail:** what the small picture showed in step 4, and what the page looked like in step 2.

## Part 5: the new look (version 2.0.0-m1.5)

On 2026-11-21 the owner asked for three things: a less amateurish look, no vertical scrolling, and
shading that moves across each step as it runs. The clock and the "Pour to" weight were also to come down
in size while staying readable from several feet. This version went to the test copy first and has been
on the live app too since the second promote of 2026-11-21, so either icon shows it.

What moved:

- **Settings** is the round button at the bottom left, beside Start (three sliders). It used to be at the
  top right.
- **g / oz** and **?** are at the top right, on the brew screen and on the timer.
- **Technique tips** open from "Wave 185 tips" (or "Wave 155 tips") at the top right of the pour plan.
- **The "NEXT" label** is under the name "Kalita Wave", next to the recipe's name.

| # | Check | How | Pass looks like |
|---|---|---|---|
| N1 | The right version | Tap the round button at the bottom left, then scroll to "About this copy" | Version 2.0.0-m1.5. Tap Done at the top right to close |
| N2 | The brew screen fits | Look at the brew screen, then try to drag it up and down | Everything from "Kalita Wave" down to Start is on screen at once. There is nothing more to scroll to, and nothing is cut off at the bottom |
| N3 | The timer fits | Tap Start and look | The clock, "Pour to", every step, and the Reset and Pause buttons are on screen at once. Nothing scrolls |
| N4 | Shading on the steps | Watch the list of steps during a brew | A tan shade with a thin brown line at its edge moves from left to right across the current step. It reaches the right edge as the next pour starts. Finished steps stay shaded |
| N5 | Countdown to the next pour | Watch the strip under the "Pour to" weight in the last 5 seconds before a pour | The strip fills with shade and a large number counts 5, 4, 3, 2, 1. The card then turns brown for two seconds as the pour starts |
| N6 | Size of the numbers | Phone on the counter, stand where you pour | The clock and the "Pour to" weight are smaller than before and still easy to read from several feet |
| N7 | Both brewers | Wave 185 at 36 g, then Wave 155 at 18 g | Each fits one screen with no scrolling, before and after Start |
| N8 | Wet-hand taps | Tap the minus and plus buttons, Finer, Coarser, Start, and Pause | Each is hit first time |

Known, and not a failure: a dose far outside a brewer's range (36 g on the Wave 155) adds a red warning
and one more row, and that screen scrolls a little.

What to send back: for anything that fails, which phone it was and what you saw. A screenshot helps most.

## Part 6: after the second promote (version 2.0.0-m1.5 on the live icon)

Use the usual Kalita icon, not Kalita Next. Close the app fully first, then open it. If it still shows
the old look, wait ten minutes and try again: GitHub lets phones keep files for ten minutes.

| # | Check | How | Pass looks like |
|---|---|---|---|
| L1 | The live app has the new look | Tap the round button at the bottom left, then scroll to "About this copy" | Version 2.0.0-m1.5 and "Live copy." |
| L2 | Nothing was forgotten | Look at the brew screen and at Settings | Your grind number, your usual dose, grams or ounces, and the sound choices are as you left them. The grind question is not asked again |
| L3 | One real brew | Brew as usual from the Kalita icon | Cues play, the screen stays on, the shade moves across the steps, and Done shows target next to actual |
| L4 | The second phone | Open Kalita on it, then tap Start | Both screens fit, with nothing cut off and nothing to scroll to |

## Part 7: Grind and Brew (version 2.0.0-m1.6, replaced by Part 8)

Kept as a record. Version 2.0.0-m1.7 replaced this one the same day, so G3 and G4 no longer apply: the
grind row they describe is gone. G2, G5, and G6 are covered again in Part 8.

On 2026-11-21 the owner asked for the grind row to be smaller than the dose, and for the top of the
screen (grinding) to be set apart from the bottom (brewing).

What moved:

- **Water, water temp, and finish** are now the top strip of the lower card, above the pour plan.
- **Technique tips** open from "Wave 185 tips" (or "Wave 155 tips") to the right of the word "BREW".
- **The label "POUR PLAN"** is gone. "BREW" stands in its place.

| # | Check | How | Pass looks like |
|---|---|---|---|
| G1 | The right version | Tap the round button at the bottom left, then scroll to "About this copy" | Version 2.0.0-m1.6. Tap Done at the top right to close |
| G2 | Two parts | Look at the brew screen | A small "GRIND" label over the card with the grams of coffee and the grind. A small "BREW" label over one card with water, water temp, finish, and the pour plan |
| G3 | The grind is smaller | Compare the two numbers in the Grind card | The grind number is clearly smaller than the grams of coffee, and still easy to read |
| G4 | Finer and Coarser | Tap Coarser once, then tap Undo in the line that appears | Each is hit first time. The grind number goes up by one step, then back |
| G5 | Still one screen | Try to drag the brew screen up and down, at 36 g on the Wave 185 and at 18 g on the Wave 155 | Nothing scrolls and nothing is cut off |
| G6 | Tips | Tap "Wave 185 tips" | The tips page opens. Tap Close to come back |

## Part 8: grind beside the grams, and "How did it drain?" (version 2.0.0-m1.7)

On 2026-11-21 the owner asked for the grind to sit beside the grams as a smaller number to read, and for
a question after each brew that adjusts the grind for next time. This version is on the test copy only:
use the Kalita Next icon. Close it fully first, then open it.

Since 2.0.0-m1.8 the icon shows that version, so H1 reads 2.0.0-m1.8 now (S1 in Part 9 is the same
check). One thing in H2 to H10 looks different: water, water temp, and finish sit in a strip of their own
above the list. The rest still applies as written.

What moved:

- **The grind** is the smaller number at the right of the grams, on the same row. It has no buttons.
- **Finer and Coarser**, and the "Start here. 17 to 19 is normal" line, are on a page of their own. Tap
  the grind number to open it.
- **After Done** there is one question, "How did it drain?".
- **Each phone keeps its own grind for now.** A change made on one phone does not reach the other until
  Milestone 2 brings accounts.

| # | Check | How | Pass looks like |
|---|---|---|---|
| H1 | The right version | Tap the round button at the bottom left, then scroll to "About this copy" | Version 2.0.0-m1.7. Tap Done at the top right to close |
| H2 | One row for grinding | Look under the word "GRIND" | One row: minus, the grams, plus, then a smaller grind number with "Virtuoso grind" under it. No Finer or Coarser |
| H3 | Grams still easy | Tap minus and plus a few times | Each tap is hit first time, and water, finish, and the pour plan change with the grams |
| H4 | Still one screen | Try to drag the brew screen up and down, at 36 g on the Wave 185 and at 18 g on the Wave 155 | Nothing scrolls and nothing is cut off. The pour plan rows are taller than before |
| H5 | The grind page | Tap the grind number | A page opens with the number, Finer and Coarser, and "Start here. 17 to 19 is normal". Tap Close to come back |
| H6 | The question | Brew as usual, and tap Done when the bed is dry | Under Target and Actual: "How did it drain?" with Too fast, About right, and Too slow. If the brew ran more than 25 seconds over or under the target, one of them has a dashed ring |
| H7 | An answer moves the grind | Tap "Too slow" | The line under the choices reads "Next time: Virtuoso 19, one step coarser than today." (your numbers may differ). Tapping "About right" instead reads "No change" |
| H8 | The message | With "Too slow" chosen, tap New brew | Under the grams: "Grind is now 19, was 18. Last brew drained slow." with Undo, and the grind number is brown |
| H9 | Undo | Tap Undo | The message goes and the grind is back to what it was |
| H10 | The message leaves by itself | Answer "Too slow" after one brew and leave the message alone. Brew again, then look at the brew screen after that brew | The message is gone. The grind keeps its new number |

What to send back: for anything that fails, which phone it was and what you saw. A screenshot helps most.
Also worth a word: whether the three answers are easy to hit with a wet finger, and whether one step per
brew feels like the right size of change.

## Part 9: the list stays put when Start is tapped (version 2.0.0-m1.8)

On 2026-11-21 the owner sent a screenshot of the brew screen and one of the timer, and asked that the
bottom section stay exactly the same between the two, so that only the top is seen to change. This
version is on the test copy only: use the Kalita Next icon. Close it fully first, then open it.

What moved:

- **The list of pours** is one card, the same on both screens: same place, same size, same words.
- **Water, water temp, and finish** are in a strip of their own, just above the list.
- **Reset, Pause, and Done** are a little taller, the height Start already was.

| # | Check | How | Pass looks like |
|---|---|---|---|
| S1 | The right version | Tap the round button at the bottom left, then scroll to "About this copy" | Version 2.0.0-m1.8. Tap Done at the top right to close |
| S2 | The list does not move | At 36 g on the Wave 185, keep your eye on the list of pours and tap Start | The top changes to the countdown. The list stays exactly where it was: no row shifts, grows, or shrinks |
| S3 | The buttons stay in their row | Same tap, watching the bottom | Reset and Pause appear in the row where the settings button and Start were. Pause is as tall as Start was, and its top and bottom edges are where Start's were |
| S4 | The other brewer | Hold Reset for one second, switch to the Wave 155 at 18 g, tap Start | The same: the list stays put |
| S5 | With the grind message | After a brew answered "Too slow", tap New brew, look at the list, then tap Start | The list is a little shorter while the message shows, and still does not move when Start is tapped |
| S6 | Still one screen | Try to drag the brew screen and the timer up and down | Nothing scrolls and nothing is cut off |
| S7 | The list during a brew | Let a brew run | The shading moves across the rows as before, and the list stays where it is until Done |

What to send back: if anything in the list still shifts, the same two screenshots as before, one just
before Start and one just after. Which phone it was helps too.

## Expected to fail, by design for now

| # | Check | How | What to expect |
|---|---|---|---|
| 17 | Cold start with no network | Close the app fully, switch on airplane mode, open the app | Most likely an error page instead of the app. An app that is already open keeps working offline. This is the open "service worker" question in `DECISIONS.md` |
| 18 | Cues with the phone locked | Lock the phone mid-brew | No cues. A web app cannot play them while locked or behind another app |

## What to send back

- The iOS version of the second phone. The first is on 27.2.1.
- For anything that failed: which phone, its iOS version, and what happened instead.
- Your real grind setting.
- For item 8: which scale had flipped to ounces, and whether the steps fixed it. If a double tap on the
  Eureka's TARE button did nothing, say so.

## Not verified yet

- **On the second phone:** it was reported as working, with no list of which checks were run. Any check
  not tried there is still unproven on that phone. The ones that depend most on the phone itself are 1 to
  5: sound on silent, sound with music, the screen staying on, switching apps, and a force-quit.
- **Part 3 after a real brew:** checks A and B were reported as passing, without saying whether that was
  the quick way (Reset) or the end of a real brew. If it was the quick way, check A is worth one more try
  after a real brew.
- **Not reported yet:** items 17 and 18, the two that are expected to fail for now.
- **Version 2.0.0-m1.5, the new look:** the owner tried it on the test copy and answered "Looks good",
  without saying which phone or which of the Part 5 checks. After the second promote the owner reported
  that the Kalita icon shows the new look on both phones. Not reported one by one: L2 to L4 in Part 6
  (settings kept, one real brew, and the timer on the second phone). On the Mac it has only been seen in
  a desktop browser set to phone sizes, whose engine is not Safari's.
- **Version 2.0.0-m1.6, Grind and Brew:** replaced by 2.0.0-m1.7 before any check was reported.
- **Version 2.0.0-m1.7, grind beside the grams and the drain question:** the owner's two screenshots show
  it running on a phone, with the one-row Grind part and both screens fitting. Nothing else from Part 8
  has been reported. Whether one step per brew is the right size of change, and how the three answers
  feel under a wet finger, are for real brews to say.
- **Version 2.0.0-m1.8, the list staying put:** all of Part 9. Measured only in a desktop browser set to
  phone sizes, where the list and the buttons land on the same pixels before and after Start. That
  browser's engine is not Safari's, so the phone has the last word.
- **After the promote:** P5 is reported as passing, and the new live icon is reported as showing the
  dripper on both phones. Not reported one by one: P1 to P4. The first real brew from the new icon
  covers them: it should open full screen, ask the grind question once, play its cues, keep the screen
  on, and show target next to actual at Done. Also not said: whether the old "K" icon has been removed.
