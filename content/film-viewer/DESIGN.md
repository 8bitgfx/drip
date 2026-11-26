# Drip Film viewer: design

**THESIS.** A film, not a dashboard. The run is told as a short story: the references Drip looked at fly in, then the pieces and assets it picked, then they pour into one browser window where the page is built while a cursor per agent glides to what it writes. It ends on a finished card laid over the last frame, never instead of it.

**WORLD.** Ink #0A0B0F stage with slow ultramarine light drifting behind (blurred, never on top of words). One window: r14, a thin bar with the page's address, the frame inside, a soft ultramarine halo. Cards on the wall: r12 shots with a quiet caption (title, site). Agents: Director #7C93FF, then #C8F031, #FF9EC7, #6FE3D2, ... in start order, named Director / Builder 1 / Builder 2 (cursor arrow and its name tag in that colour; the tag shows the file while it writes). #FF5A4E only for the Live dot.

**TYPE.** Inter 15; one line per scene in 17/500 ("Looked at 4 references"); Bricolage Grotesque 700 only for the intro title and the finished line ("Built in 12 min 40 s."); JetBrains Mono 500 for times, files and the address.

**CHROME.** Header: the drop, the task's title, Live (only while the run is live). Footer: play, time, the timeline, duration, speed. The timeline is split by chapter (references, pieces, build) with a tiny tick per write in its agent's colour; click or drag anywhere lands exactly there. Top right of the stage: who is working now and the run's own clock. Nothing else: no panels, chips, badges or feeds.

**MOTION.** Everything on screen is a pure function of the story time (`model.js`), so seeking, keyboard steps and playback always agree. Cards enter with blur and a turn, frames cross-fade, a soft ultramarine outline shows what changed, the camera pans tall frames to the change or the write and tours the whole page at the end. Reduced motion stops the drifting light.

**DATA.** `model.js` reads old and new film.json (see the notes at its top and `mcp/test/film-viewer.test.mjs`); blank frames, dev-server error overlays and unchanged frames are measured in the browser and skipped. The fixture film for development is `mcp/test/fixtures/film` (`node mcp/test/fixtures/film/make.mjs` remakes it); open `content/film-viewer/index.html?film=../../mcp/test/fixtures/film/film.json` from a static server at the repo root.

**REFUSES.** Pills, tags, badges, text panels, tiny text, a summary card replacing the video, orange as decoration.
