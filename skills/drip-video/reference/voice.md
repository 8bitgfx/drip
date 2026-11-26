# Narration: script, casting and recording (ElevenLabs)

Good narration sounds like one person who knows the product, talking to one viewer. It is written for the ear,
timed to the picture, and recorded as one continuous performance. The voice carries the story; the picture shows
what the words don't need to say. All of it goes through `motion_voice` with the user's own ElevenLabs key
(set on `/drip:settings`; never ask for it in chat).

## Procedure

1. **Decide if the film needs a voice.** Launch films on social often play muted: the film must work with captions
   or on-screen words alone. A voice earns its place when it adds warmth, a point of view or a sentence the
   picture can't show. Ask the user once (with the storyboard) if it isn't obvious.
2. **Write the script against the storyboard**, one line per beat or half-beat, in film time (`at`). Then
   `motion_voice({ action: "speak", dryRun: true, ... })`: it checks pace against each beat, slop and numbers, and
   the characters left on the account, without spending anything.
3. **Cast.** `motion_voice({ action: "voices", use_case, gender, age, accent, search })`. Shortlist 2-4 that fit
   the brand and give the user their preview links (AskUserQuestion with the names; they listen and pick). For a
   close call, `action: "audition"` records the hook line on 2-3 voices (costs characters: say how many).
4. **Record** with `action: "speak"`. Lines are chained (each request carries the ids of the lines before), so tone
   and pace stay one performance. Word timings land in `sound/voice-words.js` (and `.json`) on the film's clock.
5. **Lock picture to words.** Include `sound/voice-words.js` with a `<script src>` (compositions never fetch) and read `window.__voiceWords`: captions appear on their word, and the
   key visual moment of a beat lands on its key word (a number appears as it is said, the logo on the product name).
6. **Mix** happens in `motion_export`: the music ducks under the voice automatically. Then play the render through
   and listen-check with the user. Re-record single lines with the same voice, model and seed.

## Writing for the ear

| Rule | Do | Don't |
|---|---|---|
| One idea a line | "Your notes, already sorted." | "Our AI-powered notes app automatically organises everything for you." |
| Short spoken sentences | 3-10 words; fragments are fine | Clauses stacked with commas |
| Pace | 2.4-2.8 words a second for calm, premium; up to 3.2 for upbeat social | Filling every second |
| Leave air | Ellipses or a full stop where the picture needs a beat | A line running into the next beat |
| Say it as spoken | "forty-seven tabs", "two times faster" (only if true) | "47 tabs", "2x" (normalisation can misread) |
| Specific over grand | "Find last Tuesday's note in one keystroke." | "Unlock seamless productivity." |
| Words don't describe the picture | Picture: notes snapping into folders. Voice: "Finally, somewhere for everything." | Voice: "Watch as your notes are organised into folders." |
| Real claims only | Numbers the user gave you, marked `checked: true` | Invented stats, testimonials or features |

Structure that works for 15-30 s: **hook** (a recognisable problem or a surprising sight, under 2 s), **turn**
(the product's one idea), **proof** (one or two concrete things it does), **name** (the product, said once, on the
logo), optional **ask** (a short call to action). Silence before the name makes it land.

## Casting

- **Match the brand, not "a narrator".** Calm product: warm, unhurried, mid-low, close to the mic. Playful app:
  brighter, quicker, a smile in the voice. Premium hardware: intimate, almost understated. Developer tool: plain,
  dry, confident, never salesy.
- **Avoid the announcer.** Big "movie trailer" or radio-ad voices make a film feel like an ad from 2009.
- **Accent and language** follow the audience; ask if the brand has a preference.
- **Library voices** (`owner/voice` from `action: "voices"`) are added to the user's account before use.
- Show previews, not descriptions: people choose voices by ear. Two or three options, your pick first.

## Models and settings

| Model | Use |
|---|---|
| `eleven_v4` (default) | Most expressive; follows audio tags. Best for short, emotive narration. |
| `eleven_multilingual_v2` | Steadiest over long reads (explainers over a minute); no tags. |
| `eleven_flash_v2_5` | Cheap and fast: drafts and timing tests, then re-record the final on a better model. |

| Setting | Range for narration | Effect |
|---|---|---|
| `stability` | 0.35-0.55 | Lower = more varied, emotive delivery (and more takes needed); higher = even, safer. |
| `similarity_boost` | ~0.75 | How closely it holds the voice's character. |
| `style` | 0-0.3 | Exaggerates the voice's style; costs stability and speed. |
| `speed` | 0.9-1.1 | Small changes only; rewrite the line rather than speed it up. |
| `seed` | fixed per film | Same seed and text = a closer re-take. |

**Audio tags** (`eleven_v4`): one delivery cue at the start of a line, matched to the voice: `[curious]`,
`[excited]`, `[warmly]`, `[whispers]`, `[sighs]`. Describing the quality works too (`[softly, with a smile]`).
More than two tags in a line, or tags that fight the voice, make it worse. Tags can be read as sounds: listen.
Pauses come from punctuation and ellipses, emphasis from one CAPITALISED word at most.

## Timing to picture

- Start a line 0.2-0.4 s after its beat starts (the picture lands first, the voice answers it).
- End each line 0.3-0.6 s before the next beat: the transition needs air.
- `motion_voice speak` reports each line's real start and end and any overlap. If a line runs long, cut words,
  don't speed it up.
- The biggest visual moment and the music's drop are not the place for a long sentence: one or two words, or none.

## Done when

- [ ] The film works muted (captions or on-screen words) and with the voice.
- [ ] The user chose the voice by ear (previews or auditions).
- [ ] Every line fits its beat with air on both sides; no overlaps reported.
- [ ] Captions and key visuals are timed from `window.__voiceWords`, not guessed.
- [ ] No invented numbers; every claim is the user's.
- [ ] The music ducks under the voice in the render, and the user listened to it.
