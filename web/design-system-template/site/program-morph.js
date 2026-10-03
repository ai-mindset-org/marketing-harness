
/*
 * ASCII Morph System: https://github.com/eppelas/Ascii-AIM
 * 100×100 geometry, 150 segments, 3-second cadence and 25/50/25 timing.
 * data-morph-duration sets transition milliseconds; data-morph-phase sets
 * the cycle offset; data-morph-chaos controls scatter amplitude.
 * A shared animation loop pauses outside the viewport and respects reduced motion.
 */
(() => {
  const roots = [...document.querySelectorAll('.program-card__morph[data-morph-preset]')];
  if (!roots.length) return;

  const SVG_NS = 'http://www.w3.org/2000/svg';
  const COMPLEXITY = 150;
  const SPEED = 3000;
  const CHAOS = 10;

  // Every frame is copied byte-for-byte as string data from App.tsx asciiArt.
  const ASCII = {
    "ascii-0": [
        "   .-----------.   ",
        "  / [ SYNAPSE ] \\  ",
        " |  { 010101 }  | ",
        " |   < CORE >   | ",
        " |  { 101010 }  | ",
        "  \\ [ NETWORK ] /  ",
        "   '-----------'   "
    ],
    "ascii-1": [
        "  <===[ REF ]===>  ",
        "  |  (O) | (O)  |  ",
        "  |  ---[X]---  |  ",
        "  |  (O) | (O)  |  ",
        "  <===[ LEX ]===>  "
    ],
    "ascii-2": [
        " @ # % & * + . ~ ",
        " ~ . + * & % # @ ",
        " @ # % & * + . ~ ",
        " ~ . + * & % # @ ",
        " @ # % & * + . ~ "
    ],
    "ascii-3": [
        " [ [ [ [ X ] ] ] ] ",
        " [ [  { --- }  ] ] ",
        " [   < / | \\ >   ] ",
        " [  [ (  O  ) ]  ] ",
        " [ [ [ [ X ] ] ] ] "
    ],
    "ascii-4": [
        " +---------------+ ",
        " | [ PRINCIPLE ] | ",
        " |---------------| ",
        " | [ INTEGRITY ] | ",
        " +---------------+ "
    ],
    "ascii-5": [
        "  >>>>> [X] <<<<<  ",
        "  ----- (O) -----  ",
        "  <<<<< [X] >>>>>  ",
        "  ----- (O) -----  ",
        "  >>>>> [X] <<<<<  "
    ],
    "ascii-6": [
        "  /\\  /\\  /\\  /\\  ",
        " <  ><  ><  ><  > ",
        "  \\/  \\/  \\/  \\/  ",
        "  /\\  /\\  /\\  /\\  ",
        " <  ><  ><  ><  > ",
        "  \\/  \\/  \\/  \\/  "
    ],
    "ascii-7": [
        "      \\ | /      ",
        "    --[ O ]--    ",
        "   / / | \\ \\   ",
        "  | | (X) | |  ",
        "   \\ \\ | / /   ",
        "    --[ O ]--    ",
        "      / | \\      "
    ],
    "ascii-8": [
        " (H) <========> (A) ",
        "  \\   /  ||  \\   /  ",
        "   >-[ SYNC ]-<   ",
        "  /   \\  ||  /   \\  ",
        " (I) <========> (I) "
    ],
    "ascii-9": [
        "  .-------------.  ",
        " /  [ EVOLVE ]  \\ ",
        "|  { 01010101 }  |",
        "|  <  MIND  >  |",
        "|  { 10101010 }  |",
        " \\  [ ASCEND ]  / ",
        "  '-------------'  "
    ],
    "ascii-10": [
        "  _________________  ",
        "  \\               /  ",
        "   \\  [ FUTURE ] /   ",
        "    \\-----------/    ",
        "     \\ [ NOW ] /     ",
        "      \\_______/      "
    ],
    "ascii-11": [
        "  | | | | | | | |  ",
        "  +-+-+-+-+-+-+-+  ",
        "  |X|O|X|O|X|O|X|  ",
        "  +-+-+-+-+-+-+-+  ",
        "  | | | | | | | |  "
    ],
    "ascii-12": [
        "   /-----------\\   ",
        "  |  [ SCAN ]   |  ",
        "  |   <--->     |  ",
        "  |  [ MAP ]    |  ",
        "   \\-----------/   "
    ],
    "ascii-13": [
        "   .---------.     ",
        "  /  ----->  \\    ",
        " |  | [X] |  |    ",
        "  \\  <-----  /    ",
        "   '---------'     "
    ],
    "ascii-14": [
        "      [ N ]      ",
        "    /   |   \\    ",
        " [W] ---O--- [E] ",
        "    \\   |   /    ",
        "      [ S ]      "
    ],
    "ascii-15": [
        "  ~ ~ ~ ~ ~ ~ ~ ~  ",
        " / \\ / \\ / \\ / \\ / ",
        " | | | | | | | | | ",
        " \\ / \\ / \\ / \\ / \\ ",
        "  ~ ~ ~ ~ ~ ~ ~ ~  "
    ],
    "ascii-16": [
        "   /XXXXXXXXXXX\\   ",
        "  |XXXXXXXXXXXXX|  ",
        "  |XXXX[SAFE]XXX|  ",
        "  |XXXXXXXXXXXXX|  ",
        "   \\XXXXXXXXXXX/   "
    ],
    "ascii-17": [
        " [LEFT] <---> [RIGHT] ",
        "   ||           ||    ",
        "   ||===========||    ",
        "   ||           ||    "
    ],
    "ascii-18": [
        "   [-----------]   ",
        "  | [X]     [X] |  ",
        "  |    --|--    |  ",
        "  |   [=====]   |  ",
        "   [-----------]   "
    ],
    "ascii-19": [
        "      (O)      ",
        "       |       ",
        "    --[ ]--    "
    ],
    "ascii-20": [
        "  (O) <---> (O)  ",
        "   |   [S]   |   ",
        "  (O) <---> (O)  "
    ],
    "ascii-21": [
        "   [ LAB_01 ]  ",
        "   |        |  ",
        "   |________|  "
    ],
    "ascii-22": [
        "   [ LAB_01 ]  ",
        "   | # # #  |  ",
        "   | EXE:25%|  "
    ],
    "ascii-23": [
        "   [ LAB_01 ]  ",
        "   |####### |  ",
        "   | EXE:75%|  "
    ],
    "ascii-24": [
        "   [ RESULT ]  ",
        "   |########|  ",
        "   | ARTIFACT|  ",
        "   [ 0x00FF ]  "
    ],
    "ascii-25": [
        "   < SEARCH >  ",
        "   ..........  "
    ],
    "ascii-26": [
        "   < SCANNING > ",
        "   (  .  .  )  ",
        "   ..........  "
    ],
    "ascii-27": [
        "   [ TARGET ]  ",
        "     X: 255    ",
        "     Y: 128    ",
        "     ||  ||    "
    ],
    "ascii-28": [
        "  [ PERSONAL ] ",
        "  { TRACK_01 } ",
        "  [[[ (X) ]]]  ",
        "  <-- DEEP --> "
    ]
};

  const CHAR_MAP = {
    '[': [[.8,0,.2,0],[.2,0,.2,1],[.2,1,.8,1]],
    ']': [[.2,0,.8,0],[.8,0,.8,1],[.8,1,.2,1]],
    '|': [[.5,0,.5,1]], '-': [[0,.5,1,.5]],
    '=': [[0,.3,1,.3],[0,.7,1,.7]],
    '/': [[.8,0,.2,1]], '\\': [[.2,0,.8,1]],
    '<': [[.8,.1,.2,.5],[.2,.5,.8,.9]],
    '>': [[.2,.1,.8,.5],[.8,.5,.2,.9]],
    'X': [[.2,.2,.8,.8],[.8,.2,.2,.8]],
    '0': [[.2,.2,.8,.2],[.8,.2,.8,.8],[.8,.8,.2,.8],[.2,.8,.2,.2]],
    'x': [[.3,.3,.7,.7],[.7,.3,.3,.7]],
    'F': [[.8,.1,.2,.1],[.2,.1,.2,.9],[.2,.5,.7,.5]],
    'E': [[.8,.1,.2,.1],[.2,.1,.2,.9],[.2,.9,.8,.9],[.2,.5,.7,.5]],
    '#': [[.3,0,.3,1],[.7,0,.7,1],[0,.3,1,.3],[0,.7,1,.7]],
    ':': [[.5,.3,.5,.4],[.5,.6,.5,.7]],
    '%': [[.2,.2,.4,.2],[.8,.2,.2,.8],[.6,.8,.8,.8]],
    '1': [[.4,.2,.6,.1],[.6,.1,.6,.9],[.4,.9,.8,.9]],
    'A': [[.2,.9,.5,.1],[.5,.1,.8,.9],[.35,.6,.65,.6]],
    'B': [[.2,.1,.2,.9],[.2,.1,.7,.1],[.7,.1,.8,.3],[.8,.3,.7,.5],[.7,.5,.2,.5],[.7,.5,.8,.7],[.8,.7,.7,.9],[.7,.9,.2,.9]],
    'S': [[.8,.2,.2,.2],[.2,.2,.2,.5],[.2,.5,.8,.5],[.8,.5,.8,.8],[.8,.8,.2,.8]],
    'T': [[.1,.1,.9,.1],[.5,.1,.5,.9]],
    'R': [[.2,.1,.2,.9],[.2,.1,.7,.1],[.7,.1,.8,.3],[.8,.3,.7,.5],[.7,.5,.2,.5],[.5,.5,.8,.9]],
    'G': [[.8,.2,.2,.2],[.2,.2,.2,.8],[.2,.8,.8,.8],[.8,.8,.8,.5],[.8,.5,.5,.5]],
    '~': [[0,.5,.2,.3],[.2,.3,.4,.7],[.4,.7,.6,.3],[.6,.3,.8,.7],[.8,.7,1,.5]],
    '{': [[.8,0,.5,.1],[.5,.1,.5,.4],[.5,.4,.2,.5],[.2,.5,.5,.6],[.5,.6,.5,.9],[.5,.9,.8,1]],
    '}': [[.2,0,.5,.1],[.5,.1,.5,.4],[.5,.4,.8,.5],[.8,.5,.5,.6],[.5,.6,.5,.9],[.5,.9,.2,1]],
    '@': [[.5,.5,.7,.5],[.7,.5,.7,.8],[.7,.8,.3,.8],[.3,.8,.3,.2],[.3,.2,.8,.2],[.8,.2,.8,.6],[.8,.6,.6,.6]],
    '&': [[.8,.8,.2,.2],[.2,.2,.8,.2],[.8,.2,.2,.8],[.2,.8,.8,.8]],
    '*': [[.5,.2,.5,.8],[.2,.5,.8,.5],[.3,.3,.7,.7],[.7,.3,.3,.7]],
    '+': [[.5,.2,.5,.8],[.2,.5,.8,.5]],
    '.': [[.45,.8,.55,.8],[.55,.8,.55,.9],[.55,.9,.45,.9],[.45,.9,.45,.8]],
    ',': [[.5,.8,.5,.9],[.5,.9,.4,1]],
    '^': [[.2,.6,.5,.3],[.5,.3,.8,.6]],
    'v': [[.2,.3,.5,.7],[.5,.7,.8,.3]],
    '_': [[0,.9,1,.9]],
    'M': [[.1,.9,.1,.1],[.1,.1,.5,.5],[.5,.5,.9,.1],[.9,.1,.9,.9]],
    'W': [[.1,.1,.1,.9],[.1,.9,.5,.5],[.5,.5,.9,.9],[.9,.9,.9,.1]],
    'H': [[.2,.1,.2,.9],[.8,.1,.8,.9],[.2,.5,.8,.5]],
    'U': [[.2,.1,.2,.8],[.2,.8,.8,.8],[.8,.8,.8,.1]],
    'V': [[.1,.1,.5,.9],[.5,.9,.9,.1]],
    'O': [[.3,.1,.7,.1],[.7,.1,.9,.3],[.9,.3,.9,.7],[.9,.7,.7,.9],[.7,.9,.3,.9],[.3,.9,.1,.7],[.1,.7,.1,.3],[.1,.3,.3,.1]],
    'C': [[.8,.2,.5,.1],[.5,.1,.2,.3],[.2,.3,.2,.7],[.2,.7,.5,.9],[.5,.9,.8,.8]],
    'D': [[.2,.1,.2,.9],[.2,.1,.6,.1],[.6,.1,.9,.4],[.9,.4,.9,.6],[.9,.6,.6,.9],[.6,.9,.2,.9]],
    'I': [[.3,.1,.7,.1],[.5,.1,.5,.9],[.3,.9,.7,.9]],
    'L': [[.2,.1,.2,.9],[.2,.9,.8,.9]],
    'N': [[.2,.9,.2,.1],[.2,.1,.8,.9],[.8,.9,.8,.1]],
    'P': [[.2,.9,.2,.1],[.2,.1,.7,.1],[.7,.1,.8,.3],[.8,.3,.7,.5],[.7,.5,.2,.5]],
    'Q': [[.3,.1,.7,.1],[.7,.1,.9,.3],[.9,.3,.9,.7],[.9,.7,.7,.9],[.7,.9,.3,.9],[.3,.9,.1,.7],[.1,.7,.1,.3],[.1,.3,.3,.1],[.6,.6,.9,.9]],
    'K': [[.2,.1,.2,.9],[.8,.1,.2,.5],[.2,.5,.8,.9]],
    'J': [[.6,.1,.6,.7],[.6,.7,.4,.9],[.4,.9,.2,.7]],
    'Z': [[.2,.1,.8,.1],[.8,.1,.2,.9],[.2,.9,.8,.9]],
    ' ': []
  };

  const PRESETS = {
    community: { style:'complex-ascii', ids:['ascii-19','ascii-20'], color:'whitesmoke', bg:'black' },
    practice: { style:'technical', ids:['ascii-21','ascii-22','ascii-23','ascii-24'], color:'gainsboro', bg:'black' },
    personal: { style:'blueprint', ids:['ascii-25','ascii-26','ascii-27','ascii-28'], color:'gainsboro', bg:'dimgray' },
    network: { style:'complex-ascii', ids:['ascii-3','network'], color:'whitesmoke', bg:'black' },
    torus: { style:'blueprint', ids:['ascii-2','torus'], color:'white', bg:'dimgray' },
    // Case sequences use the Morph System frames and each illustration's palette.
    // Cognitive Mirror → Human-AI Synergy → Cognitive Core
    coaching: {"style":"complex-ascii","ids":["ascii-1","ascii-8","ascii-7"],"color":"dimgray","bg":"dimgray"},
    // Latent Explorer → Radar Scan → Target Lock
    vision: {"style":"blueprint","ids":["ascii-12","ascii-26","ascii-27"],"color":"dimgray","bg":"white"},
    // Neural Bridge → Recursive Feedback → Human-AI Synergy
    learning: {"style":"complex-ascii","ids":["ascii-17","ascii-13","ascii-8"],"color":"dimgray","bg":"white"},
    // Data Synthesis → Data Pulse → Artifact Creation
    summary: {"style":"technical","ids":["ascii-5","ascii-15","ascii-24"],"color":"dimgray","bg":"white"},
    // Neural Architecture → Recursive Logic → Latent Explorer
    knowledge: {"style":"complex-ascii","ids":["ascii-0","ascii-3","ascii-12"],"color":"dimgray","bg":"dimgray"},
    // Lab Setup → Process Initiation → Active Iteration → Artifact Creation
    project: {"style":"technical","ids":["ascii-21","ascii-22","ascii-23","ascii-24"],"color":"dimgray","bg":"white"},
    // Neural Loom → Recursive Feedback → The Weaver
    automation: {"style":"technical","ids":["ascii-11","ascii-13","ascii-6"],"color":"dimgray","bg":"white"},
    // Latent Point → Latent Explorer → Data Synthesis
    research: {"style":"blueprint","ids":["ascii-25","ascii-12","ascii-5"],"color":"dimgray","bg":"white"},
    // Latent Space → The Weaver → Artifact Creation
    content: {"style":"complex-ascii","ids":["ascii-2","ascii-6","ascii-24"],"color":"dimgray","bg":"dimgray"},
    // Data Horizon → Data Synthesis → Neural Architecture
    analytics: {"style":"blueprint","ids":["ascii-10","ascii-5","ascii-0"],"color":"dimgray","bg":"dimgray"},
    // Data Pulse → The Machine → Neural Bridge
    voice: {"style":"complex-ascii","ids":["ascii-15","ascii-18","ascii-17"],"color":"dimgray","bg":"white"},
    // Radar Scan → Target Lock → Peer Connection
    sales: {"style":"blueprint","ids":["ascii-26","ascii-27","ascii-20"],"color":"dimgray","bg":"dimgray"},
    // Recursive Logic → Cognitive Shield → Ethical Framework
    code: {"style":"technical","ids":["ascii-3","ascii-16","ascii-4"],"color":"dimgray","bg":"white"},
    // The Machine → Peer Connection → Human-AI Synergy
    support: {"style":"complex-ascii","ids":["ascii-18","ascii-20","ascii-8"],"color":"dimgray","bg":"white"},
    // The Weaver → Neural Loom → Recursive Feedback
    workflow: {"style":"technical","ids":["ascii-6","ascii-11","ascii-13"],"color":"dimgray","bg":"white"},

    marketing: { style:'technical', ids:['ascii-20','ascii-5','ascii-13'], color:'dimgray', bg:'transparent' },
    design: { style:'blueprint', ids:['ascii-12','ascii-24'], color:'dimgray', bg:'transparent' },
    health: { style:'blueprint', ids:['ascii-19','ascii-15'], color:'dimgray', bg:'transparent' },

    // Semantic illustrations use original, deliberately sparse gallery frames.
    // These are selections of source art, not new glyphs or redrawn geometry.
    // Single-frame figures keep a barely perceptible source-law displacement;
    // two-frame pairs describe one process and disable scatter entirely.
    // Ethical Compass: shared direction and public-purpose values.
    "np-benefit": {"style":"blueprint","ids":["ascii-14"],"color":"dimgray","bg":"transparent","duration":36000,"chaos":0.35,"ghost":false},
    // Artifact Creation: one coherent project result, without a scatter transition.
    "np-ai-project": {"style":"blueprint","ids":["ascii-24"],"color":"dimgray","bg":"transparent","duration":30000,"chaos":0,"ghost":false},
    // Peer Connection: people exchange experience with one another.
    "np-sharing": {"style":"blueprint","ids":["ascii-20"],"color":"dimgray","bg":"transparent","duration":33000,"chaos":0.35,"ghost":false},
    // Process Initiation → Active Iteration: continued participation and practice.
    "np-active-learning": {"style":"blueprint","ids":["ascii-22","ascii-23"],"color":"dimgray","bg":"transparent","duration":27000,"chaos":0,"ghost":false},
    // Target Lock: agree goals and select priority projects.
    "semantic-strategy": {"style":"blueprint","ids":["ascii-27"],"color":"dimgray","bg":"transparent","duration":28000,"chaos":0.35,"ghost":false},
    // Neural Bridge: connect existing tools and AI infrastructure.
    "semantic-setup": {"style":"blueprint","ids":["ascii-17"],"color":"dimgray","bg":"transparent","duration":32000,"chaos":0.35,"ghost":false},
    // Peer Connection: direct conversation and mutual help.
    "semantic-team-chat": {"style":"blueprint","ids":["ascii-20"],"color":"dimgray","bg":"transparent","duration":34000,"chaos":0.35,"ghost":false},
    // Process Initiation → Active Iteration: recurring progress reports.
    "semantic-progress": {"style":"blueprint","ids":["ascii-22","ascii-23"],"color":"dimgray","bg":"transparent","duration":26000,"chaos":0,"ghost":false},
    // Recursive Feedback: retrospective, feedback and improvement.
    "semantic-feedback": {"style":"blueprint","ids":["ascii-13"],"color":"dimgray","bg":"transparent","duration":36000,"chaos":0.35,"ghost":false},
    // The Machine: a customer-support AI assistant.
    "semantic-product": {"style":"blueprint","ids":["ascii-18"],"color":"dimgray","bg":"transparent","duration":28000,"chaos":0.35,"ghost":false},
    // Data Synthesis: content and personalized communication streams.
    "semantic-marketing": {"style":"blueprint","ids":["ascii-5"],"color":"dimgray","bg":"transparent","duration":30000,"chaos":0.35,"ghost":false},
    // Node Genesis: an individual joins and develops within the organization.
    "semantic-hr": {"style":"blueprint","ids":["ascii-19"],"color":"dimgray","bg":"transparent","duration":32000,"chaos":0.35,"ghost":false},
    // Neural Loom: structured, connected operational processes.
    "semantic-operations": {"style":"blueprint","ids":["ascii-11"],"color":"dimgray","bg":"transparent","duration":36000,"chaos":0.25,"ghost":false},
    // Peer Connection: practitioners learn with other practitioners.
    "semantic-community": {"style":"blueprint","ids":["ascii-20"],"color":"dimgray","bg":"transparent","duration":30000,"chaos":0.35,"ghost":false},
    // Deep Focus: a dedicated personal track.
    "semantic-personal": {"style":"blueprint","ids":["ascii-28"],"color":"dimgray","bg":"transparent","duration":34000,"chaos":0.35,"ghost":false}
  };

  const toSegmentObjects = lines => {
    const segments = [];
    const charWidth = 4;
    const charHeight = 8;
    const offsetX = 50 - (lines[0].length * charWidth) / 2;
    const offsetY = 50 - (lines.length * charHeight) / 2;
    lines.forEach((row, y) => {
      for (let x = 0; x < row.length; x += 1) {
        (CHAR_MAP[row[x]] || []).forEach(([x1,y1,x2,y2]) => segments.push({
          x1: offsetX + (x + x1) * charWidth,
          y1: offsetY + (y + y1) * charHeight,
          x2: offsetX + (x + x2) * charWidth,
          y2: offsetY + (y + y2) * charHeight
        }));
      }
    });
    return segments;
  };

  const getTorusSegments = () => {
    const segments = [];
    const cx = 50, cy = 50, R = 20, r = 10, numTubes = 12, resolution = 16;
    for (let i = 0; i < numTubes; i += 1) {
      const theta = (i / numTubes) * Math.PI * 2;
      const tubeCx = cx + R * Math.cos(theta);
      const tubeCy = cy + R * Math.sin(theta) * .5;
      for (let j = 0; j < resolution; j += 1) {
        const phi1 = (j / resolution) * Math.PI * 2;
        const phi2 = ((j + 1) / resolution) * Math.PI * 2;
        segments.push({
          x1: tubeCx + r * Math.cos(phi1) * Math.cos(theta),
          y1: tubeCy + r * Math.sin(phi1) + r * Math.cos(phi1) * Math.sin(theta) * .5,
          x2: tubeCx + r * Math.cos(phi2) * Math.cos(theta),
          y2: tubeCy + r * Math.sin(phi2) + r * Math.cos(phi2) * Math.sin(theta) * .5
        });
      }
    }
    return segments;
  };

  const networkNodes = [
    {x:20,y:80},{x:30,y:30},{x:50,y:50},{x:70,y:20},{x:80,y:70},
    {x:40,y:70},{x:60,y:40},{x:90,y:40},{x:10,y:50}
  ];
  const getNetworkSegments = () => {
    const segments = [];
    for (let i = 0; i < networkNodes.length; i += 1) {
      for (let j = i + 1; j < networkNodes.length; j += 1) {
        if (Math.hypot(networkNodes[i].x-networkNodes[j].x,networkNodes[i].y-networkNodes[j].y) < 45) {
          segments.push({x1:networkNodes[i].x,y1:networkNodes[i].y,x2:networkNodes[j].x,y2:networkNodes[j].y});
        }
      }
    }
    for (let i = 0; i < 20; i += 1) {
      const x = Math.random()*100, y = Math.random()*100;
      segments.push({x1:x,y1:y,x2:x+(Math.random()-.5)*10,y2:y+(Math.random()-.5)*10});
    }
    return segments;
  };

  const toTransformFormat = segments => segments.map(segment => ({
    cx:(segment.x1+segment.x2)/2,
    cy:(segment.y1+segment.y2)/2,
    length:Math.hypot(segment.x2-segment.x1,segment.y2-segment.y1),
    angle:Math.atan2(segment.y2-segment.y1,segment.x2-segment.x1)
  })).sort((a,b) => (a.cy*100+a.cx)-(b.cy*100+b.cx));

  const padSegments = (segments, targetLength) => {
    if (!segments.length) return Array.from({length:targetLength},()=>({cx:50,cy:50,length:0,angle:0}));
    const padded = [];
    if (targetLength >= segments.length) {
      for (let i = 0; i < targetLength; i += 1) {
        const source = segments[i % segments.length];
        padded.push({...source,length:i >= segments.length ? 0 : source.length});
      }
    } else {
      for (let i = 0; i < targetLength; i += 1) padded.push(segments[Math.floor((i/targetLength)*segments.length)]);
    }
    return padded;
  };

  const segmentsToPath = segments => {
    let path = '';
    for (const segment of segments) {
      if (segment.length === 0) continue;
      const half = segment.length/2, cos = Math.cos(segment.angle), sin = Math.sin(segment.angle);
      path += `M ${(segment.cx-cos*half).toFixed(2)} ${(segment.cy-sin*half).toFixed(2)} L ${(segment.cx+cos*half).toFixed(2)} ${(segment.cy+sin*half).toFixed(2)} `;
    }
    return path;
  };

  const resolveShape = id => {
    if (id === 'torus') return getTorusSegments();
    if (id === 'network') return getNetworkSegments();
    return toSegmentObjects(ASCII[id] || ASCII['ascii-19']);
  };

  const makeSvg = (root, preset, index) => {
    root.style.background = preset.bg;
    const svg = document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('viewBox','0 0 100 100');
    svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    svg.setAttribute('focusable','false');
    svg.classList.add(`morph-svg--${preset.style}`);
    const filterId = `program-morph-glow-${index}`;
    const stdDeviation = preset.style === 'technical' ? '1' : preset.style === 'complex-ascii' ? '1.2' : '.8';
    svg.innerHTML = `<defs>
      <pattern id="${filterId}-grid" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M 8 0 L 0 0 0 8" fill="none" stroke="${preset.color}" stroke-opacity=".08" stroke-width=".25"/></pattern>
      <filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${stdDeviation}" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    </defs>
    <rect width="100" height="100" fill="${preset.bg}"/>
    <rect width="100" height="100" fill="url(#${filterId}-grid)"/>
    <path class="morph-ghost" fill="none" stroke="${preset.color}" stroke-opacity=".16" stroke-width="${preset.style==='blueprint'?'1':preset.style==='complex-ascii'?'.4':'.7'}" vector-effect="non-scaling-stroke"/>
    <path class="morph-path" fill="none" stroke="${preset.color}" stroke-width="${preset.style==='blueprint'?'1':preset.style==='complex-ascii'?'.4':'.7'}" stroke-linecap="round" vector-effect="non-scaling-stroke" filter="url(#${filterId})"/>`;
    root.appendChild(svg);
    // Catalogue integration: the gallery's shapes and motion remain intact;
    // only its coloured technical backdrop/glow is removed from neutral cards.
    if(root.hasAttribute('data-morph-neutral')){
      root.style.background='transparent';
      svg.setAttribute('viewBox','8 16 84 68');
      svg.querySelectorAll('rect').forEach(rect=>rect.setAttribute('opacity','0'));
      svg.querySelectorAll('.morph-path,.morph-ghost').forEach(path=>{
        path.setAttribute('stroke',root.dataset.morphColor || 'dimgray');path.setAttribute('stroke-width','.85');
        path.removeAttribute('filter');
      });
    }
    // The source blueprint/classic styles omit the technical ghost layer.
    // Only semantic illustration presets opt into that quieter presentation.
    if (preset.ghost === false) svg.querySelector('.morph-ghost').setAttribute('opacity','0');
    return {svg,path:svg.querySelector('.morph-path'),ghost:svg.querySelector('.morph-ghost')};
  };

  const states = roots.map((root,index) => {
    const preset = PRESETS[root.dataset.morphPreset] || PRESETS.community;
    const sequence = preset.ids.map(resolveShape).map(toTransformFormat).map(segments => padSegments(segments,COMPLEXITY));
    sequence.push(sequence[0]);
    const drawing = makeSvg(root,preset,index);
    // Integration controls only; geometry, interpolation and scatter remain source-owned.
    const requestedDuration = Number(root.dataset.morphDuration);
    const duration = Number.isFinite(requestedDuration) && requestedDuration > 0 ? requestedDuration : (preset.duration ?? SPEED);
    const requestedPhase = Number(root.dataset.morphPhase);
    const phase = Number.isFinite(requestedPhase) ? requestedPhase : 0;
    // App.tsx exposes Chaos as a 0–50 control; retain its original scatter law.
    // Missing/invalid overrides preserve the preset setting, then catalogue CHAOS=10.
    const requestedChaos = Number(root.dataset.morphChaos);
    const chaos = Number.isFinite(requestedChaos) && requestedChaos >= 0
      ? Math.min(50,requestedChaos) : (preset.chaos ?? CHAOS);
    const state = {root,preset,sequence,drawing,duration,phase,chaos,visible:true,renderCount:0,lastPath:''};
    drawing.ghost.setAttribute('d',segmentsToPath(sequence[0]));
    return state;
  });

  const easeInOutQuad = value => value < .5 ? 2*value*value : -1+(4-2*value)*value;
  const morph = (state,timestamp,forceStatic=false) => {
    const transitions = state.sequence.length-1;
    const cycle = state.duration*transitions;
    const progress = forceStatic ? 0 : ((((timestamp+state.phase*cycle)/cycle)%1+1)%1)*transitions;
    const index = Math.min(Math.floor(progress),transitions-1);
    const tRaw = progress-index;
    let t = 0;
    if (tRaw > .75) t = 1;
    else if (tRaw >= .25) t = easeInOutQuad((tRaw-.25)*2);
    const scatterFactor = Math.sin(Math.max(0,Math.min(1,(tRaw-.2)*1.6))*Math.PI);
    const scatter = scatterFactor*state.chaos;
    const source = state.sequence[index], target = state.sequence[index+1];
    const output = source.map((from,segmentIndex) => {
      const to = target[segmentIndex];
      let deltaAngle = to.angle-from.angle;
      if (deltaAngle > Math.PI) deltaAngle -= Math.PI*2;
      if (deltaAngle < -Math.PI) deltaAngle += Math.PI*2;
      return {
        cx:from.cx+(to.cx-from.cx)*t+Math.sin(segmentIndex*13.5)*scatter,
        cy:from.cy+(to.cy-from.cy)*t+Math.cos(segmentIndex*41.2)*scatter,
        length:from.length+(to.length-from.length)*t,
        angle:from.angle+deltaAngle*t+Math.sin(segmentIndex*5.5)*scatter*.1
      };
    });
    const path = segmentsToPath(output);
    state.drawing.path.setAttribute('d',path);
    state.lastPath = path;
    state.renderCount += 1;
  };

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const observer = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(entry => {
      const state = states.find(candidate => candidate.root === entry.target);
      if (state) state.visible = entry.isIntersecting;
    });
  },{rootMargin:'160px 0px'}) : null;
  states.forEach(state => {
    observer?.observe(state.root);
    morph(state,0,true);
  });

  let frame = 0;
  const tick = timestamp => {
    if (!document.hidden && !reducedMotion.matches) states.forEach(state => { if (state.visible) morph(state,timestamp); });
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
  reducedMotion.addEventListener?.('change',event => {
    if (event.matches) states.forEach(state => morph(state,0,true));
  });

  document.documentElement.dataset.programMorphInstances = String(states.length);
  document.documentElement.dataset.programMorphMotion = reducedMotion.matches ? 'reduced' : 'animated';
})();
