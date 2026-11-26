---
description: A motion-design film made in code — launch film, brand film, explainer, ad, logo animation, kinetic type, loop — rendered locally to MP4
argument-hint: <what the film is for, e.g. "20s launch film for my notes app", "logo animation for Crumb", "9:16 ad for the new pricing">
model: opus
---
Film request: $ARGUMENTS

Load the `drip-video` skill and follow it: `drip_start` with this request and mode "motion", then its first calls (`motion_refs`, `motion_study`, `motion_storyboard`). You are the creative director and own the one master timeline; a builder may make a self-contained piece to your spec.

The film is made in code (HTML + GSAP/CSS/canvas/three.js) and rendered locally frame by frame, never with a generative video model. Sound is chosen and mixed from existing licensed recordings, never generated. Before ending: a clean `motion_frames` sweep on the current version, the critic once (`critic_prepare` kind "motion"), and the rendered file checked with `motion_study`.
