/* ============================================================
   BEFORE MIDNIGHT — murder-mystery edition. Engine never changes.

   PREMISE
     You loop the five minutes before 11:30 PM. At 11:30 there's a
     knock. Tonight, the person at the door is meant to die. Your job,
     across loops, is to learn WHO will kill her, HOW, and gather the
     proof to stop it — before the clock runs out.

   THE OLD DEATH (the rot under everything)
     Four years ago a car crash "killed" your best friend Sam. The
     truth you uncover: Sam survived the crash and died after, and the
     two families staged the scene to hide how it really happened.
     You were driving. Lena took the blame. Someone else finished it.

   TONIGHT
     Lena is coming to finally tell the truth about Sam. Someone close
     to you intends to make sure she never says it out loud.

   MEMORY MODEL
     knowledge  -> persists across loops (facts, deductions)
     inventory  -> persists across loops (evidence you can present)
     loopFlag   -> wiped each loop (this-loop choices)

   WHODUNIT
     Suspects: Dad, Mom, Theo, Mara. Each gives an alibi for the night
     Sam died. The alibis contradict the evidence. One lie cracks it.
   ============================================================ */

export const LOOP_LENGTH = 300;      // 5 minutes
export const START_LABEL = "11:24";
export const DEADLINE_LABEL = "11:30";
export const TYPING_MS = 1500;
export const WALLPAPER = "";

/* Audio. Drop files in public/audio/. Leave a path empty to disable that sound.
   intro: solemn track for the intro/endings. Taps are synthesized (no file). */
export const AUDIO = {
  intro: "/audio/intro.mp3",   // your solemn intro track
  introVolume: 0.55,
};

/* Chapter card, shown after the title. */
export const CHAPTER = {
  label: "Chapter One",
  name: "The Knock",
};

/* "How to play" — pure orientation. Does NOT reveal the loop; that's discovered. */
export const HOWTO = {
  heading: "Your phone",
  lines: [
    "It's late. People are trying to reach you.",
    "Read your messages and answer the people texting you.",
    "Look through your apps. Photos, notes, everything.",
    "Something is going to happen at 11:30. You have until then.",
  ],
  button: "Got it",
};

/* Title screen text. */
export const TITLE = {
  name: "BEFORE MIDNIGHT",
  chapter: "Chapter One",
  subtitle: "Some nights don't end. They start over.",
  hint: "Sound on. Headphones if you have them.",
};

/* Chapter 2 teaser, shown locked on the title and after the true ending. */
export const CHAPTER2 = {
  label: "Chapter Two",
  teaser: "The Second Car",
  blurb: "You saved her. But the phone knows there was another driver that night, and the loop was never only about Lena. Chapter Two is coming soon.",
  locked: "Coming soon",
};

/* Chapter 2 teaser, shown after the true ending and on the title (locked). */
export const CHAPTER_TWO = {
  label: "Chapter Two",
  teaserTitle: "Chapter Two",
  teaserLine: "Who was driving the second car?",
  teaserBody: "The night isn't done with you. Chapter Two is coming soon.",
  lockedNote: "Finish Chapter One to continue. Chapter Two coming soon.",
  button: "Coming soon",
};

/* Opening backstory — shown as cards before the clock starts. Each card is
   { text, photo? }. photo is a key from PHOTO_SRC (optional). Edit freely. */
export const INTRO = [
  { text: "In three weeks, you're marrying Mara.", photo: "us_recent" },
  { text: "You haven't been this happy since before the accident. Since before Sam.", photo: "old_us" },
  { text: "It's almost 11:30 PM. Your phone is buzzing on the nightstand." },
  { text: "Mara wants to tell you something. A stranger is telling you not to listen." },
  { text: "And at 11:30, someone is going to knock on your door.", photo: "front_door" },
];

export const MEMORY_LABELS = {
  mara_has_secret: "Mara is hiding something",
  saw_unknown_warning: "A stranger warned me about Mara",
  knew_lena: "The stranger is Lena. I knew her.",
  dad_warned: "Dad knows her family",
  dad_protect: "Dad hid the truth to protect me",
  saw_old_photo: "Lena and I were together, once",
  named_lena: "I said her name to her",
  knows_sam: "My best friend Sam died that night",
  sam_survived: "Sam survived the crash. He died AFTER.",
  knows_driver: "I was driving. Lena took the blame.",
  knows_alder: "The crash was on Alder Court",
  knows_cover: "Both families staged the scene",
  lena_coming_to_tell: "Lena is coming to tell the truth about Sam",
  lena_in_danger: "Someone wants Lena silenced tonight",
  knows_pregnant: "Mara is pregnant",
  knows_sisters: "Lena is Mara's sister",
  // alibis (claims — not all true)
  alibi_dad: "Dad: \"I was home all night\"",
  alibi_mom: "Mom: \"I was at the hospital with you\"",
  alibi_theo: "Theo: \"I left before it happened\"",
  alibi_mara: "Mara: \"I don't remember anything\"",
  // contradictions (evidence vs claim)
  contra_dad: "Dad's car was AT the scene (photo timestamp)",
  contra_theo: "Theo's texts place him there AFTER the crash",
  contra_mom: "Mom checked in alone. You weren't admitted yet.",
  killer_is_theo: "Theo was the last one with Sam",
  theo_near_scene: "Theo's memorial post is geotagged at the scene, 11:55 PM",
  lena_forgives: "Lena forgave me a long time ago",
  ready_to_act: "I know who's coming, and what they'll do",
  knows_loop: "This has happened before. Many times.",
};

export const ITEM_LABELS = {
  item_old_photo: "📷 The old beach photo",
  item_voicemail: "🎧 Lena's saved voicemail",
  item_crash_photo: "🚗 Photo from the crash scene",
  item_call_log: "📞 Call log from that night",
  item_receipt: "🧾 Gas station receipt, 2:14 AM",
  item_location_ping: "📍 A location ping that shouldn't exist",
  item_deleted_msgs: "💬 Theo's deleted texts",
  item_hospital_log: "🏥 Hospital check-in record",
};

export const STORY = {
  contacts: {
    you: { name: "You", color: "#e8e2d4" },
    mara: { name: "Mara", color: "#c98a6b" },
    lena: { name: "Unknown", color: "#6b7280" },
    dad: { name: "Dad", color: "#7a9b8e" },
    mom: { name: "Mom", color: "#a98ab0" },
    theo: { name: "Theo", color: "#8a9bb0" },
    sam: { name: "Sam", color: "#3a3a42" },
    self: { name: "You", color: "#2a1a1a" },
  },
  contactRename: { lena: { when: "knew_lena", name: "Lena" } },

  events: [
    { id: "ev_mara_open", time: 8, type: "message", from: "mara",
      text: "Hey. You still up? I need to tell you something." },
    { id: "ev_lena_1", time: 30, type: "notif", app: "messages", from: "lena",
      text: "Don't let anyone else come over tonight. Not until we talk. Please." },
    { id: "ev_theo_ping", time: 55, type: "message", from: "theo",
      text: "hey. you ever think about that night? been on my mind. weird." },
    { id: "ev_dad_call", time: 80, type: "call", from: "dad", text: "Incoming call" },
    { id: "ev_lena_scared", time: 120, type: "message", from: "lena",
      text: "Someone knows I'm coming. I think I was followed. If anything happens to me tonight, it wasn't an accident.",
      requires: ["opened_lena_thread"] },
    { id: "ev_mara_panic", time: 150, type: "message", from: "mara",
      text: "Why aren't you answering? You're scaring me.", forbids: ["told_mara_safe"] },
    { id: "ev_mom_call", time: 185, type: "call", from: "mom",
      text: "Incoming call", requires: ["knew_lena"] },
    { id: "ev_battery", time: 210, type: "notif", app: "phone", from: "you",
      text: "Low Battery. 10%. The screen flickers." },
    { id: "ev_theo_here", time: 240, type: "message", from: "theo",
      text: "im actually near your place rn. mind if i swing by? we should talk in person.",
      requires: ["knows_sam"] },
    { id: "ev_lena_final", time: 270, type: "message", from: "lena",
      text: "I'm here. I'm at the bottom of your stairs. Whatever you've figured out, figure it out NOW.",
      requires: ["named_lena"] },

    // ---- PSYCH HORROR: the phone starts to know. Escalates by loop. ----
    { id: "ev_glitch_self_1", time: 36, type: "glitch", from: "self", minLoop: 2,
      text: "you already read this. you already read this. you already read this." },
    { id: "ev_glitch_self_2", time: 98, type: "glitch", from: "self", minLoop: 3,
      text: "stop opening her photo. you know what's in it. you put it there." },
    { id: "ev_glitch_sam_1", time: 160, type: "glitch", from: "sam", minLoop: 3,
      text: "hey. it's me. why do you keep letting it happen the same way?" },
    { id: "ev_glitch_sam_2", time: 220, type: "glitch", from: "sam", minLoop: 4,
      text: "i was still awake when you got out of the car. i saw which one of you came back. did you?" },
    { id: "ev_glitch_self_3", time: 60, type: "glitch", from: "self", minLoop: 5,
      text: "this is the 1,4‌0‌th time. she dies at 11:30 every time but this isn't about her. it never was." },
    { id: "ev_glitch_battery", time: 250, type: "notif", app: "phone", from: "you", minLoop: 4,
      text: "Battery 100%. Battery 4%. Battery 88%. Time remaining: --:--" },

    { id: "ev_door", time: LOOP_LENGTH, type: "door" },
  ],

  threads: {
    mara: {
      contact: "mara",
      replies: [
        { id: "r_ask", text: "Tell me what?", group: "mara_open", grants: { knowledge: "mara_has_secret" },
          response: "I keep typing it and deleting it. Just... don't shut me out tonight. Okay?" },
        { id: "r_safe", text: "Whatever it is, you're safe. I'm here.", group: "mara_open", sets: { loopFlag: "told_mara_safe" },
          response: "Okay. Okay. Thank you. I love you." },
        { id: "r_mara_alibi", text: "The night of the crash. What do you actually remember?",
          requires: ["knows_sam"], grants: { knowledge: "alibi_mara" },
          response: "Nothing. The doctors said it's the trauma. I was in the back. I just... woke up after." },
        { id: "r_mara_sister", text: "Your sister is outside. Lena. Did you know she was coming?",
          requires: ["named_lena"], grants: { knowledge: "knows_sisters" },
          response: "Lena's HERE? No. No, she can't be. She swore she'd never come near us." },
        { id: "r_mara_warn", text: "Mara, I think someone wants to hurt Lena tonight. Stay on the phone.",
          requires: ["lena_in_danger"], grants: { knowledge: "ready_to_act" },
          response: "Hurt her? Who would... oh god. You don't think it's... no. Tell me it's not him." },
      ],
    },

    lena: {
      contact: "lena",
      onOpen: { grants: { knowledge: "saw_unknown_warning" }, sets: { loopFlag: "opened_lena_thread" } },
      replies: [
        { id: "r_who", text: "Who is this?",
          response: "Four years and you deleted my number. That's almost a relief, honestly." },
        { id: "r_why_here", text: "Why are you here? What do you want?",
          response: "To finally say out loud what happened to Sam. Before you marry my sister with that lie between you." },
        { id: "r_lena", text: "Lena. It's you.", requires: ["saw_old_photo"],
          grants: { knowledge: "named_lena", item: "item_voicemail" },
          response: "Yeah. It's me. And I'm not the one you should be scared of tonight." },
        { id: "r_sam", text: "Tell me what really happened to Sam.",
          requires: ["named_lena"], grants: { knowledge: "sam_survived", item: "item_crash_photo" },
          response: "He didn't die in the crash. He was alive when I left to get help. When I came back, someone had been there. He was gone." },
        { id: "r_who_after", text: "Who came back to the car after you left?",
          requires: ["sam_survived"], grants: { knowledge: "lena_in_danger", item: "item_location_ping" },
          response: "I never knew. But whoever it was has spent four years making sure I never asked. And now I'm asking." },
        { id: "r_play_vm", text: "[Play the voicemail you kept from her]",
          requiresItem: ["item_voicemail"], grants: { knowledge: "lena_forgives" },
          response: "You kept it. ...I forgave you for the driving a long time ago. That was an accident. What came after wasn't." },
      ],
    },

    dad: {
      contact: "dad",
      replies: [
        { id: "r_dad_protect", text: "What do you mean, protect me?", group: "dad_react",
          requires: ["dad_warned"], grants: { knowledge: "dad_protect" },
          response: "From what really happened that night. From what it would do to you to remember. I made a choice for you. I'm not sure it was the right one." },
        { id: "r_dad_whatsam", text: "What happened to Sam?", group: "dad_react",
          requires: ["dad_warned"], grants: { knowledge: "knows_sam", item: "item_call_log" },
          response: "He didn't make it. That's all I let myself say for four years. I'm sending you the call log from that night. Look at the times." },
        { id: "r_dad_whynot", text: "Why didn't you tell me?", group: "dad_react",
          requires: ["dad_warned"], grants: { knowledge: "dad_protect" },
          response: "Because every time I picked up the phone to do it, I saw your face at the funeral and I put it back down. I'm sorry. I'm so sorry." },
        { id: "r_dad_hi", text: "Dad? It's late, everything ok?",
          forbids: ["dad_warned"],
          grants: { knowledge: "knew_lena" }, sets: { knowledge: "dad_warned" },
          response: "The number texting you is Lena. Mara's sister. You knew her. And you need to remember Sam." },
        { id: "r_dad_sam", text: "What happened to Sam after the crash?",
          requires: ["knew_lena"], forbids: ["knows_sam"], grants: { knowledge: "knows_sam", item: "item_call_log" },
          response: "He didn't make it. That's all I let myself say for four years. I'm sending you the call log from that night. Look at the times." },
        { id: "r_dad_alibi", text: "Where were you that night, Dad?",
          requires: ["knows_sam"], grants: { knowledge: "alibi_dad" },
          response: "Home. Waiting by the phone like a useless old man. I didn't move until your mother called." },
        { id: "r_dad_confront", text: "The call log shows your car's GPS at the scene. Explain.",
          requiresItem: ["item_call_log"], requires: ["alibi_dad"], grants: { knowledge: "contra_dad" },
          response: "...I drove out when I couldn't reach you. I saw the wreck. I saw Sam. But he was already gone when I got there. I swear to you. I only stayed quiet to protect YOU." },
      ],
    },

    mom: {
      contact: "mom",
      replies: [
        { id: "r_mom_hi", text: "Mom, why so late?", requires: ["knew_lena"],
          grants: { knowledge: "knows_cover", item: "item_hospital_log" },
          response: "I saw the wedding announcement. Sweetheart, both families agreed to bury that night. I have the hospital records. I'm sending them." },
        { id: "r_mom_alibi", text: "Where were you the night of the crash?",
          requires: ["knows_sam"], grants: { knowledge: "alibi_mom" },
          response: "At the hospital. I checked in with you and never left your side. You know that." },
        { id: "r_mom_confront", text: "The hospital log says you checked in ALONE. I wasn't admitted yet.",
          requiresItem: ["item_hospital_log"], requires: ["alibi_mom"], grants: { knowledge: "contra_mom" },
          response: "...I went ahead to make sure they'd take you. There's a gap. An hour I can't account for and never could. I was terrified it would look like this." },
      ],
    },

    theo: {
      contact: "theo",
      replies: [
        { id: "r_theo_what", text: "Why are you thinking about that night?",
          response: "dunno. saw lena posted something. got this feeling. you ever feel like a night just... won't let you go?" },
        { id: "r_theo_alibi", text: "You were there that night. When did you leave?",
          requires: ["knows_sam"], grants: { knowledge: "alibi_theo" },
          response: "left right after the crash man. couldnt handle it. went home. why are you asking me this" },
        { id: "r_theo_texts", text: "Send me your texts from that night. All of them.",
          requires: ["alibi_theo"], grants: { knowledge: "contra_theo", item: "item_deleted_msgs" },
          response: "...why do you have my old number flagged. fine. sending. but i didnt do anything." },
        { id: "r_theo_receipt", text: "There's a gas receipt. 2:14 AM. Near the scene. That's an hour after you said you left.",
          requiresItem: ["item_deleted_msgs", "item_receipt"], requires: ["contra_theo"],
          grants: { knowledge: "killer_is_theo" },
          response: "...he was going to tell everyone YOU were driving. you'd have lost everything. i was protecting you. i was always protecting you. i didnt mean for him to..." },
      ],
    },
  },

  call: {
    dad: {
      audio: "/audio/Dad 1.mp3",
      missedAudio: "/audio/Dadvoicenote.mp3",
      missedFollowup: "Call me back when you hear this. And son... be careful tonight.",
      grants: { knowledge: "knew_lena" },
      grantsExtra: { knowledge: "dad_warned" },
      afterVoice: "I can't say the rest out loud. Ask me. I'll answer over text.",
      missedText: "You let it ring. Call me back. It's about Mara's family, and about Sam. It can't wait.",
      lines: [
        "Son. The number texting you isn't a stranger. It's Lena. Mara's sister.",
        "And there's something about Sam I should have told you four years ago.",
        "Ask me over text. I can't say the rest out loud.",
      ],
    },
    mom: {
      grants: { knowledge: "knows_cover" }, grantsExtra: { item: "item_hospital_log" },
      missedText: "It's your mother. Call me back the second you see this. It's about that night.",
      lines: [
        "I saw the announcement. I have to ask you something terrible.",
        "Both families agreed to bury what happened to Sam. I kept the records.",
        "Whatever Lena is about to do, you need to know the truth before she does it.",
      ],
    },
  },

  apps: {
    photos: {
      label: "Photos",
      items: [
        { id: "mara_laughing", src: "mara_laughing", caption: "Mara, last summer." },
        { id: "us_recent", src: "us_recent", caption: "Us. A few weeks ago." },
        { id: "map_pin", src: "map_pin", caption: "A dropped pin near the old highway. Why did I save this?" },
        { id: "note", src: "note", caption: "A note. Not my handwriting. \"don't tell her. after the 18th.\"" },
        { id: "front_door", src: "front_door", caption: "My door. 2 a.m. last week. Someone stood here." },
        { id: "street_sign", src: "street_sign", caption: "Alder Court. Where the crash was.",
          requires: ["dad_warned"], grants: { knowledge: "knows_alder" } },
        { id: "old_us", src: "old_us", caption: "Her. Before Mara. Lena.",
          requires: ["knew_lena"], grants: { knowledge: "saw_old_photo", item: "item_old_photo" } },
        { id: "accident", src: "accident", caption: "The crash. Headlights. There's a second set of taillights behind it.",
          requires: ["knows_sam"], grants: { knowledge: "knows_driver", item: "item_receipt" } },
        { id: "sonogram", src: "sonogram", caption: "What Mara was trying to tell me.",
          requires: ["told_mara_safe"], grants: { knowledge: "knows_pregnant" } },
        { id: "sisters_kids", src: "sisters_kids", caption: "Two girls. Lena and Mara. Sisters.",
          requires: ["named_lena"], grants: { knowledge: "knows_sisters" } },
      ],
    },
    notes: {
      label: "Notes",
      items: [
        { id: "n1", caption: "Milk. Batteries. Call the locksmith." },
        { id: "n2", caption: "If you're reading this again: answer your father. Ask about Sam.",
          requires: ["mara_has_secret"] },
        { id: "n3", caption: "The crash photo. There are TWO sets of lights. Someone else was there.",
          requires: ["knows_sam"] },
        { id: "n4", caption: "Three of them lied about that night. Only one lie is a murder. Cross-check the times.",
          requires: ["sam_survived"] },
        { id: "n5", caption: "You've done this so many times. Lena always dies at 11:30. Unless you name him first.",
          requires: ["knows_loop"] },
      ],
    },
    vault: {
      label: "Evidence",
      items: [
        { id: "v_locked", caption: "🔒 Evidence you collect appears here for cross-referencing." },
        { id: "v_calllog", caption: "📞 Call log: Dad's phone pinged a tower by Alder Court at 1:50 AM. He said he was home.",
          requires: ["item_call_log"] },
        { id: "v_hospital", caption: "🏥 Hospital: Mom checked in at 1:30 AM, alone. You weren't admitted until 3:05 AM. A 95-minute gap.",
          requires: ["item_hospital_log"] },
        { id: "v_receipt", caption: "🧾 Gas receipt: 2:14 AM, station 1 mile from the scene. Theo said he left right after the crash (12:40 AM).",
          requires: ["item_receipt"] },
        { id: "v_deleted", caption: "💬 Theo's deleted texts: \"is he still breathing\" / \"don't call anyone\" / \"i'll handle it\", timestamped 1:55 AM.",
          requires: ["item_deleted_msgs"], grants: { knowledge: "knows_loop" } },
        { id: "v_ping", caption: "📍 A location ping from Sam's phone at 2:09 AM, moving AWAY from the wreck. Someone moved him.",
          requires: ["item_location_ping"] },
      ],
    },
    feed: {
      label: "Echo",
      kind: "feed",
      // Posts render as a social feed. Red herrings are always visible (noise).
      // Evidence posts can grant knowledge/items when opened. Gated posts only
      // appear once you know enough to notice them.
      posts: [
        // --- red herrings (always visible noise) ---
        { id: "f_mara_quote", author: "mara", time: "2d", redHerring: true,
          text: "\"The people closest to you keep the biggest secrets.\" 🤍 needed this today.",
          meta: "liked by 14 people" },
        { id: "f_dad_group", author: "dad", time: "1w", redHerring: true,
          text: "joined the group 'Unsolved: Cold Cases of the Pacific Northwest'",
          meta: "Dad really discovered the internet this year" },
        { id: "f_neighbor", author: "unknown", time: "3h", redHerring: true,
          text: "anyone else hear someone in the stairwell on Alder tonight? 👀 prob nothing",
          meta: "posted in Neighborhood Watch" },
        { id: "f_mara_ring", author: "mara", time: "5d", redHerring: true,
          text: "three weeks!!! 💍 still can't believe it", photo: "us_recent",
          meta: "62 likes" },
        // --- evidence posts ---
        { id: "f_lena_soon", author: "lena", time: "6h",
          text: "Some things don't stay buried. I'm done being quiet. Tonight.",
          meta: "no likes · no comments",
          requires: ["saw_unknown_warning"] },
        { id: "f_theo_memorial", author: "theo", time: "today",
          text: "4 years without you brother. wish i'd done things different that night. 💔",
          photo: "old_us",
          meta: "📍 tagged: Alder Court · 11:55 PM",
          requires: ["knows_sam"], grants: { knowledge: "theo_near_scene" } },
        { id: "f_old_throwback", author: "theo", time: "4y",
          text: "last good night with the crew before everything changed", photo: "accident",
          meta: "📷 two cars in the driveway. one of them isn't yours or Sam's",
          requires: ["sam_survived"], grants: { item: "item_receipt" } },
      ],
    },
  },

  /* THE DOOR = the accusation. Who's about to kill Lena, and can you prove it?
     Right accusation (with proof) saves her. Wrong/uninformed = she dies, loop. */
  door: [
    // TRUE ending: you've proven it's Theo and you're ready to act.
    { id: "d_save", ending: "saved_her",
      requires: ["killer_is_theo", "ready_to_act", "lena_forgives"],
      text: "Don't open the door. Call the police, then text Lena: \"Theo's coming. RUN. I can prove it.\"" },
    // Caught the killer but didn't prepare Mara / no forgiveness — messier save.
    { id: "d_name_theo", ending: "named_the_killer",
      requires: ["killer_is_theo"], forbids: ["ready_to_act"],
      text: "Open the door and face Theo. Tell him you know what he did to Sam." },
    // Wrong accusations — you have a contradiction but blame the wrong person.
    { id: "d_blame_dad", ending: "wrong_accusation",
      requires: ["contra_dad"], forbids: ["killer_is_theo"],
      text: "It was Dad. His car was at the scene. Confront him and ignore the door." },
    { id: "d_blame_mom", ending: "wrong_accusation",
      requires: ["contra_mom"], forbids: ["killer_is_theo", "contra_dad"],
      text: "It was Mom. The missing 95 minutes. Confront her and ignore the door." },
    // Know she's in danger but not who — you open the door and try to shield her.
    { id: "d_shield", ending: "took_the_blow",
      requires: ["lena_in_danger"], forbids: ["killer_is_theo", "contra_dad", "contra_mom"],
      text: "Open the door and pull Lena inside before whoever followed her gets close." },
    // Kind but clueless.
    { id: "d_blind_kind", ending: "dont_pick_up",
      requires: ["told_mara_safe"], forbids: ["lena_in_danger", "knew_lena"],
      text: "Open the door calmly. You don't know what's happening, but you won't assume the worst." },
    // Believed the early warning, froze everyone out.
    { id: "d_ignore", ending: "believe_the_stranger",
      requires: ["saw_unknown_warning"], forbids: ["told_mara_safe", "knew_lena"],
      text: "Don't open it. Stay out of whatever this is." },
    // Default failure.
    { id: "d_confront", ending: "stranger_at_the_door",
      text: "Open the door ready for a threat." },
  ],

  endings: {
    stranger_at_the_door: {
      title: "The Stranger at the Door", tone: "loop", photo: "front_door",
      text: "You open it braced for a threat, and find a woman with her hand raised to knock. Behind her, a shape moves in the dark. You never learned who. The screen goes black. The phone lights up again. 11:30.",
    },
    believe_the_stranger: {
      title: "Believe the Stranger", tone: "loop", photo: "front_door",
      text: "You let the knock fade. In the morning they find Lena at the bottom of your stairs. \"Accident,\" the report says. You survive the night having saved no one. The phone lights up again.",
    },
    dont_pick_up: {
      title: "A Kindness in the Dark", tone: "loop", photo: "front_door",
      text: "You open the door gently and pull her in out of instinct. It buys a few minutes. But you didn't know what was coming, and the night isn't done with you yet. 11:30, again.",
    },
    took_the_blow: {
      title: "Took the Blow", tone: "final", photo: "accident",
      text: "You yank Lena inside as the figure lunges. You don't see who it is. You only feel it. Lena lives. You don't get to know if you do. But the truth she carried is finally safe with someone, and the loop, at last, goes quiet.",
    },
    wrong_accusation: {
      title: "The Wrong Name", tone: "loop", photo: "note",
      text: "You're so sure. You turn your back on the door to make the accusation, and behind you, the knock never comes, because it already happened. You blamed the wrong person, and the right one was never stopped. 11:30.",
    },
    named_the_killer: {
      title: "Name the Killer", tone: "final", photo: "accident",
      text: "You open the door and say it to his face: \"I know what you did to Sam.\" Theo freezes. The mask cracks. It's ugly and it's loud and the neighbors call it in, but Lena is alive, and for the first time the lie is out loud. Not clean. But over.",
    },
    saved_her: {
      title: "Before Midnight", tone: "true", photo: "sisters_kids",
      text: "You don't open the door. You call it in. You warn her. Theo is still at the bottom of the stairs when the police arrive, and Lena is alive, and Sam is finally more than a lie. The clock reads 11:31. Then 11:32. Time moves.\n\nYou set the phone down. It buzzes once more.\n\nUnknown: \"Good. You got it right this time. Now do you remember who was driving the SECOND car?\"\n\nThe screen reads 11:25. The phone is buzzing on the nightstand. Mara wants to tell you something.",
    },
  },
};

export const PHOTO_SRC = {
  mara_laughing: "/photos/mara_laughing.jpg",
  us_recent: "/photos/us_recent.jpg",
  map_pin: "/photos/map_pin.png",
  note: "/photos/note.png",
  front_door: "/photos/front_door.png",
  street_sign: "/photos/street_sign.png",
  old_us: "/photos/old_us.jpg",
  accident: "/photos/accident.png",
  sonogram: "/photos/sonogram.png",
  sisters_kids: "/photos/sisters_kids.jpg",
};
