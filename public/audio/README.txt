AUDIO

Put your intro track here:
  intro.mp3   - solemn music for the intro and ending screens

It's wired in src/story.js (AUDIO.intro = "/audio/intro.mp3").
- Plays on the first tap (browsers block autoplay until a user gesture).
- Fades out when the loop begins (silence = tension), returns on endings.
- A mute toggle (🔊) sits at the top-right of the phone.
- UI tap clicks are synthesized in code — no file needed.

To change volume, edit AUDIO.introVolume in src/story.js (0.0 - 1.0).
