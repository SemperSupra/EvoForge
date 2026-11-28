// Limitations are explicit engineering explanations, not generic disclaimers.
export type DemoLimitation={title:string;why:string;effect:string;investigate:string};
export const DEMO_LIMITATIONS:Readonly<Record<string,readonly DemoLimitation[]>>={
  "arena": [
    {
      "title": "A model, not a living ecosystem",
      "why": "Six linked-node body templates, numerical metabolism and small controllers stand in for biology. Flora is a biomass grid, not individual plants.",
      "effect": "Emergent patterns are properties of these rules; do not infer biological predictions or real species behavior.",
      "investigate": "Change one variable and compare repeated seeds at equal simulation ticks."
    },
    {
      "title": "Bounded interactions and numerical precision",
      "why": "The GPU solver searches a spatial hash with finite neighbor capacity and a fixed number of constraint passes.",
      "effect": "Dense groups can omit interactions or exhibit numerical artifacts. GPU arithmetic and scheduling prevent a promise of bit-exact replay.",
      "investigate": "Watch neighbor truncation and population telemetry; repeat on the same device, then compare across devices."
    },
    {
      "title": "Device-dependent pace and features",
      "why": "WebGPU availability, memory, resolution and per-device population budgets constrain the number of simulated bodies and update cadence.",
      "effect": "A slower device may advance fewer ticks per wall-clock second. Phone and desktop populations are not equivalent initial conditions.",
      "investigate": "Compare by tick, record profile and seed, and use the reduced-load setting where appropriate once available."
    },
    {
      "title": "Terrain and botanical research boundaries",
      "why": "Meteor craters are bounded persistent edits; individual plants, pollination, fruit dispersal and arbitrary terrain brushes are separate development experiments.",
      "effect": "Do not interpret the green field as a population of trees or assume every research prototype is shipped.",
      "investigate": "Read the separate flora research discussion and compare what the live arena actually exposes."
    }
  ],
  "craft": [
    {
      "title": "Stylized materials rather than optical physics",
      "why": "Surface shading, grout, bevel and color are computed from bounded integer geometry and seeded texture rules.",
      "effect": "Glass and gold can suggest the appearance of a material but cannot predict real reflections, refraction or illumination.",
      "investigate": "Compare two material settings with the same composition and describe the visual cues rather than physical accuracy."
    },
    {
      "title": "Local geometric search, not global optimization",
      "why": "The ceramic construction uses jittered sites and a bounded neighbor search. Other techniques are procedural approximations.",
      "effect": "It does not optimize every tessera to follow an arbitrary photograph or guarantee a physically buildable mosaic.",
      "investigate": "Compare contour courses with broken ceramic on one subject."
    },
    {
      "title": "Limited search and finite sampling",
      "why": "The 24-gene decoder, discrete technique/material choices and candidate count restrict reachable designs; different genomes can decode to the same or visually equivalent output.",
      "effect": "Selection is exploration, not a guarantee of a best design. Fine detail can vanish at low resolution.",
      "investigate": "Hold a subject fixed and compare previews, focus renders and repeated seeds."
    }
  ],
  "motif": [
    {
      "title": "A fixed catalog, not arbitrary semantic understanding",
      "why": "The original motif definitions are bounded lists of polygons, ellipses and strokes. Heraldry uses validated choices rather than an open-ended language model.",
      "effect": "Only the available symbolic configurations can be constructed; the engine cannot infer arbitrary cultural meanings or invent a historically correct coat of arms.",
      "investigate": "Keep the selected identity fixed while comparing style variants."
    },
    {
      "title": "Finite raster mask",
      "why": "Geometric shapes are rasterized into a 640 × 440 role mask before material rendering.",
      "effect": "Small features can disappear or alias; increasing final output size does not restore information absent from the source mask.",
      "investigate": "Compare fine lettering and thin lines in focus view; inspect the role-mask implementation."
    },
    {
      "title": "Cultural and historical limitations",
      "why": "The shapes are stylized original artwork and the validation rules constrain software inputs, not heraldic authority.",
      "effect": "Recognition is subjective; a valid software configuration is not proof of official arms or historical authenticity.",
      "investigate": "Consult original heraldic sources when making a cultural or historical claim."
    }
  ],
  "emblem": [
    {
      "title": "Artistic interpretation, not official specification",
      "why": "A catalog function fixes symbol identity and nominal aspect ratio, then simulated craftsmanship alters appearance.",
      "effect": "Approximate geometry, tile boundaries and shading can differ from official colors or construction rules.",
      "investigate": "Compare against the original published design specification rather than treating the output as official."
    },
    {
      "title": "Resolution and small features",
      "why": "The raster renderer uses integer coordinate mapping and smaller tiles near some role boundaries.",
      "effect": "Fine stars, outlines and narrow bands may still be obscured by grout or sampling.",
      "investigate": "Compare coarse and fine examples and inspect small features."
    },
    {
      "title": "Restricted style search",
      "why": "The 12-gene style genome cannot change the chosen symbolic identity; only its available craft parameters evolve.",
      "effect": "This protects the subject but prevents arbitrary symbol invention or unrestricted optimization.",
      "investigate": "Switch style while keeping the emblem fixed, then explicitly switch symbols."
    }
  ],
  "mosaic": [
    {
      "title": "Fixed design families",
      "why": "The 16-gene engine selects among predefined patterns, palettes and parameters.",
      "effect": "It cannot generate every possible tessellation or independently vary all construction techniques and materials.",
      "investigate": "Compare the same family with Craft Lab, which has a larger set of independent style axes."
    },
    {
      "title": "Integer approximations and sampling",
      "why": "Angles, waves and other geometry use bounded integer approximations; the output is sampled at a finite pixel resolution.",
      "effect": "Curves and details can have visible stair steps. Geometry is intended to remain coherent across resolutions, not to make different resolutions identical.",
      "investigate": "Compare preview and focus views of a saved recipe."
    },
    {
      "title": "Human selection is not exhaustive search",
      "why": "Only a finite population and bounded mutations are explored in each generation.",
      "effect": "A favored result is a preference, not mathematical proof of optimality.",
      "investigate": "Repeat the same experiment with different starting seeds and compare results."
    }
  ],
  "legacy": [
    {
      "title": "Many neutral genes",
      "why": "The 64-value genome exists, but only the first four values supply the two render seeds.",
      "effect": "Changes to the remaining 60 genes can leave the image identical. Genome diversity is not the same thing as visual diversity.",
      "investigate": "Change a non-render-active value in a copied recipe and compare at an identical render intent."
    },
    {
      "title": "Grid changes with preview detail",
      "why": "Cells are defined in pixel units, with cell size depending on level of detail.",
      "effect": "Changing image size or detail may change the composition rather than merely sharpen it.",
      "investigate": "Compare the same recipe at two detail levels."
    },
    {
      "title": "Color heuristics, not physical forces",
      "why": "Attraction, repulsion and stability adjust interpolation and channel brightness; the renderer does not integrate forces between tiles.",
      "effect": "The terms are artistic controls, not measurements of real physical processes.",
      "investigate": "Vary one setting and describe the color change rather than a mechanical interaction."
    }
  ]
};
