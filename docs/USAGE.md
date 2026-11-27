# Using EvoForge

Start at the launcher. Select a Mosaic experience or the experimental ALife arena.

## Evolve artwork

1. Choose an experience, subject and settings available in that experience.
2. Inspect generated candidates. Pick promising candidates and skip unwanted ones. Retired candidates are not active breeding candidates.
3. Use manual advancement or choose a pace. Pause and focus suspend advancement; pace does not change the evolution math.
4. Save favorites and export recipes/images using the available controls. Keep the exact recipe and engine version to reproduce canonical output. Local browser storage is not a backup; export important recipes.

## Artificial life

Observe mode displays the simulation without interventions. Play mode allows validated changes. Pause before major adjustments and use reset to restart a seeded simulation. The arena requires functional WebGPU, not merely a browser that exposes its API. A failure should provide a route back to the launcher. State is session-local; there is no promise of persistent simulation saves or exact cross-device trajectories.

## Compatibility

Desktop Chromium is the initial qualification target. Other browser and device support depends on recorded native tests. A simulated mobile viewport does not establish physical mobile performance, memory or thermal behavior. Do not interpret experimental behavior as physical or biological validation.
