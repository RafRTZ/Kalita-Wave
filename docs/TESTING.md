# Testing on the iPhones

This is the owner's checklist. Nothing on it can be proven on a Mac, so nothing on it counts as working
until it has been tried on a real phone. Do every item on both phones.

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
   version 2.0.0-m1.2, "Test copy (next)", and "Opened from the Home Screen".
5. Note each phone's iOS version (Settings app, General, About). Keeping the screen awake needs iOS 18.4
   or later.

After any later push: wait two minutes, close the app fully, and reopen it. If "About this copy" still
shows the old version, wait ten minutes and try again. GitHub lets phones keep files for ten minutes.

## Part 1: the sound test (do this first)

It decides how the cues are played. In the app: Settings, "About this copy", Sound test page.

For each of the four situations, set the phone up that way, pick the situation on the page, then go down
the rows: tap Play, listen for about five seconds, and mark what happened.

| Situation | Ringer switch | Music or a podcast in another app |
|---|---|---|
| Silent ON, music playing | silent | playing |
| Silent ON, no music | silent | off |
| Silent OFF, music playing | ring | playing |
| Silent OFF, no music | ring | off |

If music stops during a row, start it again before the next row. When all four are done, tap
"Copy results" and paste them into the chat. One phone is enough for this part unless the two phones run
different iOS versions.

What we hope to find: a row that is heard with the switch on silent and leaves the music playing. If no
row does both, the app stays as built: cues ignore the silent switch, music may pause, and Settings has a
switch to turn that off.

## Part 2: Checkpoint 1 checklist

Use a real brew where it says so. Tick each box on each phone.

| # | Check | How | Pass looks like |
|---|---|---|---|
| 1 | Cues with the silent switch on | Ringer on silent, volume up, start a brew | You hear ticks in the count-in, a chime at 0:00, and a tone, ticks, and chime before each pour |
| 2 | Cues with music playing | Start music in another app, then start a brew | You hear the cues. Note whether the music kept playing |
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

## Expected to fail, by design for now

| # | Check | How | What to expect |
|---|---|---|---|
| 17 | Cold start with no network | Close the app fully, switch on airplane mode, open the app | Most likely an error page instead of the app. An app that is already open keeps working offline. This is the open "service worker" question in `DECISIONS.md` |
| 18 | Cues with the phone locked | Lock the phone mid-brew | No cues. A web app cannot play them while locked or behind another app |

## What to send back

- The sound test results from Part 1.
- For anything that failed: which phone, its iOS version, and what happened instead.
- Your real grind setting.
- For item 8: which scale had flipped to ounces, and whether the steps fixed it. If a double tap on the
  Eureka's TARE button did nothing, say so.
- Whether music stopped when a brew started.

## Not verified yet

Until the items above are done, these are built but unproven: sound with the ringer on silent, sound
alongside music, the screen staying awake, resuming after an app switch or a force-quit on iOS, the Home
Screen icon and name, readability at arm's length, and tap sizes under wet fingers.
