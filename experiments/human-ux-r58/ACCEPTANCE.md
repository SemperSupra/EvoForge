# Human UX acceptance — R58 (release hold)

Scope: launcher, all five Mosaic routes, ALife Observe/Play, every visible functional cluster; exact qualified candidate must be reviewed before any promotion. No prior R57 approval is sufficient. R50 was already deployed before this gate.

## Audit findings and corrective actions
- Creature roster selected tuning but no render highlight; separate presentation-only selection of each species, all fauna, flora biomass, carcass and all life; preserve physics while paused. Current flora is a biomass field, NOT R56 botanical specimens.
- Duplicate audio IDs; one soundscape section, separate from director.
- Bending stiffness is global, not species tuning; place with global ecology/evolution.
- Move environmental events/strikes beside world controls; keep camera and panel visibility accessible.
- Portrait/landscape phone must use same launch budget; tablet distinct. Manual reduced rendering budget and automatic downward adjustment based on sustained GPU submission cost, no silent population resets. Display actual measured frame cadence, cap and profile.
- Buttons/inputs have accessible labels and selection states; touch targets and overflow tests. Snapshot is a real JSON download rather than an unverified clipboard success message.

## Test matrix
| Platform | Actual scope |
|---|---|
| macOS Apple Metal Chromium | Native GPU, phone portrait/landscape, tablet, laptop, desktop viewport/touch emulation; selected life highlight and paused rendered image hashes, all seven worlds, species/global controls, budget selection, camera, strikes, event controls, reset, snapshot, audio and Observe mutation denial |
| Linux WebKit | Launcher and all five Mosaic routes at five viewport sizes; render-ready, live playback controls, compact actions, focus/radar/library |
| Linux Firefox | Same Mosaic matrix |
| Windows Chromium | Same Mosaic matrix |
| Linux contracts | Existing types and mathematical/host contracts |

## Release conditions
- All applicable automated cases pass on the exact release candidate; no weakened assertions.
- Inspect captured screenshots for readability, unobstructed arena, control clustering, highlight contrast, focus visibility and meaningful labels. A hash change alone is not visual quality acceptance.
- Physical iPhone/iPad, Android, touch Windows devices and physical GPU combinations remain unverified until device evidence exists. Emulation is not hardware certification.
- Test omissions to close: actual native Windows/Linux WebGPU adapters, Android Chrome/mobile Safari on physical devices, screen reader/keyboard navigation throughout Mosaic and modal focus restoration, every library import/export/replay edge, localized languages, dynamic performance governor under real contention and battery/thermal use, resizing/orientation under load, per-creature vs category selection, actual botanical flora selection after live integration, audio listening quality, color-vision/contrast review, long-running stress. Document explicit acceptance or deferral per gap.
- No autonomous promotion until the owner-directed human UX release gate is satisfied; R57 remains staged.
