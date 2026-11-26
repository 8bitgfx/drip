# Research: studying reference films

A film made without references repeats the average of everything the model has seen. Studying 1-3 real films before
the storyboard gives you specific techniques to take, and a standard to beat. The storyboard requires at least one
studied reference with what you take from it.

## The four roles

Study each reference for one role; one film can fill more than one, but name what you are using it for.

| Role | What you take | Question |
|---|---|---|
| **Moves** | choreography, transitions, timing, easing character, how objects enter, change and leave | How does it get from one scene to the next? |
| **Look** | type, colour, composition, texture, materials | What would a still from it teach about the frame? |
| **Story** | structure, hook, pacing, ending | What does it show, in which order, and why? |
| **Sound** | music choice, where accents land, silence | How does audio reinforce the picture? |

A MOVES reference is required before `motion_storyboard`. A LOOK reference alone is not enough: copying a look
without understanding the moves produces a pretty slide deck.

Do not mix them up: a film with a beautiful look and weak moves is a look reference only.

## The ten study questions

For each film, answer in a few words:

1. What does it communicate (the one idea)?
2. Why does the opening work (what is the hook)?
3. Where does the eye go, and in what order?
4. What is the main visual metaphor?
5. How do objects enter, move, transform and exit?
6. How do compositions connect (what is shared across each transition)?
7. What are the timing, easing, spacing and choreography (lead, follow, stagger, counter-motion)?
8. How does sound reinforce it (accents, build, silence)?
9. What can be learned and recreated in this project's own terms?
10. What would be inappropriate here (wrong brand, wrong tone, a trick that only fits that product)?

Write answers 5-7 as concrete techniques. "Smooth and modern" is not a technique. "The card's right edge springs 0.1s
before its left edge; the content blurs out in 0.2s" is one.

## The tools

| Tool | Use |
|---|---|
| `motion_refs` | References best first. For a launch, product, AI, SaaS or app brief: LAUNCH FILMS (official launch and brand films of AI, SaaS, developer-tool and tech brands, posted by the brands on YouTube, X or Vimeo, picked by topic; a brand named in a query comes first). Then MASTERS (Drip's vetted list of studios and designers whose work is the bar, picked by the kind of film), then Dribbble's animation category with a quality floor (video, no paid boosts, 40+ likes) and Kisto (curated studio motion, AI clips dropped). `designers: [...]` pulls a named designer's video shots. 24fps.dev (indie films made in code) only with `source: "24fps"`, for technique, never for taste. One numbered sheet |
| `motion_study` | Watch a film: a timestamped contact sheet plus measured duration, hard cuts and average shot length, and a rhythm curve |

Search the idea and the moves, not the product: "liquid morph transition", "kinetic typography launch", "abstract
geometric brand film", "ui product demo cursor". Use technique words and feelings. Searching the competitor's name
returns their film, which you already know.

`motion_study` takes a video URL (the `video` from `motion_refs`); a public YouTube, X, Vimeo, Instagram, TikTok or
LinkedIn post (fetched as a 720p MP4, no account needed); a local `.mp4` or `.webm`; or a web page with a `<video>`.
Pass `role` with what you study it for. The sheet shows each shot's first frame plus even samples.

### Launch films: study how real companies announced real products

A launch film is judged against the launches its audience has seen, not against freelance Dribbble shots. For a
launch brief:

1. `motion_refs` with the category and the moves ("ai product launch", "developer tool launch ui"). Its LAUNCH FILMS
   come first.
2. Find the 2-3 launches closest to this one that the list doesn't have, with WebSearch: the category leader's
   latest launch ("<brand> launch video", "<brand> introducing"), the brand's YouTube channel or X account, the
   user's competitors. Take the official post (the brand's own account), never a reupload or a reaction.
3. `motion_study` each post URL with a role. Study at least one launch film (story: how the product is revealed,
   when the name appears, how the UI is shown) and one master's piece (moves: the craft).

Search words, not the brand you are making the film for: Drip's own name finds nothing about how launches are made.

### Measured versus inferred

| Measured by the tool | Inferred by you from the frames |
|---|---|
| Duration | Easing curves |
| Hard cuts and their times | Layers and what is animated separately |
| Shot lengths and their average | Springs and overshoot |
| Rhythm (how motion energy rises and falls) | Intent: why a choice was made |
| | Sound (the tool does not listen) |

Say which is which when you write it into the storyboard. A claim like "uses a spring with 15% overshoot" is an
inference from a few frames; write it as one.

## Other sources

- **A brand's own posts:** its launch video on YouTube, X or Vimeo, found with WebSearch. Give the post URL to
  `motion_study`.
- **A web page with a video:** a brand's own launch page. Give the page URL to `motion_study`.
- **The user's own files:** an older film, a competitor's film they like, a brand reel. A reference the user gave
  counts as studied: mark it `given: true` in the storyboard references.
- **Your own renders:** `motion_study` on the draft or final to compare with the plan.
- **Professional studios and galleries:** `drip_guide video/styles` lists studios and galleries to search by name
  (the web, not `motion_refs`), to find work to describe to the user.

## What to take and what not to

- Take techniques: how a transition is built, how long a hold is, how type is staged, how sound lands.
- Do not take frames, characters, copy or the unique motif of a film. A direct reference is credited; a copy is
  not acceptable.
- If a reference is a competitor's, learn from the structure and invert the look.
- Keyword search finds what is tagged with the words, not what is good: a template reel or an animated landing page can top it. Prefer masters' work; an open-search result earns a place only when it is as good, and you say why.
- When a reference came from 24fps.dev with open source, check its licence before reusing any code.

## From study to storyboard

Each reference becomes one line in the storyboard's `references`:

| Field | Example |
|---|---|
| role | moves |
| source | the URL or file you studied |
| take | "The card's trailing edge springs 0.1s after the leading edge, so it stretches and recovers" |

The `take` must be a concrete technique (more than four words). `motion_storyboard` refuses a reference with a vague
take. The critic judges the film against the storyboard.

## How many

- A short film (under 20s): one moves reference and one look reference.
- A 30-60s launch film: two moves, one look, one story. One sound reference when sound drives the film.
- If you cannot find a reference that fits, search the technique instead (the transition type, the typography move),
  or ask the user for one.

## Checks

- [ ] At least one moves reference was studied, with the role passed to `motion_study`.
- [ ] Each reference has a concrete take, marked measured or inferred.
- [ ] Nothing is taken that is another film's unique asset.
- [ ] Question 10 (what is inappropriate here) was answered.
