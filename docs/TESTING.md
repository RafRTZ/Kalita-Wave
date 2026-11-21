# Testing on the iPhones

This is the owner's checklist. Nothing on it can be proven on a Mac, so nothing on it counts as working
until it has been tried on a real phone. Do every item on both phones.

**Status, 2026-11-20:** Part 1 is done. All 16 checks in Part 2 were reported as passing on one phone,
running iOS 27.2.1. The second phone was reported as working; which checks were run there, and its iOS
version, have not been noted. Both checks in Part 3 were reported as passing.

## Where things are

- **Test copy:** https://rafrtz.github.io/Kalita-Wave/next/ (only exists after a push).
- **Live app:** https://rafrtz.github.io/Kalita-Wave/ stays exactly as it is until you say "promote".
- **Original calculator, frozen:** https://rafrtz.github.io/Kalita-Wave/classic.html (after a push).

## Set up each phone

1. Open the test copy link in Safari.
2. Tap Share, then Add to Home Screen. If the name is not already "Kalita Next", type that, so it cannot
   be mixed up with the live icon.
3. Open it from the new icon. From here on, always use the icon, not Safari.
4. Tap the settings button (three sliders, top right) and scroll to "About this copy". It should say
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
| 16 | The live app is untouched | Open your usual Kalita icon or the live link | It is exactly the old calculator |

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
3. Open the test copy from the Kalita Next icon and tap the settings button (three sliders, top right).
   - Scroll to the bottom, to "About this copy". It must say Version 2.0.0-m1.4.
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
