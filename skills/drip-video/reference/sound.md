# Sound: direction, not generation

Sound is half of a film and is designed with the picture. Your job is sound DIRECTION: you choose, arrange and mix
existing recordings whose licences you have verified. You never compose music or synthesise sound effects in code
(no Web Audio, no Tone.js, no generated tones), and you do not pretend to. Generated beeps and drones sound cheap;
chosen recordings sound produced.

## What the tools do

| Tool | Does |
|---|---|
| `motion_music` search | Whole licensed tracks (Jamendo and others via Openverse), each with its licence; never ND (no cutting to picture) |
| `motion_music` analyse | Measures a track: BPM, beat grid, bars, sections by energy, builds, DROPS, quiet bars; the energy bar by bar as text (8 bars a line, with builds, drops and your beats marked); how far the storyboard's beats sit from bar lines |
| `motion_music` use | Copies the track into `<film>/sound/` with its licence; `from` starts it later so its drop meets your moment |
| `motion_music` generate | FALLBACK only when the user asks (quote them): Eleven Music with a composition plan timed to the storyboard. Suno has no public API; a track made there comes in with `use` |
| `motion_sound` | Search CC0 recordings and presets (sfx.akalan.dev incl. SFX Kit, foleykit, Kenney, Openverse/Freesound) with sync points; record cues placed so each sound's sync point lands on its moment |
| `motion_voice` | Narration with ElevenLabs: casting, auditions, chained recording, word timings (`drip_guide video/voice`) |
| `motion_export` | Mixes it all: music ducked under the voice, cues on top, limited; or one plain `audio` file |
| `motion_study` with role `sound` | Measures a reference film; you read how audio lands on its cuts |

**Find before you make.** Music and effects are found (libraries, the user's own files) first; generated music is
the last resort and only on the user's word.

**The default film is almost dry of effects.** No whooshes, risers, booms or cheap beeps. When an effect is used it
is a smooth, calm UI sound (a soft click, a glassy tap, a gentle pop, a tick, a soft chime) on a meaningful
interaction or landing, -12 to -18 dB under the music. Most beats get none. `motion_sound` cue flags density,
repetition, whooshes and cues where nothing moves (after `motion_trace`).

## Order of work

1. **Pick the music before choreographing when music drives the story** (a launch film, a brand film, a logo
   sting with a rhythm). Set the tempo, the build and the drop first; put the labels on them.
2. For explainers and product demos, picture and narration lead; music supports. Choose it after the storyboard.
3. Write the sound plan in `motion_storyboard` (`sound`, and per-beat `sound`): feel, tempo, where the accents
   land, where it goes silent.
4. Choose recordings. Record source and licence for each one (below) before it goes into the film.
5. Cue the film: put accents on timeline labels at beat times.
6. Mix, then review twice: the film muted, and the soundtrack alone.

## Music selection

- Match brand personality and audience: a calm tools brand, a playful consumer app and a security product do
  not share a sound. Write three words for the music as for the visuals.
- Prefer music with a visible structure (intro, build, drop, outro) so the film's peaks have something to land on.
- Length: pick a track that is the film's length or cut it at a phrase boundary; do not fade out a track that was
  not made to end.
- Avoid: generic corporate music (a clean guitar and a clap), repetitive loops that never develop, anything where
  the tempo fights the picture's rhythm.
- Land major transformations on accents, builds and drops. The biggest visual moment sits on the biggest
  musical moment, within 1-2 frames.

## The beat grid

Beat detection is manual for now. Get the tempo (tap it against the track or read it from the file's metadata or
the source site), then compute the grid.

```js
const BPM = 112, BEAT = 60 / BPM, OFFSET = 0.18;        // OFFSET: seconds to the first downbeat in the file
const beat = (n) => OFFSET + n * BEAT;                  // n-th beat, absolute film time
tl.addLabel("drop", beat(16))                           // bar 5, the drop
  .addLabel("hit1", beat(17))
  .addLabel("hit2", beat(18));
```

At 112 BPM a beat is 0.536s, a bar is 2.14s. Design moves in whole beats: a transition of 2 beats, a hold of 4.
Check with `motion_frames` at `beat(n)` times that the accent frames are real events (an impact, a reveal), not
empty moments.

## Sound effects (SFX)

- Add a sound only on a meaningful moment (a landing, a click that causes a change, the logo settling). No
  whoosh on every move. A film with 6-10 deliberate sounds beats one with 40.
- Match each sound to the object's material, weight, speed and scale:

| Object | Sound |
|---|---|
| Glass panel sliding | soft, high, short; no thud |
| Heavy metal landing | low thud with a long tail, a small camera shake in the picture |
| Paper card | light slap or a rustle |
| Cursor click | a short, clean tick |
| Elastic snap | a spring pluck, fast and bright |
| Large fast move | a longer sweep, quiet at the start and peaking near the stop |
| Small fast move | a very short, quiet tick |

- Layer subtle sounds for richer impacts: a low body for weight, a mid click for the contact, a high tail for air.
  Each layer quiet; the sum is full.
- Avoid: excess whooshes, cheap beeps and UI sounds that do not match the picture, sounds without a visible cause.

## Layers: foreground, support, ambient

| Layer | Role | Level (against the loudest peak at 0 dB) |
|---|---|---|
| Foreground | what the viewer must hear now: narration, the key impact | -6 to -3 dB |
| Support | music under narration, secondary SFX | -18 to -12 dB under narration, -10 to -6 dB alone |
| Ambient | air, room tone, a low bed that makes silence feel alive | -30 to -24 dB |

Narration stays clear over music: duck the music 8-12 dB when the voice is on, fade over about 0.3s. A track can
be quieter in the voice band by choosing a calmer part of the music.

## Silence

- Silence before the biggest hit makes it bigger: drop the music out 0.3-1.0s before the drop.
- A held frame with no sound reads as confidence. An accidental silence reads as a bug.
- Silence is planned: write it in the beat's `sound` field.
- Do not start with silence as a default; a film that autoplays muted on social needs to work without audio.

## Reviewing sound

1. **Muted:** the film must work with no sound (social feeds autoplay silently). Hook, story and type must carry.
2. **Soundtrack alone:** the audio tells a shape of its own (build, release, ending). If it is flat alone, it will be
   flat in the film.
3. **Together:** accents land within a frame or two of the visual event; nothing arrives before its cause.
4. Check the end: the music resolves on the last frame, or a clean tail leaves the logo in silence.

## Sources and licences

| Source | Licence to expect | Check |
|---|---|---|
| Freesound | CC0 or CC-BY (CC-BY-NC is not for commercial use) | each sound's own page and its author; attribution text |
| Pixabay | Pixabay Content Licence (no attribution required, limits on resale as sound) | the licence page at download time |
| Mixkit | Mixkit licence (free for commercial use in a project) | the file's page |
| The user's own library | their rights | ask what they own |

Rules:

- Every imported sound records, before the film is distributed: the file name, the source URL, the author, the
  licence and the attribution text if one is required. `motion_sound` records the cues; a cue with no source and
  licence is not finished.
- Licences change and sites differ by sound. Verify each file; do not assume a site is all CC0.
- If there is no verified licence, do not ship the sound; pick another.
- Credit CC-BY sounds in the film's description or end text as the licence asks.

## Mixing in Drip

`motion_export` mixes one audio file under the picture (`audio`). Build the soundtrack as one prepared file
(music plus SFX plus any narration) and pass it. Keep a peak of about -1 dB, loudness near -14 LUFS for social and
-16 to -18 for a quiet web hero. If the track is longer than the film, `motion_export` with `to` ends at the
film's end; cut at a phrase.

## Checks

- [ ] The sound plan is in the storyboard (feel, tempo, accents, silence).
- [ ] The big transformation lands on an accent, build or drop.
- [ ] Sounds exist only on meaningful moments and match material, weight and speed.
- [ ] Narration is clear; music ducks under it.
- [ ] Every sound has a recorded source and licence.
- [ ] The film works muted; the soundtrack works alone.
- [ ] No generated tones or synthesised effects in the code.
