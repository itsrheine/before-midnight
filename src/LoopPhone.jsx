import React, { useState, useEffect, useRef, useCallback } from "react";
import { LOOP_LENGTH, START_LABEL, DEADLINE_LABEL, TYPING_MS, WALLPAPER, INTRO, TITLE, HOWTO, CHAPTER2, AUDIO, STORY, PHOTO_SRC, MEMORY_LABELS, ITEM_LABELS } from "./story.js";

// Error boundary: instead of a black screen, show what went wrong.
class Boundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error("Game crashed:", err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ minHeight: "100vh", background: "#141318", color: "#e8b98a",
          fontFamily: "monospace", padding: 30, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 14, textAlign: "center" }}>
          <div style={{ fontSize: 18 }}>The loop broke.</div>
          <div style={{ fontSize: 12, color: "#d98a8a", maxWidth: 500, whiteSpace: "pre-wrap" }}>
            {String(this.state.err && (this.state.err.stack || this.state.err.message || this.state.err))}
          </div>
          <button onClick={() => location.reload()} style={{ marginTop: 10, background: "#e8b98a",
            border: "none", borderRadius: 999, padding: "10px 22px", cursor: "pointer" }}>
            Start over
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function LoopPhone() {
  return <Boundary><LoopPhoneInner /></Boundary>;
}

/* ---------- ENGINE ---------- */

// Which evidence items have a viewable photo (others show as a labeled card).
const EVIDENCE_PHOTO = {
  item_crash_photo: "accident",
  item_location_ping: "map_pin",
  item_old_photo: "old_us",
  item_voicemail: "",        // audio, no image
  item_call_log: "",
  item_receipt: "",
  item_deleted_msgs: "",
  item_hospital_log: "",
};

function fmt(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}
// In-story clock: deadline time plus elapsed loop seconds (so the phone reads 11:30, 11:31...).
function deadlinePlus(elapsedSec) {
  const [h0, m0] = START_LABEL.split(":").map(Number);
  const total = h0 * 60 + m0 + Math.floor(elapsedSec / 60);
  let h = Math.floor(total / 60) % 24;
  const m = total % 60;
  const s = Math.floor(elapsedSec % 60);
  const hh = h % 12 || 12;
  return `${hh}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

const FONT_DISPLAY = "'Bricolage Grotesque', 'Trebuchet MS', sans-serif";
const FONT_BODY = "'Spline Sans', 'Segoe UI', sans-serif";
const DOOR_READY_AT = 240; // seconds before "Go to the door" appears (near the end)

function LoopPhoneInner() {
  const [phase, setPhase] = useState("title"); // title | intro | liveclock | fastforward | waking | loop
  const [introStep, setIntroStep] = useState(0);
  const [ffClock, setFfClock] = useState("");

  const [tick, setTick] = useState(0);
  const [loopCount, setLoopCount] = useState(1);
  const [ending, setEnding] = useState(null);   // { title, text } once resolved
  const [atDoor, setAtDoor] = useState(false);   // door choice overlay showing

  const [knowledge, setKnowledge] = useState(() => new Set());
  const [loopFlags, setLoopFlags] = useState(() => new Set());
  const [inventory, setInventory] = useState(() => new Set()); // items carried across loops

  const [threadMsgs, setThreadMsgs] = useState({});
  const [typing, setTyping] = useState({});          // threadId -> bool
  const [notifs, setNotifs] = useState([]);
  const [usedReplies, setUsedReplies] = useState(() => new Set());
  const [usedGroups, setUsedGroups] = useState(() => new Set());
  const [readThreads, setReadThreads] = useState(() => new Set());
  const [activeThreads, setActiveThreads] = useState(() => new Set()); // contacted you this loop
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCall, setActiveCall] = useState(null);
  const [playingVM, setPlayingVM] = useState(null);
  const voiceRef = useRef(null);
  const [openPhoto, setOpenPhoto] = useState(null);
  const [glitching, setGlitching] = useState(false);
  const [endingRevealed, setEndingRevealed] = useState(false);
  const [showCoach, setShowCoach] = useState(true);
  const [loopReveal, setLoopReveal] = useState(false);
  const [loopRevealSeen, setLoopRevealSeen] = useState(false);
  const [muted, setMuted] = useState(false);
  const musicRef = useRef(null);
  const audioCtxRef = useRef(null);
  const [view, setView] = useState("home");

  const firedRef = useRef(new Set());
  const tickRef = useRef(0);
  const viewRef = useRef("home");
  useEffect(() => { viewRef.current = view; }, [view]);

  // Synthesized UI tap — a short soft click. No audio file needed.
  const tap = useCallback(() => {
    if (muted) return;
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; }
      if (ctx.state === "suspended") ctx.resume();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.setValueAtTime(420, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.05);
      g.gain.setValueAtTime(0.12, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.09);
      o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.1);
    } catch (e) { /* audio not available */ }
  }, [muted]);

  // Fade the intro music to a target volume over ms. If restart, play from the top.
  const fadeMusic = useCallback((target, ms = 800, restart = false) => {
    const a = musicRef.current;
    if (!a) return;
    const start = a.volume;
    const t0 = performance.now();
    const tick2 = (now) => {
      const p = Math.min(1, (now - t0) / ms);
      a.volume = start + (target - start) * p;
      if (p < 1) requestAnimationFrame(tick2);
      else if (target === 0) a.pause();
    };
    if (target > 0 && a.paused) {
      if (restart) { try { a.currentTime = 0; } catch (e) {} }
      a.volume = 0;
      a.play().catch(() => {});
    }
    requestAnimationFrame(tick2);
  }, []);

  // Music: solemn during intro & endings; fades out for the loop itself.
  useEffect(() => {
    if (muted) { fadeMusic(0, 300); return; }
    if (ending) { fadeMusic(AUDIO.introVolume ?? 0.5, 1200, true); }   // restart from top on endings
    else if (phase === "title") { fadeMusic(AUDIO.introVolume ?? 0.5, 1200, true); }
    else if (phase === "intro" || phase === "liveclock" || phase === "howto" || phase === "chapter") { fadeMusic(AUDIO.introVolume ?? 0.5, 1200); }
    else { fadeMusic(0, 1500); }                                       // silence in the loop
  }, [phase, ending, muted, fadeMusic]);

  // Preload intro images so photo cards fade in instantly (no load-stutter).
  useEffect(() => {
    INTRO.forEach((card) => {
      if (card.photo && PHOTO_SRC[card.photo]) {
        const img = new Image();
        img.src = PHOTO_SRC[card.photo];
      }
    });
  }, []);

  // Synthesized phone ring — a classic two-tone burst. Returns a stop function.
  const ringStop = useRef(null);
  const startRing = useCallback(() => {
    if (muted) return;
    try {
      let ctx = audioCtxRef.current;
      if (!ctx) { ctx = new (window.AudioContext || window.webkitAudioContext)(); audioCtxRef.current = ctx; }
      if (ctx.state === "suspended") ctx.resume();
      let stopped = false;
      const ringOnce = () => {
        if (stopped) return;
        const t = ctx.currentTime;
        [0, 0.4].forEach((off) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = "sine";
          o.frequency.value = 440;
          const o2 = ctx.createOscillator();
          o2.type = "sine";
          o2.frequency.value = 480;
          g.gain.setValueAtTime(0.0001, t + off);
          g.gain.exponentialRampToValueAtTime(0.18, t + off + 0.05);
          g.gain.setValueAtTime(0.18, t + off + 0.3);
          g.gain.exponentialRampToValueAtTime(0.0001, t + off + 0.38);
          o.connect(g); o2.connect(g); g.connect(ctx.destination);
          o.start(t + off); o.stop(t + off + 0.4);
          o2.start(t + off); o2.stop(t + off + 0.4);
        });
      };
      ringOnce();
      const iv = setInterval(ringOnce, 3000); // ring cadence
      ringStop.current = () => { stopped = true; clearInterval(iv); };
    } catch (e) { /* audio unavailable */ }
  }, [muted]);

  // Ring while a call is incoming.
  useEffect(() => {
    if (incomingCall && !muted) startRing();
    return () => { if (ringStop.current) { ringStop.current(); ringStop.current = null; } };
  }, [incomingCall, muted, startRing]);

  const has = useCallback((k) => knowledge.has(k) || loopFlags.has(k) || inventory.has(k), [knowledge, loopFlags, inventory]);

  const gateOk = useCallback((ev) => {
    const have = (k) => knowledge.has(k) || loopFlags.has(k) || inventory.has(k);
    if (ev.requires && !ev.requires.every(have)) return false;
    if (ev.forbids && ev.forbids.some(have)) return false;
    if (ev.requiresItem && !ev.requiresItem.every((i) => inventory.has(i))) return false;
    if (ev.minLoop && loopCount < ev.minLoop) return false;
    return true;
  }, [knowledge, loopFlags, inventory, loopCount]);

  const grant = useCallback((g) => {
    if (!g) return;
    if (g.knowledge) setKnowledge((s) => new Set(s).add(g.knowledge));
    if (g.loopFlag) setLoopFlags((s) => new Set(s).add(g.loopFlag));
    if (g.item) setInventory((s) => new Set(s).add(g.item));
  }, []);
  const setFlag = useCallback((s) => {
    if (!s) return;
    if (s.loopFlag) setLoopFlags((f) => new Set(f).add(s.loopFlag));
    if (s.knowledge) setKnowledge((f) => new Set(f).add(s.knowledge));
    if (s.item) setInventory((f) => new Set(f).add(s.item));
  }, []);

  // Push an incoming message with a typing indicator first
  const incoming = useCallback((threadId, text) => {
    setTyping((t) => ({ ...t, [threadId]: true }));
    setTimeout(() => {
      setTyping((t) => ({ ...t, [threadId]: false }));
      setThreadMsgs((m) => ({ ...m, [threadId]: [...(m[threadId] || []), { from: threadId, text }] }));
      // mark unread unless the player is looking at this thread right now
      setReadThreads((s) => {
        if (viewRef.current === `thread:${threadId}`) return s;
        const next = new Set(s); next.delete(threadId); return next;
      });
    }, TYPING_MS);
  }, []);

  // Drop an evidence attachment card into a thread (after a short delay so it lands
  // right after the sender's message). itemId maps to ITEM_LABELS / optional photo.
  const incomingEvidence = useCallback((threadId, itemId) => {
    setTimeout(() => {
      setThreadMsgs((m) => ({ ...m, [threadId]: [...(m[threadId] || []), { from: threadId, evidence: itemId }] }));
      setReadThreads((s) => {
        if (viewRef.current === `thread:${threadId}`) return s;
        const next = new Set(s); next.delete(threadId); return next;
      });
    }, TYPING_MS + 600);
  }, []);

  /* --- (live clock now shows a fixed in-fiction time; no real-clock tick needed) --- */

  /* --- PHASE: fast-forward — quick race to 11:24, then crawl to 11:25 --- */
  useEffect(() => {
    if (phase !== "fastforward") return;

    const brakeHour = 11;
    const brakeMin = 24;

    let h = brakeHour;
    let m = brakeMin - 1;
    let delay = 110;
    let stop = false;

    const crawlSeconds = (sec) => {
      if (stop) return;

      setFfClock(
        `${brakeHour}:${brakeMin
          .toString()
          .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`
      );

      if (sec >= 59) {
        setTimeout(() => {
          setFfClock("11:25");
          setPhase("waking");
        }, 1200);

        return;
      }

      const pause = 320 + (sec - 55) * 300;
      setTimeout(() => crawlSeconds(sec + 1), pause);
    };

    const raceMinutes = () => {
      if (stop) return;

      m += 1;

      if (m > 59) {
        m = 0;
        h = (h % 12) + 1;
      }

      setFfClock(`${h}:${m.toString().padStart(2, "0")}`);

      if (h === brakeHour && m === brakeMin) {
        setTimeout(() => crawlSeconds(55), 450);
        return;
      }

      delay = delay < 40 ? delay : delay * 0.9;
      setTimeout(raceMinutes, delay);
    };

    raceMinutes();

    return () => {
      stop = true;
    };
  }, [phase]);

  /* --- PHASE: waking — eyes-opening blink, then into the loop --- */
  useEffect(() => {
    if (phase !== "waking") return;
    const t = setTimeout(() => setPhase
    ("loop"), 2200);
    return () => clearTimeout(t);
  }, [phase]);

  /* --- PHASE: loop clock --- */
  useEffect(() => {
    if (phase !== "loop" || ending || atDoor) return;
    const iv = setInterval(() => { tickRef.current += 1; setTick(tickRef.current); }, 1000);
    return () => clearInterval(iv);
  }, [phase, ending, atDoor]);

  /* --- scheduler --- */
  useEffect(() => {
    if (phase !== "loop") return;
    STORY.events.forEach((ev) => {
      if (firedRef.current.has(ev.id) || tick < ev.time) return;
      firedRef.current.add(ev.id);
      if (!gateOk(ev)) return;

      if (ev.type === "message") {
        setActiveThreads((s) => new Set(s).add(ev.from));
        incoming(ev.from, ev.text);
        setNotifs((n) => [...n, { key: ev.id, app: "messages", from: ev.from, text: ev.text }]);
      } else if (ev.type === "notif") {
        setNotifs((n) => [...n, { key: ev.id, app: ev.app, from: ev.from, text: ev.text }]);
        if (ev.from && ev.app === "messages") {
          setActiveThreads((s) => new Set(s).add(ev.from));
          incoming(ev.from, ev.text);
        }
      } else if (ev.type === "call") {
        setActiveThreads((s) => new Set(s).add(ev.from));
        setIncomingCall({ from: ev.from });
        setNotifs((n) => [...n, { key: ev.id, app: "phone", from: ev.from, text: "Incoming call" }]);
      } else if (ev.type === "glitch") {
        // Horror intrusion: a message from a sender that shouldn't exist.
        setActiveThreads((s) => new Set(s).add(ev.from));
        incoming(ev.from, ev.text);
        setNotifs((n) => [...n, { key: ev.id, app: "messages", from: ev.from, text: ev.text, glitch: true }]);
        setGlitching(true);
        setTimeout(() => setGlitching(false), 1200);
      } else if (ev.type === "end" || ev.type === "door") {
        // The knock. Freeze the clock and present the door choices.
        setAtDoor(true);
        setIncomingCall(null);
      }
    });
  }, [tick, phase, gateOk, incoming]);

  // Pick the door choices whose gates pass, given current knowledge.
  function availableDoorChoices() {
    return (STORY.door || []).filter(
      (c) => (!c.requires || c.requires.every((k) => has(k))) &&
             (!c.forbids || !c.forbids.some((k) => has(k)))
    );
  }

  function chooseDoor(choice) {
    const e = STORY.endings[choice.ending];
    setAtDoor(false);
    setEndingRevealed(false);
    setEnding({ title: e.title, text: e.text, tone: e.tone, photo: e.photo });
  }

  function resetLoop(hard = false) {
    tickRef.current = 0;
    firedRef.current = new Set();
    setTick(0); setThreadMsgs({}); setTyping({}); setNotifs([]);
    setUsedReplies(new Set()); setUsedGroups(new Set()); setReadThreads(new Set()); setActiveThreads(new Set()); setIncomingCall(null); setActiveCall(null); setOpenPhoto(null); setGlitching(false); setLoopFlags(new Set());
    if (voiceRef.current) { try { voiceRef.current.pause(); } catch(e){} voiceRef.current = null; }
    setPlayingVM(null);
    if (ringStop.current) { ringStop.current(); ringStop.current = null; }
    setView("home"); setEnding(null); setEndingRevealed(false); setAtDoor(false);
    if (hard) {
      setKnowledge(new Set()); setInventory(new Set()); setLoopCount(1); setIntroStep(0); setLoopRevealSeen(false); setPhase("title");
    } else {
      // The first time the player loops, reveal what's happening.
      if (loopCount === 1 && !loopRevealSeen) { setLoopReveal(true); setLoopRevealSeen(true); }
      setLoopCount((c) => c + 1); setPhase("loop");
    }
  }

  function openThread(id) {
    setView(`thread:${id}`);
    setReadThreads((s) => new Set(s).add(id));
    setNotifs((n) => n.filter((x) => x.from !== id));
    const t = STORY.threads[id];
    if (t?.onOpen) { grant(t.onOpen.grants); setFlag(t.onOpen.sets); }
  }

  function sendReply(threadId, reply) {
    if (usedReplies.has(reply.id)) return;
    setUsedReplies((s) => new Set(s).add(reply.id));
    // Retire mutually-exclusive sibling replies in the same group.
    if (reply.group) setUsedGroups((s) => new Set(s).add(`${threadId}:${reply.group}`));
    setThreadMsgs((m) => ({ ...m, [threadId]: [...(m[threadId] || []), { from: "you", text: reply.text }] }));
    grant(reply.grants); setFlag(reply.sets);
    if (reply.response) incoming(threadId, reply.response);
    // If this reply hands over a piece of evidence, also drop it into the thread.
    if (reply.grants && reply.grants.item) incomingEvidence(threadId, reply.grants.item);
  }

  function answerCall() {
    const from = incomingCall.from;
    const callData = STORY.call?.[from];

    // Stop the ring and clear the incoming-call UI immediately.
    setIncomingCall(null);
    if (ringStop.current) { ringStop.current(); ringStop.current = null; }

    if (callData) {
      grant(callData.grants);
      grant(callData.grantsExtra);

      if (callData.audio && !muted) {
        // Show an in-call screen while the voice plays.
        setActiveCall({ from, playing: true });
        const callAudio = new Audio(callData.audio);
        voiceRef.current = callAudio;
        callAudio.volume = 1;
        callAudio.play().catch((err) => { console.error("Call audio failed:", err); endCallToThread(from, callData); });
        callAudio.onended = () => endCallToThread(from, callData);
        return;
      }
    }

    setView(`thread:${from}`);
  }

  // Play (or stop) a voicemail bubble. Grants the call's knowledge on listen.
  function playVoicemail(src) {
    if (muted) return;
    if (playingVM === src && voiceRef.current) {
      voiceRef.current.pause(); voiceRef.current = null; setPlayingVM(null); return;
    }
    if (voiceRef.current) { try { voiceRef.current.pause(); } catch (e) {} }
    const a = new Audio(src);
    voiceRef.current = a;
    a.play().then(() => {
      setPlayingVM(src);
      const cd = Object.values(STORY.call || {}).find((c) => c.missedAudio === src);
      if (cd) { grant(cd.grants); grant(cd.grantsExtra); }
    }).catch((e) => console.error("Voicemail failed:", e));
    a.onended = () => {
      setPlayingVM(null); voiceRef.current = null;
      const cd = Object.entries(STORY.call || {}).find(([, c]) => c.missedAudio === src);
      if (cd && cd[1].missedFollowup && !has(`vm_done_${cd[0]}`)) {
        setFlag({ loopFlag: `vm_done_${cd[0]}` });
        incoming(cd[0], cd[1].missedFollowup);
      }
    };
  }

  // When the voice note finishes (or is skipped), drop into the thread with replies.
  function endCallToThread(from, callData) {
    setActiveCall(null);
    voiceRef.current = null;
    setView(`thread:${from}`);
    if (callData?.afterVoice) incoming(from, callData.afterVoice);
  }

  function declineCall() {
    const from = incomingCall.from;
    if (ringStop.current) { ringStop.current(); ringStop.current = null; }
    const cd = STORY.call?.[from];
    // Leave a playable voicemail if there's one, otherwise a plain missed text.
    if (cd?.missedAudio) {
      setActiveThreads((s) => new Set(s).add(from));
      setThreadMsgs((m) => ({
        ...m,
        [from]: [...(m[from] || []), { from, voicemail: cd.missedAudio, text: "Voicemail" }],
      }));
      setNotifs((n) => [...n, { key: `vm_${from}_${Date.now()}`, app: "messages", from, text: "Voicemail" }]);
    } else {
      incoming(from, cd?.missedText || "Missed call. Call me back, please.");
    }
    setIncomingCall(null);
  }

  const C = STORY.contacts;
  const nameOf = (id) => {
    const r = STORY.contactRename?.[id];
    if (r && has(r.when)) return r.name;
    return C[id]?.name || id;
  };
  const inLoop = phase === "loop";

  return (
    <div style={S.stage}>
      <style>{CSS}</style>

      {AUDIO.intro && (
        <audio ref={musicRef} src={AUDIO.intro} loop preload="auto" />
      )}

      <div style={S.phone} onClickCapture={(e) => { const t = e.target; if (t && typeof t.closest === "function" && t.closest("button")) tap(); }}>
        <div style={S.notch} />
        <div style={S.statusbar}>
        <span>{
          phase === "loop" ? deadlinePlus(tick)
          : phase === "fastforward" ? ffClock
          : phase === "waking" ? START_LABEL
          : START_LABEL
        }</span>
          <span style={{ letterSpacing: 1, color: loopCount >= 4 ? "#b34a3a" : undefined }}>
            {inLoop ? (loopCount >= 6 ? "LOOP ∞" : loopCount >= 4 ? `LOOP ${loopCount}̷${loopCount * 47}` : `LOOP ${loopCount}`) : ""}
          </span>
          <span>{glitching ? "▓▒░" : "▮▮▮"}</span>
        </div>

        <div style={S.screen} className={glitching ? "glitch" : ""}>
          {/* TITLE SCREEN */}
          {phase === "title" && (
            <div style={{ ...S.title, animation: "fadeIn 2s ease" }}>
              <div style={S.titleMark}>{TITLE.name}</div>
              <div style={S.titleChapter}>{TITLE.chapter}</div>
              <div style={S.titleRule} />
              <div style={S.titleSub}>{TITLE.subtitle}</div>
              <button
                style={{ ...S.btn, marginTop: 22 }}
                onClick={() => {
                  // First gesture: unlock + start music.
                  if (!muted && musicRef.current && musicRef.current.paused) {
                    musicRef.current.volume = AUDIO.introVolume ?? 0.5;
                    musicRef.current.play().catch(() => {});
                  }
                  setPhase("chapter");
                }}
              >
                Begin
              </button>
              <div style={S.titleLocked}>🔒 {CHAPTER2.label} · {CHAPTER2.locked}</div>
              <div style={S.titleHint}>{TITLE.hint}</div>
            </div>
          )}

          {/* CHAPTER CARD */}
          {phase === "chapter" && (
            <button style={S.chapter} onClick={() => setPhase("howto")}>
              <div style={S.chapterLabel}>{TITLE.chapter}</div>
              <div style={S.chapterRule} />
              <div style={S.chapterName}>{TITLE.name}</div>
              <div style={S.chapterTap}>tap to continue</div>
            </button>
          )}

          {/* HOW TO PLAY */}
          {phase === "howto" && (
            <div style={{ ...S.intro, animation: "fadeIn 1.8s ease" }}>
              <div style={S.howHeading}>{HOWTO.heading}</div>
              <div style={S.howList}>
                {HOWTO.lines.map((l, i) => (
                  <div key={i} style={S.howLine}><span style={S.howNum}>{i + 1}</span>{l}</div>
                ))}
              </div>
              <button style={S.btn} onClick={() => setPhase("intro")}>{HOWTO.button}</button>
            </div>
          )}

          {/* INTRO — backstory cards */}
          {phase === "intro" && (
            <div style={S.intro}>
              <div style={S.introPhotoSlot}>
                {INTRO[introStep].photo && PHOTO_SRC[INTRO[introStep].photo] && (
                  <img key={`img${introStep}`} src={PHOTO_SRC[INTRO[introStep].photo]} alt="" style={S.introPhoto} />
                )}
              </div>
              <div style={S.introText} key={introStep}>{INTRO[introStep].text}</div>
              <div style={S.introDots}>
                {INTRO.map((_, i) => (
                  <span key={i} style={{ ...S.introDot, opacity: i === introStep ? 1 : 0.3 }} />
                ))}
              </div>
              <button
                style={S.btn}
                onClick={() => {
                  if (introStep < INTRO.length - 1) setIntroStep((s) => s + 1);
                  else setPhase("liveclock");
                }}
              >
                {introStep < INTRO.length - 1 ? "Next" : "Pick up the phone"}
              </button>
              {introStep < INTRO.length - 1 && (
                <button style={S.introSkip} onClick={() => setPhase("liveclock")}>Skip</button>
              )}
            </div>
          )}

          {/* COLD OPEN — live clock */}
          {phase === "liveclock" && (
            <div style={S.lock}>
              <div style={S.lockDate}>Tonight</div>
              <div style={S.lockTime}>{START_LABEL}<span style={S.ap}>PM</span></div>
              <div style={S.lockLine} />
              <p style={S.lockHint}>Swipe up.</p>
              <button style={S.btn} onClick={() => setPhase("fastforward")}>Open</button>
            </div>
          )}

          {/* COLD OPEN — fast forward */}
          {phase === "fastforward" && (
            <div style={S.lock}>
              <div style={S.lockDate}>·</div>
              <div style={{ ...S.lockTime, color: "#e8b98a", fontSize: ffClock.length > 5 ? 52 : 72 }}>{ffClock}</div>
              <p style={S.ffHint}>time slipping…</p>
            </div>
          )}

          {/* COLD OPEN — waking (eye opening) */}
          {phase === "waking" && (
            <div style={S.lock}>
              <div style={{ ...S.lockTime, color: "#e8b98a" }}>{"11:25"}</div>
              <div className="lids" />
            </div>
          )}

          {/* LOOP */}
          {inLoop && (
            <>
              {loopReveal && (
                <div style={S.revealOverlay} onClick={() => setLoopReveal(false)}>
                  <div style={S.revealText} className="flicker">{START_LABEL}</div>
                  <div style={S.revealLine}>Wait.</div>
                  <div style={S.revealLine}>Didn't this just happen?</div>
                  <div style={S.revealSub}>You're back at the start. But you remember.</div>
                  <div style={S.revealTap}>tap to continue</div>
                </div>
              )}
              {ending && (
                <div style={S.center}>
                  <div style={S.endTitle}>{ending.title}</div>
                  <div style={{ ...S.endText, whiteSpace: "pre-line" }}>{ending.text}</div>

                  {ending.photo && PHOTO_SRC[ending.photo] && !endingRevealed ? (
                    <button style={S.btn} onClick={() => setEndingRevealed(true)}>Next</button>
                  ) : (
                    <>
                      {ending.photo && PHOTO_SRC[ending.photo] && (
                        <img src={PHOTO_SRC[ending.photo]} alt="" style={S.endPhoto} />
                      )}
                      {ending.tone === "true" ? (
                        <>
                          <p style={{ ...S.lockHint, color: "#e8b98a" }}>11:32. And counting.</p>
                          <div style={S.ch2Teaser}>
                            <div style={S.ch2Label}>{CHAPTER2.label}</div>
                            <div style={S.ch2Line}>"{CHAPTER2.teaser}"</div>
                            <div style={S.ch2Body}>{CHAPTER2.blurb}</div>
                            <div style={S.ch2Locked}>🔒 {CHAPTER2.locked}</div>
                          </div>
                          <button style={S.btn} onClick={() => resetLoop(true)}>Replay Chapter One</button>
                        </>
                      ) : ending.tone === "final" ? (
                        <>
                          <p style={S.lockHint}>The loop lets you go.</p>
                          <button style={S.btn} onClick={resetLoop}>Begin again</button>
                        </>
                      ) : (
                        <>
                          <p style={S.lockHint}>What you learned, you keep.</p>
                          <button style={S.btn} onClick={resetLoop}>Loop again</button>
                        </>
                      )}
                    </>
                  )}
                </div>
              )}

              {!ending && (
                <>
                  {/* The door — appears at the knock; choices gated by knowledge */}
                  {atDoor && (
                    <div style={S.doorOverlay}>
                      <div style={S.doorKnock}>A knock at the door.</div>
                      <div style={S.doorChoices}>
                        {availableDoorChoices().map((c) => (
                          <button key={c.id} style={S.doorChoice} onClick={() => chooseDoor(c)}>
                            {c.text}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {incomingCall && (
                    <div style={S.callOverlay}>
                      <div style={S.callName}>{nameOf(incomingCall.from)}</div>
                      <div style={S.callSub}>mobile · calling…</div>
                      <div style={S.callBtns}>
                        <button style={{ ...S.callBtn, background: "#b34a3a" }} onClick={declineCall}>Decline</button>
                        <button style={{ ...S.callBtn, background: "#5a8a6b" }} onClick={answerCall}>Answer</button>
                      </div>
                    </div>
                  )}

                  {activeCall && (
                    <div style={S.callOverlay}>
                      <div style={S.callName}>{nameOf(activeCall.from)}</div>
                      <div style={S.callSub}>connected</div>
                      <div style={S.callWave} className="callwave"><span/><span/><span/><span/><span/></div>
                      <div style={S.callBtns}>
                        <button
                          style={{ ...S.callBtn, background: "#b34a3a" }}
                          onClick={() => {
                            if (voiceRef.current) { voiceRef.current.pause(); voiceRef.current.currentTime = 0; }
                            const cd = STORY.call?.[activeCall.from];
                            endCallToThread(activeCall.from, cd);
                          }}>
                          End call
                        </button>
                      </div>
                    </div>
                  )}

                  {view === "home" && (
                    <div style={{
                      ...S.home,
                      ...(WALLPAPER
                        ? { backgroundImage: `linear-gradient(rgba(18,16,22,.55), rgba(18,16,22,.78)), url(${WALLPAPER})`, backgroundSize: "cover", backgroundPosition: "center" }
                        : { backgroundImage: "radial-gradient(120% 80% at 50% 18%, #2c2838 0%, #1a1722 55%, #121019 100%)" }),
                    }}>
                      {/* soft clock/date overlay on the wallpaper, like a real home screen */}
                      <div style={S.homeClock}>{deadlinePlus(tick).slice(0, 5)}</div>
                      <div style={S.homeDate}>until the knock at {DEADLINE_LABEL}</div>
                      {loopCount === 1 && showCoach && (
                        <button style={S.coach} onClick={() => setShowCoach(false)}>
                          <div style={S.coachTitle}>What do I do?</div>
                          <div style={S.coachText}>Tap Messages to answer people. Open your apps to look around. Something happens at 11:30. Tap to dismiss.</div>
                        </button>
                      )}
                      {notifs.length > 0 && (
                        <div style={S.notifStack}>
                          {notifs.slice(-4).map((n) => (
                            <button key={n.key} style={S.notif}
                              onClick={() => (n.app === "messages" && n.from ? openThread(n.from) : null)}>
                              <div style={S.notifApp}>{n.app}</div>
                              <div style={S.notifFrom}>{nameOf(n.from)}</div>
                              <div style={S.notifText}>{n.text}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      <div style={S.grid}>
                        {(() => {
                          const anyUnread = Object.keys(STORY.threads).some((id) =>
                            ((threadMsgs[id] || []).some((m) => m.from === id) && !readThreads.has(id)) || typing[id]);
                          return (
                            <AppIcon label="Messages" color="#3a7a4a"
                              badge={anyUnread} onClick={() => setView("messages")} glyph="✉" />
                          );
                        })()}
                        {Object.entries(STORY.apps).map(([id, a]) => (
                          <AppIcon key={id} label={a.label} color="#3a3a42"
                            onClick={() => setView(`app:${id}`)} glyph={id === "photos" ? "▦" : id === "vault" ? "▣" : id === "feed" ? "◎" : "▤"} />
                        ))}
                        <AppIcon label="Journal" color="#5a4a3a"
                          badge={knowledge.size > 0 || inventory.size > 0}
                          onClick={() => setView("journal")} glyph="✎" />
                        <AppIcon label="Settings" color="#44444c"
                          onClick={() => setView("settings")} glyph="⚙" />
                      </div>

                      {tick >= DOOR_READY_AT && (
                        <button style={S.goToDoor} onClick={() => { setAtDoor(true); setIncomingCall(null); }}>
                          Go to the door →
                        </button>
                      )}
                    </div>
                  )}

                  {/* MESSAGES — conversation list (all threads in one app) */}
                  {view === "messages" && (() => {
                    const active = Object.keys(STORY.threads).filter((id) => activeThreads.has(id));
                    return (
                      <div style={S.thread}>
                        <header style={S.threadHead}>
                          <button style={S.back} onClick={() => setView("home")}>‹</button>
                          <span>Messages</span>
                        </header>
                        <div style={S.convList}>
                          {active.length === 0 && (
                            <div style={S.placeholder}>No conversations yet.</div>
                          )}
                          {active.map((id) => {
                            const msgs = threadMsgs[id] || [];
                            const last = msgs[msgs.length - 1];
                            const preview = typing[id] ? "typing…" : (last ? last.text : "");
                            const unread = (msgs.some((m) => m.from === id) && !readThreads.has(id)) || typing[id];
                            return (
                              <button key={id} style={S.conv} onClick={() => openThread(id)}>
                                <span style={{ ...S.convAvatar, background: C[id]?.color || "#6b7280" }}>
                                  {nameOf(id)[0]}
                                </span>
                                <span style={S.convBody}>
                                  <span style={S.convTop}>
                                    <span style={S.convName}>{nameOf(id)}</span>
                                    {unread && <span style={S.convDot} />}
                                  </span>
                                  <span style={S.convPreview}>{preview}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {view.startsWith("thread:") && (() => {
                    const id = view.split(":")[1];
                    const t = STORY.threads[id];
                    const msgs = threadMsgs[id] || [];
                    const hasIncoming = msgs.some((m) => m.from === id);
                    // Glitch threads (sam/self) have no definition: read-only, no replies.
                    const replies = (t && !typing[id] && hasIncoming)
                      ? (t.replies || []).filter((r) =>
                          !usedReplies.has(r.id)
                          && !(r.group && usedGroups.has(`${id}:${r.group}`))
                          && (!r.requires || r.requires.every((k) => has(k)))
                          && (!r.requiresItem || r.requiresItem.every((i) => inventory.has(i)))
                          && (!r.forbids || !r.forbids.some((k) => has(k))))
                      : [];
                    const headerName = t ? nameOf(t.contact) : nameOf(id);
                    return (
                      <div style={S.thread}>
                        <header style={S.threadHead}>
                          <button style={S.back} onClick={() => setView("messages")}>‹</button>
                          <span>{headerName}</span>
                        </header>
                        <div style={S.msgs}>
                          {msgs.length === 0 && !typing[id] && <div style={S.placeholder}>No messages yet.</div>}
                          {msgs.map((m, i) => {
                            const isGlitchThread = id === "sam" || id === "self";
                            const base = m.from === "you" ? S.bubbleMe : (isGlitchThread ? S.bubbleGlitch : S.bubbleThem);
                            if (m.voicemail) {
                              return (
                                <button key={i} style={S.voicemail} onClick={() => playVoicemail(m.voicemail)}>
                                  <span style={S.vmPlay}>{playingVM === m.voicemail ? "❚❚" : "▶"}</span>
                                  <span style={S.vmWave} className={`vmwave-bars ${playingVM === m.voicemail ? "vmwave" : ""}`}>
                                    <span/><span/><span/><span/><span/>
                                  </span>
                                  <span style={S.vmLabel}>Voicemail</span>
                                </button>
                              );
                            }
                            if (m.evidence) {
                              const evPhoto = EVIDENCE_PHOTO[m.evidence];
                              return (
                                <button key={i} style={S.evCard} onClick={() => { setView("app:evidence"); }}>
                                  {evPhoto && PHOTO_SRC[evPhoto] && (
                                    <img src={PHOTO_SRC[evPhoto]} alt="" style={S.evCardImg} />
                                  )}
                                  <div style={S.evCardLabel}>{ITEM_LABELS[m.evidence] || "Evidence"}</div>
                                  <div style={S.evCardHint}>Saved to Evidence · tap to open</div>
                                </button>
                              );
                            }
                            return <div key={i} style={base} className={isGlitchThread ? "flicker" : ""}>{m.text}</div>;
                          })}
                          {typing[id] && (
                            <div style={S.bubbleThem}>
                              <span className="dots"><i/><i/><i/></span>
                            </div>
                          )}
                        </div>
                        <div style={S.replies}>
                          {replies.map((r) => (
                            <button key={r.id} style={S.reply}
                              onClick={() => sendReply(id, r)}>{r.text}</button>
                          ))}
                          {replies.length === 0 && <div style={S.placeholder}>Nothing to say… yet.</div>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* JOURNAL — your character's running notes; replaces the old side panel */}
                  {/* SETTINGS */}
                  {view === "settings" && (
                    <div style={S.thread}>
                      <header style={S.threadHead}>
                        <button style={S.back} onClick={() => setView("home")}>‹</button>
                        <span>Settings</span>
                      </header>
                      <div style={S.settings}>
                        <div style={S.settingsRow}>
                          <span style={S.settingsLabel}>Sound</span>
                          <button
                            style={{ ...S.toggle, background: muted ? "#3a3640" : "#5a8a6b" }}
                            onClick={() => setMuted((m) => !m)}
                            role="switch" aria-checked={!muted}
                          >
                            <span style={{ ...S.toggleKnob, transform: muted ? "translateX(0)" : "translateX(20px)" }} />
                          </button>
                        </div>
                        <div style={S.settingsHint}>{muted ? "Sound is off." : "Music and taps are on."}</div>
                        <div style={S.settingsMeta}>BEFORE MIDNIGHT · Loop {loopCount}</div>
                      </div>
                    </div>
                  )}

                  {view === "journal" && (
                    <div style={S.thread}>
                      <header style={S.threadHead}>
                        <button style={S.back} onClick={() => setView("home")}>‹</button>
                        <span>Journal</span>
                      </header>
                      <div style={S.msgs}>
                        <div style={S.journalIntro}>
                          The night keeps starting over. I write things down so I don't lose them.
                        </div>
                        <div style={S.journalSection}>What I know</div>
                        {[...knowledge].filter((k) => MEMORY_LABELS[k]).length === 0 ? (
                          <div style={S.placeholder}>Nothing yet. Keep looking.</div>
                        ) : (
                          [...knowledge]
                            .filter((k) => MEMORY_LABELS[k])
                            .map((k) => <div key={k} style={S.journalLine}>• {MEMORY_LABELS[k]}</div>)
                        )}
                        {[...inventory].length > 0 && (
                          <>
                            <div style={S.journalSection}>What I'm holding onto</div>
                            {[...inventory].map((i) => (
                              <div key={i} style={S.journalItem}>{ITEM_LABELS[i] || i}</div>
                            ))}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {view.startsWith("app:") && (() => {
                    const id = view.split(":")[1];
                    const a = STORY.apps[id];
                    const items = (a.items || []).filter((it) => !it.requires || it.requires.every((k) => has(k)));
                    const hiddenCount = (a.items || []).length - items.length;

                    if (id === "photos") {
                      return (
                        <div style={S.thread}>
                          <header style={S.threadHead}>
                            <button style={S.back} onClick={() => setView("home")}>‹</button>
                            <span>{a.label}</span>
                          </header>
                          <div style={S.photoGrid}>
                            {items.map((it) => (
                              <button key={it.id} style={S.thumb} onClick={() => setOpenPhoto(it)}>
                                {PHOTO_SRC[it.src]
                                  ? <img src={PHOTO_SRC[it.src]} alt="" style={S.thumbImg} />
                                  : <span style={S.thumbPlaceholder}>{it.src}</span>}
                              </button>
                            ))}
                          </div>
                          {hiddenCount > 0 && (
                            <div style={S.placeholder}>· {hiddenCount} photo{hiddenCount > 1 ? "s" : ""} you haven't found yet ·</div>
                          )}
                        </div>
                      );
                    }

                    if (a.kind === "feed") {
                      const posts = a.posts.filter((p) => !p.requires || p.requires.every((k) => has(k)));
                      return (
                        <div style={S.thread}>
                          <header style={S.threadHead}>
                            <button style={S.back} onClick={() => setView("home")}>‹</button>
                            <span>{a.label}</span>
                          </header>
                          <div style={S.feed}>
                            {posts.map((p) => {
                              const author = p.author === "lena" && !has("knew_lena")
                                ? "Unknown" : (C[p.author] ? nameOf(p.author) : "Someone");
                              const color = C[p.author]?.color || "#6b7280";
                              return (
                                <button key={p.id} style={S.post}
                                  onClick={() => grant(p.grants)}>
                                  <div style={S.postHead}>
                                    <span style={{ ...S.postAvatar, background: color }}>{author[0]}</span>
                                    <span style={S.postAuthor}>{author}</span>
                                    <span style={S.postTime}>· {p.time}</span>
                                  </div>
                                  <div style={S.postText}>{p.text}</div>
                                  {p.photo && PHOTO_SRC[p.photo] && (
                                    <img src={PHOTO_SRC[p.photo]} alt="" style={S.postImg} />
                                  )}
                                  {p.meta && <div style={S.postMeta}>{p.meta}</div>}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }

                    // Notes (and any other text app)
                    return (
                      <div style={S.thread}>
                        <header style={S.threadHead}>
                          <button style={S.back} onClick={() => setView("home")}>‹</button>
                          <span>{a.label}</span>
                        </header>
                        <div style={S.msgs}>
                          {items.map((it) => (
                            <button key={it.id} style={S.clue} onClick={() => grant(it.grants)}>{it.caption}</button>
                          ))}
                          {hiddenCount > 0 && <div style={S.placeholder}>· some notes are still hidden ·</div>}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Fullscreen photo viewer */}
                  {openPhoto && (
                    <div style={S.photoView} onClick={() => { grant(openPhoto.grants); setOpenPhoto(null); }}>
                      <div style={S.photoFrame}>
                        {PHOTO_SRC[openPhoto.src]
                          ? <img src={PHOTO_SRC[openPhoto.src]} alt="" style={S.photoFull} />
                          : <div style={S.photoPlaceholderFull}>{openPhoto.src}</div>}
                      </div>
                      <div style={S.photoCaption}>{openPhoto.caption}</div>
                      <div style={S.photoTapHint}>tap to close</div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {inLoop && !ending && !atDoor && view !== "home" && (
          <button style={S.homeBar} onClick={() => setView("home")} aria-label="home" />
        )}
      </div>

      <div style={S.hint}>Cold open: live clock → fast-forward → loop. Incoming texts show a typing indicator first.</div>
    </div>
  );
}

function AppIcon({ label, color, glyph, badge, onClick, dimmed }) {
  return (
    <button style={{ ...S.iconWrap, opacity: dimmed ? 0.32 : 1, cursor: dimmed ? "default" : "pointer" }} onClick={onClick}>
      <div style={{ ...S.icon, background: color }}>
        <span style={S.glyph}>{glyph}</span>
        {badge && <span style={S.badge} />}
      </div>
      <span style={S.iconLabel}>{label}</span>
    </button>
  );
}

const ink = "#16151a";
const S = {
  stage: { minHeight: "100vh", background: "radial-gradient(circle at 30% 20%, #2a2730, #141318 70%)", display: "flex", alignItems: "center", justifyContent: "center", gap: 28, padding: 24, flexWrap: "wrap", fontFamily: FONT_BODY },
  journalIntro: { color: "#9a93a4", fontSize: 12.5, fontStyle: "italic", lineHeight: 1.5, padding: "4px 4px 10px", borderBottom: "1px solid #2a2630" },
  journalSection: { fontFamily: FONT_DISPLAY, fontSize: 11, letterSpacing: 2, textTransform: "uppercase", color: "#e8b98a", marginTop: 14, marginBottom: 4, opacity: 0.85 },
  journalLine: { color: "#e8d9c4", fontSize: 13.5, lineHeight: 1.45, padding: "4px 0" },
  journalItem: { color: "#cfc7b8", fontSize: 13, padding: "5px 0" },
  phone: { width: 320, height: 640, background: "#0c0b0f", borderRadius: 44, padding: 12, boxShadow: "0 30px 80px rgba(0,0,0,.6), inset 0 0 0 2px #2c2933", position: "relative" },
  notch: { position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 110, height: 22, background: "#0c0b0f", borderRadius: 14, zIndex: 5 },
  settings: { flex: 1, padding: "20px 18px", display: "flex", flexDirection: "column", gap: 6 },
  settingsRow: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #221f29" },
  settingsLabel: { fontFamily: FONT_DISPLAY, fontSize: 15, color: "#ece6da" },
  settingsHint: { fontSize: 12.5, color: "#8a8494", marginTop: 6 },
  settingsMeta: { marginTop: "auto", fontSize: 11, color: "#5a5560", letterSpacing: 1, textAlign: "center", paddingBottom: 8 },
  toggle: { width: 44, height: 24, borderRadius: 999, border: "none", cursor: "pointer", padding: 2, display: "flex", alignItems: "center", transition: "background .2s" },
  toggleKnob: { width: 20, height: 20, borderRadius: 999, background: "#fff", transition: "transform .2s", display: "block" },
  statusbar: { display: "flex", justifyContent: "space-between", color: "#e8e2d4", fontSize: 12, padding: "8px 22px 4px", letterSpacing: 0.5 },
  screen: { position: "relative", height: 560, background: "linear-gradient(180deg,#1b1922,#15131b)", borderRadius: 32, overflow: "hidden" },
  lock: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 30, textAlign: "center" },
  intro: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 34, textAlign: "center" },
  howHeading: { fontFamily: FONT_DISPLAY, fontSize: 22, color: "#e8b98a", marginBottom: 4 },
  howWho: { fontSize: 13, color: "#cfc7d4", fontStyle: "italic", lineHeight: 1.5, maxWidth: 270, marginBottom: 4 },
  howList: { display: "flex", flexDirection: "column", gap: 16, textAlign: "left", maxWidth: 270 },
  howLine: { fontSize: 14, color: "#ece6da", lineHeight: 1.45, display: "flex", gap: 11, alignItems: "flex-start" },
  howNum: { fontFamily: FONT_DISPLAY, fontSize: 13, color: "#0c0b0f", background: "#e8b98a", borderRadius: 999, minWidth: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 },
  title: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: 34, textAlign: "center", background: "radial-gradient(120% 90% at 50% 30%, #2a2433 0%, #14111b 70%)" },
  chapter: { height: "100%", width: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 34, textAlign: "center", background: "#0e0c12", border: "none", cursor: "pointer", animation: "fadeIn 2s ease" },
  chapterLabel: { fontFamily: FONT_DISPLAY, fontSize: 13, letterSpacing: 4, textTransform: "uppercase", color: "#e8b98a" },
  chapterRule: { width: 40, height: 1, background: "#5a5560", margin: "10px 0" },
  chapterName: { fontFamily: FONT_DISPLAY, fontSize: 30, fontWeight: 700, color: "#f2ece0", letterSpacing: 1 },
  chapterTap: { position: "absolute", bottom: 34, fontSize: 11, color: "#5a5560", letterSpacing: 1, textTransform: "uppercase", animation: "pulse 2s infinite" },
  titleMark: { fontFamily: FONT_DISPLAY, fontSize: 34, fontWeight: 700, color: "#f2ece0", letterSpacing: 2, lineHeight: 1.05, textShadow: "0 4px 24px rgba(0,0,0,.6)" },
  titleRule: { width: 50, height: 2, background: "#e8b98a", margin: "16px 0" },
  titleSub: { fontFamily: FONT_BODY, fontSize: 14, color: "#b8b0c0", fontStyle: "italic", lineHeight: 1.5, maxWidth: 240 },
  titleChapter: { fontFamily: FONT_DISPLAY, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", color: "#e8b98a", marginTop: 10 },
  titleLocked: { fontSize: 11, color: "#6a6472", letterSpacing: 1, marginTop: 18, border: "1px solid #2e2a36", borderRadius: 999, padding: "6px 14px" },
  ch2Teaser: { border: "1px solid #3a3640", borderRadius: 14, padding: "16px 16px", margin: "6px 0", display: "flex", flexDirection: "column", gap: 6, background: "rgba(232,185,138,.06)" },
  ch2Label: { fontFamily: FONT_DISPLAY, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", color: "#e8b98a" },
  ch2Line: { fontFamily: FONT_DISPLAY, fontSize: 17, color: "#f2ece0", lineHeight: 1.3, fontStyle: "italic" },
  ch2Body: { fontSize: 12.5, color: "#b8b0c0", lineHeight: 1.4 },
  ch2Locked: { fontSize: 11, color: "#6a6472", letterSpacing: 1, marginTop: 2 },
  revealOverlay: { position: "absolute", inset: 0, zIndex: 40, background: "#0a090d", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 30, textAlign: "center", cursor: "pointer", animation: "fadeIn 1.5s ease" },
  revealText: { fontFamily: FONT_DISPLAY, fontSize: 52, fontWeight: 700, color: "#e8b98a", marginBottom: 18 },
  revealLine: { fontFamily: FONT_DISPLAY, fontSize: 22, color: "#f2ece0", lineHeight: 1.3 },
  revealSub: { fontSize: 13.5, color: "#9a93a4", marginTop: 16, fontStyle: "italic", lineHeight: 1.5, maxWidth: 240 },
  revealTap: { position: "absolute", bottom: 34, fontSize: 11, color: "#5a5560", letterSpacing: 1, textTransform: "uppercase", animation: "pulse 2s infinite" },
  titleHint: { position: "absolute", bottom: 30, fontSize: 11, color: "#5a5560", letterSpacing: 1, textTransform: "uppercase" },
  introPhotoSlot: { width: "100%", height: 200, display: "flex", alignItems: "center", justifyContent: "center" },
  introPhoto: { width: "100%", height: "100%", objectFit: "cover", borderRadius: 12, animation: "fadeIn 1.8s ease", boxShadow: "0 12px 40px rgba(0,0,0,.5)" },
  introText: { fontFamily: FONT_DISPLAY, color: "#ece6da", fontSize: 19, lineHeight: 1.5, animation: "fadeIn 1.8s ease", minHeight: 120, display: "flex", alignItems: "center" },
  introDots: { display: "flex", gap: 6 },
  introDot: { width: 6, height: 6, borderRadius: 999, background: "#e8b98a" },
  introSkip: { background: "none", border: "none", color: "#6a6472", fontSize: 12, cursor: "pointer", letterSpacing: 1, textTransform: "uppercase", marginTop: -8 },
  lockDate: { color: "#9a93a4", fontSize: 14, letterSpacing: 1 },
  lockTime: { fontFamily: FONT_DISPLAY, fontSize: 72, color: "#f2ece0", fontWeight: 700, lineHeight: 1 },
  ap: { fontSize: 22, marginLeft: 6, opacity: 0.7 },
  lockLine: { width: 60, height: 2, background: "#3a3640", margin: "6px 0" },
  lockHint: { color: "#9a93a4", fontSize: 14 },
  ffHint: { color: "#7a7280", fontSize: 13, letterSpacing: 2, marginTop: 14, animation: "pulse 1.2s infinite" },
  btn: { marginTop: 14, background: "#e8b98a", color: ink, border: "none", padding: "12px 26px", borderRadius: 999, fontFamily: FONT_DISPLAY, fontSize: 15, cursor: "pointer", letterSpacing: 0.4 },
  center: { height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 30, textAlign: "center", overflowY: "auto" },
  endText: { fontFamily: FONT_DISPLAY, color: "#e8b98a", fontSize: 20, lineHeight: 1.4 },
  endTitle: { fontFamily: FONT_DISPLAY, color: "#f2ece0", fontSize: 13, letterSpacing: 3, textTransform: "uppercase", opacity: 0.7, marginBottom: 4 },
  endPhoto: { width: "100%", maxHeight: 220, objectFit: "cover", borderRadius: 12, animation: "fadeIn 1.4s ease", boxShadow: "0 12px 40px rgba(0,0,0,.5)" },
  doorOverlay: { position: "absolute", inset: 0, zIndex: 25, background: "rgba(8,7,11,.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: 26, textAlign: "center" },
  doorKnock: { fontFamily: FONT_DISPLAY, color: "#e8b98a", fontSize: 22, letterSpacing: 1 },
  doorChoices: { display: "flex", flexDirection: "column", gap: 10, width: "100%" },
  goToDoor: { marginTop: 14, background: "transparent", color: "#e8b98a", border: "1px solid #4a4450", borderRadius: 999, padding: "11px 16px", fontFamily: FONT_DISPLAY, fontSize: 14, letterSpacing: 0.5, cursor: "pointer", width: "100%" },
  home: { height: "100%", padding: "16px 14px", display: "flex", flexDirection: "column" },
  homeClock: { fontFamily: FONT_DISPLAY, fontSize: 40, fontWeight: 700, color: "#f2ece0", textAlign: "center", marginTop: 8, textShadow: "0 2px 12px rgba(0,0,0,.5)", letterSpacing: 1 },
  homeDate: { textAlign: "center", color: "#cfc7d4", fontSize: 12, letterSpacing: 1, opacity: 0.75, marginBottom: 14, textShadow: "0 1px 6px rgba(0,0,0,.5)" },
  notifStack: { display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 },
  coach: { textAlign: "left", background: "rgba(232,185,138,.16)", border: "1px solid #e8b98a", borderRadius: 16, padding: "12px 14px", marginBottom: 14, cursor: "pointer", width: "100%", backdropFilter: "blur(4px)" },
  coachTitle: { fontFamily: FONT_DISPLAY, fontSize: 14, color: "#e8b98a", marginBottom: 3 },
  coachText: { fontSize: 12.5, color: "#ece6da", lineHeight: 1.4 },
  notif: { textAlign: "left", background: "rgba(40,37,48,.85)", border: "1px solid #36323e", borderRadius: 16, padding: "9px 12px", cursor: "pointer", color: "#e8e2d4" },
  notifApp: { fontSize: 9, textTransform: "uppercase", letterSpacing: 1.5, opacity: 0.5 },
  notifFrom: { fontFamily: FONT_DISPLAY, fontSize: 13, margin: "1px 0" },
  notifText: { fontSize: 12.5, opacity: 0.85, lineHeight: 1.3 },
  grid: { display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 14, marginTop: "auto" },
  iconWrap: { background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: 0 },
  icon: { width: 52, height: 52, borderRadius: 15, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", boxShadow: "0 4px 12px rgba(0,0,0,.4)" },
  glyph: { fontSize: 22, color: "#fff", opacity: 0.92 },
  badge: { position: "absolute", top: -3, right: -3, width: 13, height: 13, background: "#e0584a", borderRadius: 999, border: "2px solid #15131b" },
  iconLabel: { fontSize: 11, color: "#d6cfc2" },
  thread: { height: "100%", display: "flex", flexDirection: "column" },
  threadHead: { display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", borderBottom: "1px solid #2a2630", color: "#f2ece0", fontFamily: FONT_DISPLAY, fontSize: 16, background: "rgba(20,18,24,.6)" },
  back: { background: "none", border: "none", color: "#e8b98a", fontSize: 26, cursor: "pointer", lineHeight: 1, padding: 0 },
  msgs: { flex: 1, overflowY: "auto", padding: "14px 12px", display: "flex", flexDirection: "column", gap: 8 },
  placeholder: { color: "#6a6472", fontSize: 12, textAlign: "center", fontStyle: "italic", padding: 12 },
  bubbleThem: { alignSelf: "flex-start", maxWidth: "78%", background: "#2c2935", color: "#ece6da", padding: "9px 13px", borderRadius: "16px 16px 16px 4px", fontSize: 13.5, lineHeight: 1.35 },
  voicemail: { alignSelf: "flex-start", maxWidth: "78%", background: "#2c2935", border: "none", color: "#ece6da", padding: "10px 14px", borderRadius: "16px 16px 16px 4px", fontSize: 13, display: "flex", alignItems: "center", gap: 10, cursor: "pointer" },
  vmPlay: { fontSize: 13, color: "#e8b98a", minWidth: 14 },
  vmWave: { display: "flex", gap: 3, alignItems: "center", height: 18, flex: 1 },
  vmLabel: { fontSize: 11, color: "#9a93a4", letterSpacing: 0.5 },
  evCard: { alignSelf: "flex-start", maxWidth: "80%", background: "#221f29", border: "1px solid #3a3640", borderRadius: 14, padding: 8, cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column", gap: 6 },
  evCardImg: { width: "100%", maxHeight: 150, objectFit: "cover", borderRadius: 9 },
  evCardLabel: { fontSize: 13, color: "#ece6da", fontWeight: 600, padding: "0 2px" },
  evCardHint: { fontSize: 10.5, color: "#e8b98a", letterSpacing: 0.3, padding: "0 2px 2px" },
  bubbleGlitch: { alignSelf: "flex-start", maxWidth: "82%", background: "#1a0f12", color: "#d98a8a", padding: "9px 13px", borderRadius: "16px 16px 16px 4px", fontSize: 13.5, lineHeight: 1.4, border: "1px solid #5a2a2a", fontFamily: "monospace", letterSpacing: 0.3 },
  bubbleMe: { alignSelf: "flex-end", maxWidth: "78%", background: "#e8b98a", color: ink, padding: "9px 13px", borderRadius: "16px 16px 4px 16px", fontSize: 13.5, lineHeight: 1.35 },
  replies: { borderTop: "1px solid #2a2630", padding: 10, display: "flex", flexDirection: "column", gap: 7, background: "rgba(20,18,24,.6)" },
  reply: { textAlign: "left", background: "#211f29", color: "#d8d1e0", border: "1px solid #36323e", borderRadius: 12, padding: "9px 12px", fontSize: 13, cursor: "pointer" },
  clue: { textAlign: "left", background: "#211f29", color: "#d8d1e0", border: "1px solid #36323e", borderRadius: 12, padding: "12px 14px", fontSize: 13.5, cursor: "pointer", lineHeight: 1.4 },
  callOverlay: { position: "absolute", inset: 0, background: "rgba(12,11,15,.96)", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 },
  callName: { fontFamily: FONT_DISPLAY, fontSize: 30, color: "#f2ece0" },
  callSub: { color: "#9a93a4", fontSize: 13, marginBottom: 40 },
  callWave: { display: "flex", gap: 5, alignItems: "center", height: 40, marginBottom: 40 },
  callBtns: { display: "flex", gap: 40 },
  callBtn: { width: 66, height: 66, borderRadius: 999, border: "none", color: "#fff", fontSize: 13, cursor: "pointer" },
  homeBar: { position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 120, height: 5, borderRadius: 999, background: "#5a5560", border: "none", cursor: "pointer" },
  photoGrid: { flex: 1, overflowY: "auto", padding: 8, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4, alignContent: "start" },
  feed: { flex: 1, overflowY: "auto", padding: "8px 10px", display: "flex", flexDirection: "column", gap: 8 },
  convList: { flex: 1, overflowY: "auto", padding: "4px 0" },
  conv: { width: "100%", textAlign: "left", background: "none", border: "none", borderBottom: "1px solid #221f29", padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 11 },
  convAvatar: { width: 38, height: 38, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: FONT_DISPLAY, fontSize: 16, color: "#fff", flexShrink: 0 },
  convBody: { flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 2 },
  convTop: { display: "flex", alignItems: "center", gap: 7 },
  convName: { fontFamily: FONT_DISPLAY, fontSize: 14.5, color: "#ece6da" },
  convDot: { width: 8, height: 8, borderRadius: 999, background: "#e0584a" },
  convPreview: { fontSize: 12.5, color: "#8a8494", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 210 },
  post: { textAlign: "left", background: "#211f29", border: "1px solid #2e2a36", borderRadius: 14, padding: "11px 13px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 },
  postHead: { display: "flex", alignItems: "center", gap: 7 },
  postAvatar: { width: 22, height: 22, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontFamily: FONT_DISPLAY, color: "#fff" },
  postAuthor: { fontFamily: FONT_DISPLAY, fontSize: 13, color: "#ece6da" },
  postTime: { fontSize: 11, color: "#6a6472" },
  postText: { fontSize: 13, color: "#d8d1e0", lineHeight: 1.4 },
  postMeta: { fontSize: 11, color: "#8a8494", fontStyle: "italic" },
  postImg: { width: "100%", borderRadius: 10, maxHeight: 200, objectFit: "cover", marginTop: 2 },
  thumb: { aspectRatio: "1", border: "none", padding: 0, borderRadius: 4, overflow: "hidden", cursor: "pointer", background: "#26232e", display: "flex", alignItems: "center", justifyContent: "center" },
  thumbImg: { width: "100%", height: "100%", objectFit: "cover" },
  thumbPlaceholder: { fontSize: 8, color: "#6a6472", textAlign: "center", padding: 2, lineHeight: 1.2, wordBreak: "break-word" },
  photoView: { position: "absolute", inset: 0, zIndex: 30, background: "rgba(8,7,11,.97)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: 18, cursor: "pointer" },
  photoFrame: { maxWidth: "100%", maxHeight: "62%", borderRadius: 8, overflow: "hidden", boxShadow: "0 20px 50px rgba(0,0,0,.6)" },
  photoFull: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" },
  photoPlaceholderFull: { width: 240, height: 180, background: "#26232e", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a7280", fontSize: 12, textAlign: "center", padding: 16 },
  photoCaption: { color: "#ece6da", fontFamily: FONT_DISPLAY, fontSize: 15, textAlign: "center", lineHeight: 1.4, maxWidth: 260 },
  photoTapHint: { color: "#5a5560", fontSize: 11, letterSpacing: 1, textTransform: "uppercase" },
  hint: { width: "100%", textAlign: "center", color: "#6a6472", fontSize: 12, marginTop: 4 },
};

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=Spline+Sans:wght@400;500&display=swap');
* { box-sizing: border-box; }
button:hover { filter: brightness(1.08); }
::-webkit-scrollbar { width: 0; }
@keyframes pulse { 0%,100%{opacity:.4} 50%{opacity:1} }
@keyframes fadeIn { from{opacity:0; transform:translateY(10px)} to{opacity:1; transform:translateY(0)} }
.glitch { animation: glitchShake .12s steps(2) 6; }
@keyframes glitchShake {
  0% { transform: translate(0,0); filter: none; }
  25% { transform: translate(-2px,1px); filter: hue-rotate(20deg) saturate(1.4); }
  50% { transform: translate(2px,-1px); filter: invert(0.08); }
  75% { transform: translate(-1px,-1px); filter: hue-rotate(-15deg); }
  100% { transform: translate(0,0); filter: none; }
}
.flicker { animation: flick 2.2s infinite steps(8); }
@keyframes flick { 0%,97%,100%{opacity:1} 98%{opacity:.4} 99%{opacity:.85} }
.dots { display:inline-flex; gap:4px; align-items:center; height:8px; }
.dots i { width:6px; height:6px; border-radius:999px; background:#9a93a4; display:inline-block; animation: blink 1.2s infinite; }
.dots i:nth-child(2){ animation-delay:.2s } .dots i:nth-child(3){ animation-delay:.4s }
@keyframes blink { 0%,60%,100%{opacity:.25; transform:translateY(0)} 30%{opacity:1; transform:translateY(-3px)} }
.callwave span { width:4px; height:10px; border-radius:999px; background:#e8b98a; display:inline-block; animation: wave 1s infinite ease-in-out; }
.callwave span:nth-child(2){ animation-delay:.15s } .callwave span:nth-child(3){ animation-delay:.3s }
.callwave span:nth-child(4){ animation-delay:.45s } .callwave span:nth-child(5){ animation-delay:.6s }
@keyframes wave { 0%,100%{height:8px; opacity:.5} 50%{height:30px; opacity:1} }
.vmwave-bars span { width:3px; height:6px; border-radius:999px; background:#6a6472; display:inline-block; }
.vmwave span { background:#e8b98a; animation: vmw .8s infinite ease-in-out; }
.vmwave span:nth-child(2){ animation-delay:.1s } .vmwave span:nth-child(3){ animation-delay:.2s }
.vmwave span:nth-child(4){ animation-delay:.3s } .vmwave span:nth-child(5){ animation-delay:.4s }
@keyframes vmw { 0%,100%{height:5px} 50%{height:16px} }
.lids { position:absolute; inset:0; z-index:20; pointer-events:none;
  background: linear-gradient(#000 50%, transparent 50%, transparent 50%, #000 50%);
  background-size: 100% 200%; background-position: 0 100%;
  animation: open-eye 2.1s cubic-bezier(.6,0,.2,1) forwards; }
@keyframes open-eye {
  0% { background-position:0 100%; }
  20% { background-position:0 92%; }
  45% { background-position:0 100%; }
  100% { background-position:0 0%; }
}
`;
