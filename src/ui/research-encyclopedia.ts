// Educational editorial content. Original publications are research precedents, not inferred code ancestry.
export type ResearchSource={author:string;year:number;title:string;venue:string;url:string;why:string};
export type ResearchSection={heading:string;body:string;refs:readonly string[]};
export type ResearchArticle={title:string;lead:string;terms:readonly string[];sections:readonly ResearchSection[];challenge:{question:string;steps:readonly string[];next:string};scope:string;paths:readonly string[]};
export const RESEARCH_SOURCES:Readonly<Record<string,ResearchSource>>={
  "sims91": {
    "author": "Karl Sims",
    "year": 1991,
    "title": "Artificial Evolution for Computer Graphics",
    "venue": "SIGGRAPH",
    "url": "https://doi.org/10.1145/122718.122752",
    "why": "Pioneering interactive evolutionary design: people select visually promising results."
  },
  "sims94": {
    "author": "Karl Sims",
    "year": 1994,
    "title": "Evolving Virtual Creatures",
    "venue": "SIGGRAPH",
    "url": "https://doi.org/10.1145/192161.192167",
    "why": "Evolves simulated bodies and control networks; a related research precedent, not the exact arena algorithm."
  },
  "pbd": {
    "author": "Matthias Müller, Bruno Heidelberger, Marcus Hennix and John Ratcliff",
    "year": 2007,
    "title": "Position Based Dynamics",
    "venue": "Journal of Visual Communication and Image Representation",
    "url": "https://doi.org/10.1016/j.jvcir.2007.01.005",
    "why": "Explains direct position correction for constraints in simulated objects."
  },
  "spatial": {
    "author": "Matthias Teschner, Bruno Heidelberger, Matthias Müller, Danat Pomeranets and Markus Gross",
    "year": 2003,
    "title": "Optimized Spatial Hashing for Collision Detection of Deformable Objects",
    "venue": "Vision, Modeling and Visualization",
    "url": "https://cgl.ethz.ch/Downloads/Publications/Papers/2003/Tes03/Tes03.pdf",
    "why": "Primary research on using grid hashes to restrict collision candidate searches."
  },
  "csg": {
    "author": "Herbert B. Voelcker and Aristides A. G. Requicha",
    "year": 1977,
    "title": "Constructive Solid Geometry",
    "venue": "University of Rochester, Technical Memorandum 25",
    "url": "https://urresearch.rochester.edu/institutionalPublicationPublicView.action?institutionalItemVersionId=25925",
    "why": "Mathematical treatment of shapes constructed from combinations of simpler solids."
  },
  "lsys": {
    "author": "Aristid Lindenmayer",
    "year": 1968,
    "title": "Mathematical models for cellular interactions in development I. Filaments with one-sided inputs",
    "venue": "Journal of Theoretical Biology",
    "url": "https://doi.org/10.1016/0022-5193(68)90079-9",
    "why": "Foundational developmental rewriting research; relevant to experimental botanical growth, not shipped trees."
  },
  "hausner": {
    "author": "Alejo Hausner",
    "year": 2001,
    "title": "Simulating Decorative Mosaics",
    "venue": "SIGGRAPH",
    "url": "https://doi.org/10.1145/383259.383327",
    "why": "Related research on tiles following image features using centroidal Voronoi methods. EvoForge does not reproduce that optimizer."
  },
  "voronoi": {
    "author": "Georges Voronoi",
    "year": 1908,
    "title": "Nouvelles applications des paramètres continus à la théorie des formes quadratiques. Deuxième mémoire",
    "venue": "Journal für die reine und angewandte Mathematik 134",
    "url": "https://doi.org/10.1515/crll.1908.134.198",
    "why": "Foundational mathematical work associated with nearest-site regions."
  },
  "haeberli": {
    "author": "Paul Haeberli",
    "year": 1990,
    "title": "Paint by Numbers: Abstract Image Representations",
    "venue": "SIGGRAPH",
    "url": "https://doi.org/10.1145/97879.97902",
    "why": "Related research on building an image from artistic marks rather than treating pixels as the only primitives."
  },
  "perlin": {
    "author": "Ken Perlin",
    "year": 1985,
    "title": "An Image Synthesizer",
    "venue": "SIGGRAPH",
    "url": "https://doi.org/10.1145/325334.325247",
    "why": "Foundational procedural texture research; EvoForge's discrete hash fields are not Perlin noise."
  },
  "marsaglia": {
    "author": "George Marsaglia",
    "year": 2003,
    "title": "Xorshift RNGs",
    "venue": "Journal of Statistical Software",
    "url": "https://doi.org/10.18637/jss.v008.i14",
    "why": "Original publication for the xorshift family of pseudorandom generators used by Mosaic's evolutionary engine."
  },
  "sketchpad": {
    "author": "Ivan E. Sutherland",
    "year": 1963,
    "title": "Sketchpad: A Man-Machine Graphical Communication System",
    "venue": "AFIPS Spring Joint Computer Conference",
    "url": "https://doi.org/10.1145/1461551.1461591",
    "why": "Historical precedent for graphical objects, constraints and interactive geometric composition, not an implementation dependency."
  },
  "flag": {
    "author": "Dwight D. Eisenhower",
    "year": 1959,
    "title": "Executive Order 10834: The Flag of the United States",
    "venue": "US National Archives",
    "url": "https://www.archives.gov/federal-register/codification/executive-order/10834.html",
    "why": "An example of an original official specification of symbol proportions; the artistic demo is not an official flag generator."
  }
};
export const RESEARCH_ARTICLES:Readonly<Record<string,ResearchArticle>>={
  "arena": {
    "title": "Artificial life and emergent ecosystems",
    "lead": "Imagine a pond whose inhabitants are mathematical objects. They move, eat, reproduce and compete for resources, but no one scripts every movement. Artificial life explores how complex behavior can arise when many simple rules interact. EvoForge is an experimental virtual ecosystem, not a prediction of real biology.",
    "terms": [
      "artificial life",
      "emergence",
      "Verlet integration",
      "position-based dynamics",
      "spatial hashing",
      "signed distance field",
      "constructive solid geometry",
      "linear genetic programming",
      "WebGPU",
      "L-system"
    ],
    "sections": [
      {
        "heading": "Primitives: bodies, genomes and habitats",
        "body": "The arena starts with six body families: worms, urchins, centipedes, amoebas, anglers and jellies. A creature is represented by linked body nodes with positions, previous positions and ownership/link indices. Inherited numeric traits and a small instruction-based controller influence metabolism, movement, feeding and reproduction. Flora in the shipped arena is a 128 × 128 biomass grid; it is not yet a forest of individual plants. The terrain is built from mathematical height and distance functions.",
        "refs": [
          "sims94",
          "csg"
        ]
      },
      {
        "heading": "The mathematics of motion and collision",
        "body": "A simplified Verlet update is p(next) = p(now) + [p(now) − p(previous)] + a × Δt², where p is position, a is acceleration and Δt is a time step. The actual arena adds damping and corrections. Linked body parts are pulled toward desired distances, and terrain collision is resolved using distance and gradient calculations. Position-based dynamics is related research: this is not a claim that the exact published solver is used.",
        "refs": [
          "pbd"
        ]
      },
      {
        "heading": "Algorithms and parallel data",
        "body": "Checking every node against every other node grows roughly as N². Spatial hashing groups nearby nodes into grid buckets so the solver can search local candidates instead. The GPU runs compute passes over packed buffers of nodes, creatures, genomes, flora and counters. Atomic counters coordinate shared updates; finite neighbor and population budgets bound work but may omit interactions in crowded areas. The CPU receives telemetry and renders controls.",
        "refs": [
          "spatial"
        ]
      },
      {
        "heading": "A changing world: state and events",
        "body": "Each simulation tick updates ecology and reproduction, predicts movement, relaxes constraints and collects measurements. Play and Observe are distinct permission modes; Pause freezes simulation ticks while camera changes can redraw. Meteor actions have a countdown, a committed descent and an impact that persists as terrain deformation; lightning acts locally. Reset starts a new world. GPU scheduling means an arena snapshot is not a guarantee of bit-identical replay.",
        "refs": []
      },
      {
        "heading": "Further research: evolving plants",
        "body": "Lindenmayer's developmental systems use rewriting rules. For example, replacing F by F[+F][-F]F repeatedly gives a branching instruction sequence. A turtle can interpret F as a line, + and − as turns and brackets as save/restore positions. EvoForge has separate reference experiments with pollination, fruit consumption and seed dispersal. These botanical structures and individual plant ecology are research prototypes, not live arena features.",
        "refs": [
          "lsys"
        ]
      }
    ],
    "challenge": {
      "question": "Does a change in resource availability favor one creature family over another?",
      "steps": [
        "Open Play, choose a seed and environment, and record initial populations.",
        "Change only flora regrowth; keep the other settings fixed.",
        "Record population and energy at comparable ticks in a baseline and a changed trial. Repeat with at least three seeds.",
        "Explain whether the pattern is consistent, and whether crowded-neighbor truncation or frame budgets could affect interpretation."
      ],
      "next": "Try deriving the distance between two points with Pythagoras' theorem, or sketch three iterations of an L-system on paper."
    },
    "scope": "Implemented: linked-node physics, inherited traits, local interactions, biomass grid and environmental events. Related research is not exact replication. Experimental botanical R&D is not shipped.",
    "paths": [
      "public/experiences/alife/index.html"
    ]
  },
  "craft": {
    "title": "Procedural mosaics and computational craftsmanship",
    "lead": "A traditional mosaic is assembled from many small pieces called tesserae. A computer can generate a design by describing where the pieces belong, how they are shaped and what they are made to look like. Craft Lab lets you evolve the composition and the craft independently.",
    "terms": [
      "Voronoi diagram",
      "tessellation",
      "integer geometry",
      "procedural texture",
      "genetic algorithm",
      "rasterization",
      "fixed-point arithmetic",
      "material"
    ],
    "sections": [
      {
        "heading": "Primitives and composition",
        "body": "A 24-gene design encodes subject family, palette, technique, material and additional construction parameters. Subjects include medallions, botanical patterns and marine life. Rectangles, polar courses, polygon inlay and irregular fragments define tiles; a composition field assigns color roles to pieces. Stone, ceramic and glass/gold are rendered appearances, not physical material simulations.",
        "refs": [
          "hausner",
          "haeberli"
        ]
      },
      {
        "heading": "Mathematics: nearest sites and rotation",
        "body": "For a point (x,y) and seed site (a,b), squared distance is d² = (x−a)² + (y−b)². Assigning a point to its nearest site creates a Voronoi region. Craft Lab's broken-ceramic technique uses deterministically jittered sites and a bounded 3 × 3 local search. This is different from Hausner's iterative centroidal Voronoi placement. Other techniques use integer polar angles, symmetry, shape fields and approximate trigonometry.",
        "refs": [
          "voronoi",
          "hausner"
        ]
      },
      {
        "heading": "Numerical rendering",
        "body": "A shared integer world-coordinate system maps each output pixel into the same composition. Tile IDs, role colors and seeded shading create grout, bevel and material variation. Lookup tables and integer arithmetic reduce resolution-dependent differences; higher detail adds appearance rather than redefining the underlying subject. No physical light transport or ray tracing is required.",
        "refs": [
          "perlin"
        ]
      },
      {
        "heading": "The evolutionary state machine",
        "body": "A generation is a collection of candidate designs. Render candidates, review them, pick or skip, then advance to the next generation. Picked candidates can survive for a bounded age; their genomes can become parents. Crossover combines parental genes, mutation changes values, and random newcomers introduce variation. If you make no picks, the engine can use eligible normal candidates. Playback waits for completed previews and suspends advancement while you inspect a candidate. A favorite saves a versioned recipe, not just a picture. A recipe includes encoded genes and rendering configuration. These are procedural design systems, not neural image generators.",
        "refs": [
          "sims91",
          "marsaglia"
        ]
      },
      {
        "heading": "Numbers, data structures and reproducibility",
        "body": "Genes are stored as unsigned 16-bit integers (0 to 65,535). A decoder translates each integer into a bounded design parameter. Mosaic uses seeded Xorshift32 for its evolutionary random choices. Recipes encode genes in little-endian bytes and Base64 and record engine version and configuration. Render workers return RGBA byte arrays: red, green, blue and opacity for each pixel. IndexedDB stores favorites. Matching recipes, engine versions and render intents support replay; changing the renderer or resolution can change the result.",
        "refs": [
          "marsaglia"
        ]
      }
    ],
    "challenge": {
      "question": "How much does the construction technique change the perception of one subject?",
      "steps": [
        "Choose a fixed subject and material.",
        "Compare contour, inlay, broken ceramic and Byzantine courses while keeping the palette and subject unchanged where possible.",
        "Save favored recipes and compare the larger focus renders.",
        "Sketch a nearest-site diagram for five dots on graph paper and compare it to broken-ceramic tiles."
      ],
      "next": "Investigate tessellation, Voronoi diagrams and how real mosaic artists use tile orientation to follow contours."
    },
    "scope": "Implemented: bounded parameterized CPU renderer and interactive genetic search. Related mosaic optimization and procedural texture papers provide context, not identical algorithms.",
    "paths": [
      "src/engines/mosaic/v3.ts",
      "src/core/ga.ts"
    ]
  },
  "motif": {
    "title": "Geometric primitives, masks and heraldic composition",
    "lead": "A dragon, flower or coat of arms can be described as a collection of simple shapes. Keeping its identity while changing the artistic treatment separates the question of what an image represents from how it is made.",
    "terms": [
      "polygon",
      "ellipse",
      "mask",
      "rasterization",
      "point-in-polygon",
      "symmetry",
      "heraldry",
      "genotype",
      "phenotype"
    ],
    "sections": [
      {
        "heading": "Structured symbols",
        "body": "The motif catalog uses original stylized geometry made from ellipses, polygons and thick lines. Heraldry is assembled from named choices such as shield, field, charge, crest, supporters, tinctures and a bounded motto. The selected identity and heraldic configuration are held outside the 16-gene style genome. Validation constrains the configuration; it does not certify historical or heraldic correctness.",
        "refs": [
          "sketchpad"
        ]
      },
      {
        "heading": "Inside or outside?",
        "body": "A polygon is a list of vertices. To decide whether a point lies inside, imagine a ray extending to the right: count boundary crossings. An odd number indicates the interior for ordinary simple polygons. An ellipse can be tested with (x/a)² + (y/b)² ≤ 1 after centering. Layered geometric primitives are rasterized into a 640 × 440 byte mask whose values designate color roles, then mapped into the output frame.",
        "refs": []
      },
      {
        "heading": "Variation without losing the subject",
        "body": "The genome adjusts technique, material, palette, cell size, ornament, border, placement and bounded motif variants. Colors and tile placement follow the role mask. A related idea in non-photorealistic graphics is to represent a design using meaningful artistic elements rather than independently coloring every pixel. The motif engine uses its own fixed masks and style mapping, not the original papers' rendering systems.",
        "refs": [
          "haeberli",
          "hausner",
          "sims91"
        ]
      },
      {
        "heading": "The evolutionary state machine",
        "body": "A generation is a collection of candidate designs. Render candidates, review them, pick or skip, then advance to the next generation. Picked candidates can survive for a bounded age; their genomes can become parents. Crossover combines parental genes, mutation changes values, and random newcomers introduce variation. If you make no picks, the engine can use eligible normal candidates. Playback waits for completed previews and suspends advancement while you inspect a candidate. A favorite saves a versioned recipe, not just a picture. A recipe includes encoded genes and rendering configuration. These are procedural design systems, not neural image generators.",
        "refs": [
          "sims91",
          "marsaglia"
        ]
      },
      {
        "heading": "Numbers, data structures and reproducibility",
        "body": "Genes are stored as unsigned 16-bit integers (0 to 65,535). A decoder translates each integer into a bounded design parameter. Mosaic uses seeded Xorshift32 for its evolutionary random choices. Recipes encode genes in little-endian bytes and Base64 and record engine version and configuration. Render workers return RGBA byte arrays: red, green, blue and opacity for each pixel. IndexedDB stores favorites. Matching recipes, engine versions and render intents support replay; changing the renderer or resolution can change the result.",
        "refs": [
          "marsaglia"
        ]
      }
    ],
    "challenge": {
      "question": "Which changes preserve the recognizable identity of a motif?",
      "steps": [
        "Choose one motif or heraldic configuration and keep it fixed.",
        "Vary palette, material and technique through the available controls.",
        "Compare favorite renderings and identify unchanged silhouettes or field divisions.",
        "Draw a simple shield and use a ray-crossing test to classify points on graph paper."
      ],
      "next": "Explore vector geometry, symbolic composition and the history of heraldry, using primary sources for cultural claims."
    },
    "scope": "Implemented: original geometric motifs and validated heraldic configurations. No claim of official arms or exact historical authenticity.",
    "paths": [
      "src/engines/mosaic/motif-shapes.mjs",
      "src/engines/mosaic/motif-lab.mjs"
    ]
  },
  "emblem": {
    "title": "Invariant symbol geometry and evolutionary style",
    "lead": "A flag is more than a colorful image. Its arrangement, proportions and symbols communicate identity. This lab keeps a chosen emblem's design definition fixed while exploring alternative mosaic craftsmanship.",
    "terms": [
      "invariant",
      "aspect ratio",
      "mask",
      "geometric constraints",
      "point-in-polygon",
      "ellipse",
      "fixed identity",
      "vexillology"
    ],
    "sections": [
      {
        "heading": "A symbol as a mathematical object",
        "body": "Each catalog symbol has a fixed identity and aspect ratio. Coordinate functions assign color roles to regions using stripes, polygons, ellipses and other simple tests. For example, an official flag may prescribe stripe counts and star locations. The US executive order is a primary example of such design constraints. The lab's artistic interpretations must not be mistaken for certified national flags or official insignia.",
        "refs": [
          "flag"
        ]
      },
      {
        "heading": "Scaling without distortion",
        "body": "For original dimensions A and B, preserve A/B when fitting into an available rectangle. The scale factor is the smaller of available width/A and available height/B; center the result inside the frame. The renderer uses bounded integer ratios and fixed normalized coordinates. Near a boundary between symbol roles, smaller tiles preserve detail.",
        "refs": []
      },
      {
        "heading": "Genes describe the craftsmanship",
        "body": "The 12-gene style genome changes material, construction technique, grout, cell size, frame, shading and texture seed; it does not choose a different symbol. The engine samples the fixed symbol role function and applies tile geometry and material shading. Keeping subject identity separate from style is a design constraint on the search space.",
        "refs": [
          "hausner",
          "sims91"
        ]
      },
      {
        "heading": "The evolutionary state machine",
        "body": "A generation is a collection of candidate designs. Render candidates, review them, pick or skip, then advance to the next generation. Picked candidates can survive for a bounded age; their genomes can become parents. Crossover combines parental genes, mutation changes values, and random newcomers introduce variation. If you make no picks, the engine can use eligible normal candidates. Playback waits for completed previews and suspends advancement while you inspect a candidate. A favorite saves a versioned recipe, not just a picture. A recipe includes encoded genes and rendering configuration. These are procedural design systems, not neural image generators.",
        "refs": [
          "sims91",
          "marsaglia"
        ]
      },
      {
        "heading": "Numbers, data structures and reproducibility",
        "body": "Genes are stored as unsigned 16-bit integers (0 to 65,535). A decoder translates each integer into a bounded design parameter. Mosaic uses seeded Xorshift32 for its evolutionary random choices. Recipes encode genes in little-endian bytes and Base64 and record engine version and configuration. Render workers return RGBA byte arrays: red, green, blue and opacity for each pixel. IndexedDB stores favorites. Matching recipes, engine versions and render intents support replay; changing the renderer or resolution can change the result.",
        "refs": [
          "marsaglia"
        ]
      }
    ],
    "challenge": {
      "question": "How does tile size affect recognition of small symbols?",
      "steps": [
        "Select one flag or emblem.",
        "Compare coarse-looking and detailed variants without changing the symbol.",
        "Inspect the stars, edges or narrow bands in focus view.",
        "Compare the original published design specification where available; describe which artistic changes preserve recognition and which obscure it."
      ],
      "next": "Research aspect ratios, sampling and the difference between a cultural symbol and its official specification."
    },
    "scope": "Implemented: fixed symbolic definitions and style variation. Artwork is not official or guaranteed to meet every specification.",
    "paths": [
      "src/engines/mosaic/emblems.mjs",
      "src/engines/mosaic/emblem-engine.ts"
    ]
  },
  "mosaic": {
    "title": "Tesserae, symmetry and deterministic patterns",
    "lead": "What happens when art is described as rules rather than a fixed picture? Mosaic Atelier 2.0 uses geometric fields and colored tiles to create medallions, stars, botanical patterns, ribbons and marine scenes.",
    "terms": [
      "tessera",
      "polar coordinates",
      "radial symmetry",
      "integer arithmetic",
      "periodic functions",
      "procedural rendering",
      "genetic algorithm"
    ],
    "sections": [
      {
        "heading": "Geometric primitives",
        "body": "A 16-gene recipe selects the design family and palette, tile size, grout, radial structure, border, texture seed and other bounded parameters. Each tile receives its color role from the composition field. Rectangular and radial tile coordinates organize pieces into coherent courses instead of assigning unrelated colors to each pixel.",
        "refs": [
          "hausner",
          "haeberli"
        ]
      },
      {
        "heading": "Mathematics: repeating patterns",
        "body": "The distance from a center is r = √(x²+y²); an angle describes the direction from that center. Dividing a full turn into repeated sectors gives radial symmetry. Integer square roots, rational angular approximations and periodic triangle-wave functions generate repeatable shapes without relying on floating-point trigonometric functions for each pixel.",
        "refs": []
      },
      {
        "heading": "Numerical construction and comparison",
        "body": "Render pixels are mapped to integer world coordinates. The engine finds a tile, assigns its color role, then shades grout and surface variations using a coordinate hash. A fixed world geometry reduces changes in composition between preview resolutions. This earlier engine does not have the independent material and construction axes introduced in Craft Lab 3.0.",
        "refs": [
          "perlin"
        ]
      },
      {
        "heading": "The evolutionary state machine",
        "body": "A generation is a collection of candidate designs. Render candidates, review them, pick or skip, then advance to the next generation. Picked candidates can survive for a bounded age; their genomes can become parents. Crossover combines parental genes, mutation changes values, and random newcomers introduce variation. If you make no picks, the engine can use eligible normal candidates. Playback waits for completed previews and suspends advancement while you inspect a candidate. A favorite saves a versioned recipe, not just a picture. A recipe includes encoded genes and rendering configuration. These are procedural design systems, not neural image generators.",
        "refs": [
          "sims91",
          "marsaglia"
        ]
      },
      {
        "heading": "Numbers, data structures and reproducibility",
        "body": "Genes are stored as unsigned 16-bit integers (0 to 65,535). A decoder translates each integer into a bounded design parameter. Mosaic uses seeded Xorshift32 for its evolutionary random choices. Recipes encode genes in little-endian bytes and Base64 and record engine version and configuration. Render workers return RGBA byte arrays: red, green, blue and opacity for each pixel. IndexedDB stores favorites. Matching recipes, engine versions and render intents support replay; changing the renderer or resolution can change the result.",
        "refs": [
          "marsaglia"
        ]
      }
    ],
    "challenge": {
      "question": "Can you recognize mathematical symmetry in a generated mosaic?",
      "steps": [
        "Explore a medallion or star-and-cross family.",
        "Identify repeating sectors and estimate their angle: 360° divided by the number of sectors.",
        "Compare a saved recipe in preview and focus views.",
        "Select patterns with a shared feature and observe whether later generations preserve it."
      ],
      "next": "Draw a pattern using rotations of one small shape, then explore periodic functions and modular arithmetic."
    },
    "scope": "Implemented: deterministic integer composition and tessera shading; no claim of exact reproduction of historical mosaics.",
    "paths": [
      "src/engines/mosaic/v2.ts",
      "src/core/ga.ts"
    ]
  },
  "legacy": {
    "title": "Seeded randomness, pixel grids and evolutionary search",
    "lead": "The simplest Mosaic engine illustrates an important idea in computer science: a small mathematical recipe can produce a large image. The same recipe can be rendered again without storing all its pixels.",
    "terms": [
      "pseudorandom",
      "hash function",
      "linear interpolation",
      "RGB",
      "raster",
      "genome",
      "reproducibility",
      "modular arithmetic"
    ],
    "sections": [
      {
        "heading": "Primitives: cells and colors",
        "body": "The legacy genome contains 64 unsigned 16-bit numbers, but this renderer reads only the first four for two 32-bit seeds. The remaining genes do not directly affect the visible image. The canvas is divided into square cells, and a deterministic coordinate hash chooses palette colors and blend values for each cell. The result is a deliberately simple early baseline.",
        "refs": [
          "perlin"
        ]
      },
      {
        "heading": "Mathematics: mixing colors",
        "body": "Linear interpolation between colors A and B is C = (1−t)A + tB, where t is between zero and one. The renderer uses integer weights from 0 to 255, clips channels to the byte range and applies palette attraction, repulsion and stability settings as color heuristics. These names do not imply a real physical force or dynamical system.",
        "refs": []
      },
      {
        "heading": "Randomness that can be repeated",
        "body": "A pseudorandom generator is a deterministic procedure whose output appears irregular. Xorshift32 updates a 32-bit state using shifts and exclusive-or operations. The genetic search uses that generator; the image uses a separate coordinate hash. A seed fixes the sequence or pattern. Preview detail changes cell size in this early renderer, unlike the later world-coordinate designs.",
        "refs": [
          "marsaglia",
          "perlin"
        ]
      },
      {
        "heading": "The evolutionary state machine",
        "body": "A generation is a collection of candidate designs. Render candidates, review them, pick or skip, then advance to the next generation. Picked candidates can survive for a bounded age; their genomes can become parents. Crossover combines parental genes, mutation changes values, and random newcomers introduce variation. If you make no picks, the engine can use eligible normal candidates. Playback waits for completed previews and suspends advancement while you inspect a candidate. A favorite saves a versioned recipe, not just a picture. A recipe includes encoded genes and rendering configuration. These are procedural design systems, not neural image generators.",
        "refs": [
          "sims91",
          "marsaglia"
        ]
      },
      {
        "heading": "Numbers, data structures and reproducibility",
        "body": "Genes are stored as unsigned 16-bit integers (0 to 65,535). A decoder translates each integer into a bounded design parameter. Mosaic uses seeded Xorshift32 for its evolutionary random choices. Recipes encode genes in little-endian bytes and Base64 and record engine version and configuration. Render workers return RGBA byte arrays: red, green, blue and opacity for each pixel. IndexedDB stores favorites. Matching recipes, engine versions and render intents support replay; changing the renderer or resolution can change the result.",
        "refs": [
          "marsaglia"
        ]
      }
    ],
    "challenge": {
      "question": "Why do different genomes sometimes produce the same visible image?",
      "steps": [
        "Compare several candidates and save favorites.",
        "Repeat a saved recipe using the same engine and rendering settings.",
        "Observe how preview detail affects the apparent cell grid.",
        "Consider the unused 60 genes: how could mutations change the recipe without changing the picture?"
      ],
      "next": "Use a spreadsheet or short program to mix RGB values and generate a grid from a simple repeatable sequence."
    },
    "scope": "Implemented: original hash-based CPU renderer and evolutionary search. Preserved as a baseline, not an advanced physical or AI model.",
    "paths": [
      "src/engines/mosaic/v1.ts",
      "src/core/prng.ts"
    ]
  }
};
