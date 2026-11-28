import type { Candidate, CandidateStatus, GenerationState, Pace, Playback, GASettingsSnapshot } from "../core/types";
import { paceProfile } from "../core/pace";
import { renderEvolutionLenses, renderCandidateRadar, type LensState } from "./evolution-lenses";
import { WorkerPool } from "../workers/pool";
import type { RenderJob, MainMessage } from "../workers/protocol";
import { XorShift32, mixU32 } from "../core/prng";
import { randomGenome, advanceGeneration } from "../core/ga";
import { makeRecipe } from "../core/recipe";
import { putFavorite, listFavorites, deleteFavorite, getSetting, putSetting, importFavoritesBatch, type FavoriteRecord } from "../storage/db";
import { deriveSessionSeedFromFavorites } from "../core/session-seed";
import { canAutoAdvance, canManualNext, shouldShowReadyLatch, type AdvanceGate } from "../core/ux-gating";
import { parseRecipe, recipeGenomeU16 } from "../core/recipe";
import { getEngine } from "../engines/registry";
import {assertRenderRequest} from "../core/render-contract.mjs";
import { ATELIER_FAMILIES, ATELIER_PALETTES, atelierParents, initialAtelierGenome } from "../engines/mosaic/studio";
import { SYMBOLS, TECHNIQUES as EMBLEM_TECHNIQUES, MATERIALS as EMBLEM_MATERIALS, decode as decodeEmblem } from "../engines/mosaic/emblems.mjs";
import { CATALOG,HERALDRY_OPTIONS,TECHNIQUES as MOTIF_TECHNIQUES,MATERIALS as MOTIF_MATERIALS,PALETTES as MOTIF_PALETTES,decode as decodeMotif,noveltyKey as motifNoveltyKey } from "../engines/mosaic/motif-lab.mjs";
import { validateHeraldry } from "../engines/mosaic/motif-shapes.mjs";
import { SUBJECTS as CRAFT_FAMILIES,TECHNIQUES as CRAFT_TECHNIQUES,MATERIALS as CRAFT_MATERIALS,PALETTE_NAMES as CRAFT_PALETTES,mosaicNoveltyKey } from "../engines/mosaic/v3";

type EngineRef = { engineId: string; engineVersion: string };


const SEED_FAVORITE_IDS_KEY = "seedFavoriteIds";

export function App(engineVersion = "1.0.0", engineId = "mosaic"): HTMLElement {
  const engineRef: EngineRef = {engineId,engineVersion};
  const engine = getEngine(engineRef.engineId,engineRef.engineVersion);
  const emblem=engineId==="mosaic-emblem";
  const motif=engineId==="mosaic-motif";
  const craft=engineId==="mosaic"&&engineVersion==="3.0.0";
  const atelier=engineVersion==="2.0.0"||emblem||motif||craft;
  const familyNames=craft?CRAFT_FAMILIES:ATELIER_FAMILIES;
  const paletteNames=craft?CRAFT_PALETTES:ATELIER_PALETTES;
  const sameMotif=(c:Record<string,unknown>)=>{try{
    if(c.motifId!==engineConfig.motifId)return false;
    if(c.motifId!=="heraldry")return true;
    return JSON.stringify(validateHeraldry(c.heraldry as Record<string,unknown>|undefined))===JSON.stringify(validateHeraldry(engineConfig.heraldry as Record<string,unknown>|undefined));
  }catch{return false;}};
  const novelty=motif?((g:Uint16Array)=>motifNoveltyKey(g,engineConfig)):craft?((g:Uint16Array)=>mosaicNoveltyKey(g,engineConfig)):undefined;
  let engineConfig=engine.defaultConfig();
  const el = document.createElement("div");
  if(atelier)el.classList.add("atelier");

  let playback: Playback = "paused";
  let pace: Pace = atelier ? "slow" : "medium";
  let reviewSeconds=20;
  let interactionHeld=false,interactionRelease:number|null=null;
  let editingControl:HTMLElement|null=null;

  let sessionSeed = 123456789;
  let effectiveSessionSeed=sessionSeed;
  let sessionRequest=0;
  let generationIndex = 0;

  const settings: GASettingsSnapshot = {
    pickN: 4,
    mutationRate: atelier ? 0.22 : 0.08,
    crossoverRate: 0.7,
    newBloodRate: atelier ? 0.2 : 0.15,
    longevityMin: 3,
    longevityMax: 7
  };

  let generationId = 0;
  let renderIntentId = 0;
  let refineHold = false;
  let readyTimer: number | null = null;

  let gen: GenerationState = { generationId, renderIntentId, candidates: [] };
  const thumbMap = new Map<string, { w:number; h:number; rgba: Uint8ClampedArray; status: "gen"|"ready"|"err" }>();
  let focusCandidateId: string | null = null;
  let radarCandidateId: string | null = null;
  let focusRender: { candidateId: string; w:number; h:number; rgba: Uint8ClampedArray; status: "gen"|"ready"|"err" } | null = null;

  const lensState:LensState={ringsOpen:false,radarOpen:false,selected:null,filters:[],stage:2};
  let libraryOpen = false;
  let libraryItems: FavoriteRecord[] = [];
  // `null` means "all favorites" (default when unset). `[]` means "none".
  let seedFavoriteIds: string[] | null = null;
  let lastActionMsg: string | null = null;
  let lastActionTimer: number | null = null;

  let auxSeq = 0;
  let focusSeq=0;
  let activeFocusJob:string|null=null;
  let auxPool:WorkerPool|null=null;
  const auxPending = new Map<string, { resolve: (m: MainMessage) => void; reject: (e: Error) => void; timeoutId: number }>();

  let pool = new WorkerPool(workerCountFromPace(pace));
  pool.onMessage(onWorkerMessage);
  const replaceGalleryPool=()=>{pool.terminate();pool=new WorkerPool(workerCountFromPace(pace));pool.onMessage(onWorkerMessage);};

  // Preserve the live control during pointer gestures, native pickers and keyboard edits.
  const actionable=(t:EventTarget|null)=>t instanceof Element?t.closest<HTMLElement>("button,select,input,summary,canvas,[role=button]"):null;
  function holdInteraction(){if(interactionRelease!==null){clearTimeout(interactionRelease);interactionRelease=null;}interactionHeld=true;cancelReadyTimer();}
  function releaseInteraction(){if(interactionRelease!==null)clearTimeout(interactionRelease);interactionRelease=window.setTimeout(()=>{interactionRelease=null;interactionHeld=false;editingControl=null;render();},180);}
  el.addEventListener("pointerdown",e=>{const target=actionable(e.target);if(target){holdInteraction();if(target.matches("select,input:not([type=range])"))editingControl=target;}},true);
  window.addEventListener("pointerup",()=>{if(interactionHeld&&!editingControl)releaseInteraction();},true);
  window.addEventListener("pointercancel",()=>{if(interactionHeld)releaseInteraction();},true);
  el.addEventListener("focusin",e=>{const target=actionable(e.target);if(target?.matches("select,input:not([type=range])")){editingControl=target;holdInteraction();}},true);
  el.addEventListener("focusout",e=>{if(editingControl===e.target)releaseInteraction();},true);
  // A committed click/change can update synchronously, but never replace the control mid-gesture.
  function commitInteraction(){if(!interactionHeld)return;if(interactionRelease!==null){clearTimeout(interactionRelease);interactionRelease=null;}interactionHeld=false;editingControl=null;}
  el.addEventListener("click",e=>{const target=actionable(e.target);if(target?.matches("button,summary,canvas,[role=button]"))commitInteraction();},true);
  el.addEventListener("change",()=>commitInteraction(),true);
  el.addEventListener("keydown",e=>{const target=actionable(e.target);if(target){holdInteraction();if(target.matches("select,input:not([type=range])"))editingControl=target;else releaseInteraction();}},true);
  // First session seed is derived from favorites (if any). App() can't be async, so bootstrap.
  void startNewSession();

  function workerCountFromPace(p: Pace): number {
    const cores = navigator.hardwareConcurrency || 4;
    const cap = p === "ultra" ? 8 : p === "fast" ? 6 : p === "medium" ? 4 : 3;
    return Math.max(1, Math.min(cap, cores, matchMedia('(pointer: coarse) and (max-width: 900px)').matches ? 2 : 8));
  }

  async function startNewSession() {
    cancelReadyTimer();
    focusCandidateId = null;
    focusRender = null;

    const request=++sessionRequest;
    generationIndex = 0;
    refineHold = false;
    generationId++;
    renderIntentId = 0;
    gen={generationId,renderIntentId,candidates:[]};
    thumbMap.clear();
    activeFocusJob=null;
    replaceGalleryPool();
    render();

    const favs = await listFavorites();
    const ids = await getSetting<any>(SEED_FAVORITE_IDS_KEY);
    if(request!==sessionRequest)return;
    seedFavoriteIds = Array.isArray(ids) ? ids.slice() : null;
    const selectedIds=seedFavoriteIds;
    const selected = selectedIds === null ? favs : favs.filter(f => selectedIds.includes(f.id));
    const compatible=atelier?selected.filter(f=>f.recipeJson?.engineId===engineId&&f.recipeJson?.engineVersion===engineVersion&&(!emblem||f.recipeJson?.engineConfig?.symbolId===engineConfig.symbolId)&&(!motif||sameMotif(f.recipeJson?.engineConfig??{}))):selected;
    let parents:Uint16Array[]=[];
    if(emblem){
      const unique=new Map<string,Uint16Array>();
      for(const f of compatible){try{const recipe=parseRecipe(f.recipeJson),g=recipeGenomeU16(recipe);const p=decodeEmblem(g,recipe.engineConfig);g[0]=Math.floor((p.technique+.5)*65536/4);g[1]=Math.floor((p.material+.5)*65536/3);unique.set(Array.from(g,n=>n.toString(16).padStart(4,"0")).join(""),g);}catch{/* invalid recipe */}}
      parents=[...unique.keys()].sort().map(k=>unique.get(k)!);
    }else if(motif||craft){
      const unique=new Map<string,Uint16Array>();
      const q=(v:number,n:number)=>Math.floor((v+.5)*65536/n);
      for(const f of compatible){try{
        const recipe=parseRecipe(f.recipeJson),g=recipeGenomeU16(recipe);
        if(g.length!==engine.spec().genomeLength)continue;
        if(motif){const d=decodeMotif(g,recipe.engineConfig);g[0]=q(d.technique,4);g[1]=q(d.material,3);g[2]=q(d.palette,6);}
        else{const d=engine.decode(g,recipe.engineConfig) as {family:number;palette:number;technique:number;material:number};g[0]=q(d.family,6);g[1]=q(d.palette,6);g[16]=q(d.technique,4);g[17]=q(d.material,3);}
        unique.set(Array.from(g,n=>n.toString(16).padStart(4,"0")).join(""),g);
      }catch{/* invalid recipe */}}
      parents=[...unique.keys()].sort().map(k=>unique.get(k)!);
    }else if(atelier)parents=atelierParents(compatible.map(f=>f.recipeJson));
    const seeded = deriveSessionSeedFromFavorites({ baseSeed: sessionSeed, favorites: compatible, settings });
    effectiveSessionSeed=seeded;
    gen = { generationId, renderIntentId, candidates: makeInitialPopulation(seeded, generationIndex, 16, engine.spec().genomeLength,parents) };
    thumbMap.clear();
    scheduleThumbs();
    render();
  }

  function makeInitialPopulation(seed: number, genIndex: number, popSize: number, genomeLen: number, parents: readonly Uint16Array[]): Candidate[] {
    const rng = new XorShift32(mixU32(seed>>>0, genIndex>>>0));
    const out: Candidate[] = [];
    for (let i = 0; i < popSize; i++) {
      const r = rng.fork(i);
      const inherited=Math.min(parents.length,Math.floor(popSize/2));
      let genomeQ16:Uint16Array;
      if(emblem||motif||craft){genomeQ16=i<inherited?parents[i].slice():randomGenome(r,genomeLen);if(i>=inherited)genomeQ16[craft?16:0]=Math.floor(((i-inherited)%4+.5)*65536/4);}
      else genomeQ16=atelier?initialAtelierGenome(r,i,parents,popSize):randomGenome(r,genomeLen);
      out.push({ id: `g${genIndex}-c${i}`, genomeQ16, status: "normal", age: 0, maxAge: 5 + (r.nextU32() % 4) });
    }
    return out;
  }

  function scheduleThumbs() {
    const prof = paceProfile(pace);
    const intent = { kind: "thumb" as const, width: prof.thumb.w, height: prof.thumb.h, lod: prof.lod };
    for (const c of gen.candidates) {
      const jobId = `${gen.generationId}:${gen.renderIntentId}:${c.id}`;
      if (!thumbMap.has(c.id)) {
        thumbMap.set(c.id, { w: intent.width, h: intent.height, rgba: new Uint8ClampedArray(intent.width*intent.height*4), status: "gen" });
      }
      const job: RenderJob = {
        type: "render",
        jobId,
        generationId: gen.generationId,
        renderIntentId: gen.renderIntentId,
        candidateId: c.id,
        slot: "thumb",
        engineId: engineRef.engineId,
        engineVersion: engineRef.engineVersion,
        genomeQ16: c.genomeQ16.slice(),
        engineConfig: { ...engineConfig },
        intent
      };
      pool.post(job);
    }
  }

  function scheduleFocusRender(candidateId: string) {
    const c = gen.candidates.find(x => x.id === candidateId);
    if (!c) return;

    // Focus is an explicit user action: spend more work on a sharper render than a thumb.
    const prof = paceProfile(pace);
    const intent = { kind: "full" as const, width: 960, height: 540, lod: Math.max(2, prof.lod), format: "png" as const };

    const jobId = `${gen.generationId}:${gen.renderIntentId}:focus:${++focusSeq}:${c.id}`;
    activeFocusJob=jobId;
    focusRender = { candidateId: c.id, w: intent.width, h: intent.height, rgba: new Uint8ClampedArray(intent.width*intent.height*4), status: "gen" };

    const job: RenderJob = {
      type: "render",
      jobId,
      generationId: gen.generationId,
      renderIntentId: gen.renderIntentId,
      candidateId: c.id,
      slot: "focus",
      engineId: engineRef.engineId,
      engineVersion: engineRef.engineVersion,
      genomeQ16: c.genomeQ16.slice(),
      engineConfig: { ...engineConfig },
      intent
    };
    pool.post(job);
  }

  function onWorkerMessage(msg: MainMessage) {
    const pending = auxPending.get(msg.jobId);
    if (pending) {
      auxPending.delete(msg.jobId);
      clearTimeout(pending.timeoutId);
      if (msg.type === "result") pending.resolve(msg);
      else pending.reject(new Error(msg.message));
      return;
    }

    if (msg.generationId !== gen.generationId) return;
    if (msg.renderIntentId !== gen.renderIntentId) return;

    if (msg.slot === "thumb") {
      if (msg.type === "result") thumbMap.set(msg.candidateId, { w: msg.width, h: msg.height, rgba: msg.rgba, status: "ready" });
      else {
        const cur = thumbMap.get(msg.candidateId);
        if (cur) thumbMap.set(msg.candidateId, { ...cur, status: "err" });
      }
    } else if (msg.slot === "focus") {
      if (focusCandidateId !== msg.candidateId || activeFocusJob!==msg.jobId) return;
      if (!focusRender || focusRender.candidateId !== msg.candidateId) return;
      if (msg.type === "result") focusRender = { candidateId: msg.candidateId, w: msg.width, h: msg.height, rgba: msg.rgba, status: "ready" };
      else focusRender = { ...focusRender, status: "err" };
      if(updateFocusSurface())return;
    }
    if (refineHold && gen.candidates.length && gen.candidates.every(c => {
      const s = thumbMap.get(c.id)?.status;
      return s === "ready" || s === "err";
    })) refineHold = false;
    render();
  }

  function updateFocusSurface():boolean {
    const frame=el.querySelector<HTMLElement>(".focus-frame"),canvas=frame?.querySelector("canvas");
    if(!frame||!canvas||!focusCandidateId||!focusRender||focusRender.candidateId!==focusCandidateId)return false;
    const ctx=canvas.getContext("2d");if(!ctx)return false;
    const fallback=thumbMap.get(focusCandidateId),src=focusRender.status==="ready"?focusRender:fallback?.status==="ready"?fallback:null;
    if(src){const tmp=document.createElement("canvas");tmp.width=src.w;tmp.height=src.h;tmp.getContext("2d")?.putImageData(new ImageData(new Uint8ClampedArray(src.rgba),src.w,src.h),0,0);ctx.drawImage(tmp,0,0,canvas.width,canvas.height);}
    else{ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="white";ctx.fillText("render error",10,20);}
    const panel=renderCandidateRadar(src??undefined),old=frame.querySelector(".focus-radar");panel.classList.toggle("open",radarCandidateId===focusCandidateId);panel.setAttribute("aria-hidden",String(radarCandidateId!==focusCandidateId));old?.replaceWith(panel);return true;
  }

  function pickedCount(): number { return gen.candidates.filter(c => c.status === "picked").length; }
  function readyToAdvance(): boolean { return gen.candidates.length > 0 && gen.candidates.every(c => thumbMap.get(c.id)?.status === "ready"); }

  function cancelReadyTimer() { if (readyTimer !== null) { clearTimeout(readyTimer); readyTimer = null; } }

  function setLastAction(msg: string) {
    lastActionMsg = msg;
    if (lastActionTimer !== null) clearTimeout(lastActionTimer);
    lastActionTimer = window.setTimeout(() => {
      lastActionTimer = null;
      lastActionMsg = null;
      if(!focusCandidateId&&!libraryOpen)render();
    }, 1500);
  }

  function downloadBlob(filename: string, blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function downloadJson(filename: string, obj: any) {
    const text = JSON.stringify(obj, null, 2) + "\n";
    downloadBlob(filename, new Blob([text], { type: "application/json" }));
  }

  async function readJsonFile(file: File): Promise<any> {
    if(file.size>8*1024*1024)throw Error("Library import exceeds 8 MiB");
    const txt = await file.text();
    return JSON.parse(txt);
  }

  async function renderAuxRGBA(args: {
    engineId: string;
    engineVersion: string;
    genomeQ16: Uint16Array;
    engineConfig: Record<string, unknown>;
    intent: { kind: "thumb" | "full"; width: number; height: number; lod: number; format?: "png" | "webp" };
  }): Promise<{ rgba: Uint8ClampedArray; width: number; height: number }> {
    const jobId = `aux:${++auxSeq}`;
    const timeoutId = window.setTimeout(() => {
      const p = auxPending.get(jobId);
      if (!p) return;
      auxPending.delete(jobId);
      p.reject(new Error("Aux render timed out"));
    }, 60_000);

    const p = new Promise<MainMessage>((resolve, reject) => auxPending.set(jobId, { resolve, reject, timeoutId }));

    const job: RenderJob = {
      type: "render",
      jobId,
      generationId: -1,
      renderIntentId: -1,
      candidateId: jobId,
      slot: "aux",
      engineId: args.engineId,
      engineVersion: args.engineVersion,
      genomeQ16: args.genomeQ16.slice(),
      engineConfig: structuredClone(args.engineConfig),
      intent: { ...args.intent, format: (args.intent.kind === "full" ? (args.intent.format ?? "png") : undefined) } as any
    };
    if(!auxPool){auxPool=new WorkerPool(1);auxPool.onMessage(onWorkerMessage);}
    auxPool.post(job);

    const msg = await p;
    if (msg.type !== "result") throw new Error("Aux render failed");
    return { rgba: msg.rgba, width: msg.width, height: msg.height };
  }

  function currentGate(): AdvanceGate {
    if (focusCandidateId !== null || libraryOpen || interactionHeld) return "focus_open";
    if (playback === "paused") return "paused";
    if (refineHold) return "hold_refine";
    return "open";
  }

  function armReadyTimerIfNeeded() {
    const prof = paceProfile(pace);
    if (!canAutoAdvance({ playback, pace, gate: currentGate(), readyToAdvance: readyToAdvance() })) { cancelReadyTimer(); return; }
    // Rendering/status refreshes must not indefinitely postpone a valid deadline.
    if (readyTimer !== null) return;
    const expectedGeneration = gen.generationId, expectedIntent = gen.renderIntentId;
    readyTimer = window.setTimeout(() => {
      readyTimer = null;
      if (gen.generationId !== expectedGeneration || gen.renderIntentId !== expectedIntent) return;
      if (!canAutoAdvance({ playback, pace, gate: currentGate(), readyToAdvance: readyToAdvance() })) return;
      advanceOneGeneration();
    }, reviewSeconds*1000);
  }

  function advanceOneGeneration() {
    cancelReadyTimer();
    focusCandidateId = null;
    focusRender = null;

    generationIndex++;
    generationId++;
    renderIntentId = 0;

    const out = advanceGeneration({ sessionSeed:atelier?effectiveSessionSeed:sessionSeed, generationIndex: generationIndex-1, candidates: gen.candidates, settings, ...(atelier?{engine}:{}), ...(novelty?{noveltyKey:novelty}:{}) });
    gen = { generationId, renderIntentId, candidates: out.nextCandidates };
    activeFocusJob=null;
    replaceGalleryPool();

    thumbMap.clear();
    scheduleThumbs();
    render();
  }

  function refreshDesign() {
    cancelReadyTimer(); refineHold=false; focusCandidateId=null; focusRender=null;
    activeFocusJob=null;
    replaceGalleryPool();
    renderIntentId++;gen={...gen,renderIntentId};
    thumbMap.clear();scheduleThumbs();render();
  }

  function setPlayback(p: Playback) {
    playback = p;
    cancelReadyTimer();
    if (p === "playing" && pace === "manual") { setPace("medium"); return; }
    render();
  }

  function setPace(newPace: Pace) {
    pace = newPace;
    if (newPace === "manual") playback = "paused";
    refineHold = playback === "playing" && gen.candidates.length > 0;

    activeFocusJob=null;
    replaceGalleryPool();

    renderIntentId++;
    gen = { ...gen, renderIntentId };
    // A new intent cannot inherit ready receipts from the old raster budget.
    thumbMap.clear();
    scheduleThumbs();
    if (focusCandidateId) {
      focusRender = null;
      scheduleFocusRender(focusCandidateId);
    }

    cancelReadyTimer();
    render();
  }

  async function favoriteCandidate(c: Candidate) {
    const prof = paceProfile(pace);
    const recipe = makeRecipe({
      engineId: engineRef.engineId,
      engineVersion: engineRef.engineVersion,
      genomeQ16: c.genomeQ16,
      engineConfig: { ...engineConfig },
      renderIntent: { kind: "full", width: 1920, height: 1080, lod: Math.max(2, prof.lod), format: "png" },
      provenance: { sessionSeed, ...(atelier?{effectiveSessionSeed}:{}), generationIndex, gaSettings: settings }
    });

    const rec: FavoriteRecord = { id: crypto.randomUUID(), createdAt: new Date().toISOString(), label: `${engine.spec().displayName} g${generationIndex}`, tags: motif?[String(engineConfig.motifId)]:craft?[CRAFT_PALETTES[(engine.decode(c.genomeQ16,engineConfig) as {palette:number}).palette]]:emblem?[String(engineConfig.symbolId)]:atelier?[String((engine.decode(c.genomeQ16,engineConfig) as {paletteId:string}).paletteId)]:[], recipeJson: recipe };
    await putFavorite(rec);
    if (libraryOpen) await refreshLibrary();
    setLastAction("Saved to Library");
  }

  function toggleCandidateStatus(id: string, next: CandidateStatus) {
    gen = { ...gen, candidates: gen.candidates.map(c => c.id === id ? { ...c, status: next } : c) };
    cancelReadyTimer();
    render();
  }

  function openFocus(id: string) {
    focusCandidateId = id;
    cancelReadyTimer();
    scheduleFocusRender(id);
    render();
  }

  function closeFocus() {
    activeFocusJob=null;
    focusCandidateId = null;
    focusRender = null;
    cancelReadyTimer();
    render();
  }

  async function refreshLibrary() {
    const favs = await listFavorites();
    libraryItems = favs.slice();
    const ids = await getSetting<any>(SEED_FAVORITE_IDS_KEY);
    seedFavoriteIds = Array.isArray(ids) ? ids.slice() : null;
    render();
  }

  function exportLibraryJson() {
    downloadJson("evoforge-library.json", {
      format: "evoforge-library",
      version: 1,
      exportedAt: new Date().toISOString(),
      seedFavoriteIds,
      favorites: libraryItems
    });
    setLastAction("Exported library JSON");
  }

  function pickImportLibraryFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const f = input.files?.[0];
      if (!f) return;
      void importLibraryJsonFile(f);
    };
    input.click();
  }

  async function importLibraryJsonFile(file: File) {
    try {
      const parsed = await readJsonFile(file);
      let favs: any[] = [];
      let importedSeed: any = undefined;

      if (parsed && typeof parsed === "object" && parsed.format === "evoforge-library" && parsed.version === 1 && Array.isArray(parsed.favorites)) {
        favs = parsed.favorites;
        importedSeed = parsed.seedFavoriteIds;
      } else if (Array.isArray(parsed)) {
        // Accept a bare array as "recipe-only" import.
        favs = parsed.map((recipeJson) => ({
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          label: "imported",
          tags: [],
          recipeJson
        }));
      } else {
        throw new Error("Unrecognized import format");
      }

      // Preflight every recipe before writing anything; remap seed IDs.
      const existing = await listFavorites();
      const existingIds = new Set(existing.map(e => e.id));
      if(favs.length>1024)throw Error("Library import exceeds 1024 favorites");
      const records:FavoriteRecord[]=[];
      const idMap=new Map<string,string>();

      for (const raw of favs) {
        if (!raw || typeof raw !== "object") throw Error("Invalid favorite record");
        const recipe = parseRecipe(raw.recipeJson ?? raw);
        const eng=getEngine(recipe.engineId,recipe.engineVersion),g=recipeGenomeU16(recipe);
        assertRenderRequest(eng.spec(),g,recipe.engineConfig,recipe.renderIntent);
        eng.decode(g,recipe.engineConfig);
        const createdAt = (typeof raw.createdAt === "string" && raw.createdAt) ? raw.createdAt : new Date().toISOString();
        const label = (typeof raw.label === "string" && raw.label) ? raw.label : `${recipe.engineId} import`;
        const tags = Array.isArray(raw.tags) ? raw.tags.filter((t: any) => typeof t === "string") : [];

        const oldId=(typeof raw.id === "string" && raw.id) ? raw.id : null;
        if(oldId&&idMap.has(oldId))throw Error("Duplicate imported favorite ID");
        let id=oldId??crypto.randomUUID();
        while(existingIds.has(id))id=crypto.randomUUID();
        existingIds.add(id);
        if(oldId)idMap.set(oldId,id);
        records.push({id,createdAt,label,tags,recipeJson:recipe});
      }

      let seedSelection:string[]|null|undefined;
      if(importedSeed===null)seedSelection=null;
      else if(importedSeed!==undefined){
        if(!Array.isArray(importedSeed)||importedSeed.some(x=>typeof x!=="string"||!idMap.has(x)))throw Error("Invalid imported seed selection");
        seedSelection=[...new Set<string>(importedSeed.map(x=>idMap.get(x)!))].sort();
      }
      await importFavoritesBatch(records,SEED_FAVORITE_IDS_KEY,seedSelection);
      await refreshLibrary();
      setLastAction(`Imported ${records.length} favorites`);
    } catch (e: any) {
      alert(`Import failed: ${String(e?.message ?? e)}`);
    }
  }

  function openLibrary() {
    libraryOpen = true;
    cancelReadyTimer();
    void refreshLibrary();
    render();
  }

  function closeLibrary() {
    libraryOpen = false;
    render();
  }

  function isSeedSelected(id: string): boolean {
    if (seedFavoriteIds === null) return true;
    return seedFavoriteIds.includes(id);
  }

  async function toggleSeedSelected(id: string) {
    const set = new Set(seedFavoriteIds ?? []);
    if (seedFavoriteIds === null) for (const f of libraryItems) set.add(f.id);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    seedFavoriteIds = Array.from(set).sort();
    await putSetting(SEED_FAVORITE_IDS_KEY, seedFavoriteIds);
    setLastAction("Seed selection saved");
    render();
  }

  async function selectSeedAll() {
    seedFavoriteIds = null;
    await putSetting(SEED_FAVORITE_IDS_KEY, null);
    setLastAction("Seed selection: all");
    render();
  }

  async function selectSeedNone() {
    seedFavoriteIds = [];
    await putSetting(SEED_FAVORITE_IDS_KEY, []);
    setLastAction("Seed selection: none");
    render();
  }

  async function removeFavorite(id: string) {
    await deleteFavorite(id);
    if (Array.isArray(seedFavoriteIds)) {
      seedFavoriteIds = seedFavoriteIds.filter(x => x !== id);
      await putSetting(SEED_FAVORITE_IDS_KEY, seedFavoriteIds);
    }
    await refreshLibrary();
    setLastAction("Removed favorite");
  }

  function exportFavoriteRecipeJson(f: FavoriteRecord) {
    downloadJson(`evoforge-recipe-${f.id}.json`, f.recipeJson);
    setLastAction("Exported recipe JSON");
  }

  async function exportFavoritePng(f: FavoriteRecord) {
    try {
      const recipe = parseRecipe(f.recipeJson);
      const genomeQ16 = recipeGenomeU16(recipe);
      const intent=recipe.renderIntent;
      assertRenderRequest(getEngine(recipe.engineId,recipe.engineVersion).spec(),genomeQ16,recipe.engineConfig,intent);
      const { rgba, width, height } = await renderAuxRGBA({
        engineId: recipe.engineId,
        engineVersion: recipe.engineVersion,
        genomeQ16,
        engineConfig: recipe.engineConfig,
        intent: intent as any
      });

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D unavailable");
      ctx.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);

      const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error("PNG encode failed");
      downloadBlob(`evoforge-${recipe.engineId}@${recipe.engineVersion}-${f.id}.png`, blob);
      setLastAction("Exported PNG");
    } catch (e: any) {
      alert(`PNG export failed: ${String(e?.message ?? e)}`);
    }
  }

  function render() {
    if(interactionHeld)return;
    const priorScroll=el.querySelector<HTMLElement>(".modalBody")?.scrollTop??0;
    el.innerHTML = "";

    const header = document.createElement("div");
    header.className = "header";

    const title = document.createElement("div");
    title.className="gallery-title";
    title.innerHTML = `<b>${motif?"Motif & Heraldry Lab":craft?"Mosaic Atelier - Craft Lab":emblem?"Emblems & Heraldry":atelier?"Mosaic Atelier":"EvoForge — Legacy Mosaic"}</b> <span class="small">Gen ${generationIndex}</span>`;
    header.appendChild(title);

    const controls = document.createElement("div");
    controls.className = "controls";
    if(atelier){
      const seed=document.createElement("input"); seed.type="number";seed.min="0";seed.max="4294967295";seed.step="1";seed.value=String(sessionSeed);seed.setAttribute("aria-label","Session seed");seed.title="Explicit replay seed";seed.style.width="110px";
      seed.onchange=()=>{const n=Number(seed.value);if(!Number.isInteger(n)||n<0||n>0xffffffff){seed.value=String(sessionSeed);return;}sessionSeed=n;void startNewSession();};
      controls.appendChild(seed);
      function indexedControl(key:string,caption:string,names:readonly string[]){
        const select=document.createElement("select");select.setAttribute("aria-label",caption);const opt=document.createElement("option");opt.value="evolved";opt.textContent="Evolve "+caption.toLowerCase();select.appendChild(opt);
        names.forEach((name,i)=>{const o=document.createElement("option");o.value=String(i);o.textContent=name;select.appendChild(o);});
        select.value=String(engineConfig[key]);select.onchange=()=>{engineConfig={...engineConfig,[key]:select.value==="evolved"?"evolved":Number(select.value)};refreshDesign();};controls.appendChild(select);
      }
      if(motif){
        const subject=document.createElement("select");subject.setAttribute("aria-label","Fixed motif identity");
        const groups=new Map<string,HTMLOptGroupElement>();
        for(const [id,name,domain] of CATALOG){let group=groups.get(domain);if(!group){group=document.createElement("optgroup");group.label=domain;subject.appendChild(group);groups.set(domain,group);}const opt=document.createElement("option");opt.value=id;opt.textContent=name;group.appendChild(opt);}
        subject.value=String(engineConfig.motifId);subject.onchange=()=>{engineConfig={...engineConfig,motifId:subject.value};void startNewSession();render();};controls.appendChild(subject);
        indexedControl("techniqueId","Construction technique",MOTIF_TECHNIQUES);
        indexedControl("materialId","Material",MOTIF_MATERIALS);
        if(engineConfig.motifId!=="heraldry"){
          const pal=document.createElement("select");pal.setAttribute("aria-label","Motif palette");
          for(const v of ["evolved",...MOTIF_PALETTES]){const o=document.createElement("option");o.value=v;o.textContent=v==="evolved"?"Evolving palettes":v;pal.appendChild(o);}
          pal.value=String(engineConfig.paletteId);pal.onchange=()=>{engineConfig={...engineConfig,paletteId:pal.value};refreshDesign();};controls.appendChild(pal);
        }else{
          const h=validateHeraldry(engineConfig.heraldry as Record<string,unknown>|undefined);
          for(const [key,values] of Object.entries(HERALDRY_OPTIONS)){
            const select=document.createElement("select");select.setAttribute("aria-label","Heraldry "+key);
            for(const value of values){const o=document.createElement("option");o.value=value;o.textContent=key+": "+value;select.appendChild(o);}
            select.value=h[key];select.onchange=()=>{engineConfig={...engineConfig,heraldry:validateHeraldry({...h,[key]:select.value})};void startNewSession();render();};controls.appendChild(select);
          }
          const motto=document.createElement("input");motto.type="text";motto.maxLength=14;motto.pattern="[A-Z ]{0,14}";motto.value=h.motto;motto.placeholder="Motto (A-Z, 14 chars)";motto.setAttribute("aria-label","Heraldry motto");
          motto.onchange=()=>{const value=motto.value.toUpperCase();if(!/^[A-Z ]{0,14}$/.test(value)){motto.value=h.motto;return;}engineConfig={...engineConfig,heraldry:validateHeraldry({...h,motto:value})};void startNewSession();render();};controls.appendChild(motto);
        }
        const hint=document.createElement("span");hint.className="small";hint.textContent="Subject and heraldic identity locked · artistic interpretation";controls.appendChild(hint);
      }else if(emblem){
        const symbol=document.createElement("select");symbol.setAttribute("aria-label","Fixed emblem identity");
        const groups=new Map<string,HTMLOptGroupElement>();
        for(const [id,name,kind] of SYMBOLS){let group=groups.get(kind);if(!group){group=document.createElement("optgroup");group.label=kind==="national"?"National flags":kind;symbol.appendChild(group);groups.set(kind,group);}const opt=document.createElement("option");opt.value=id;opt.textContent=name;group.appendChild(opt);}
        symbol.value=String(engineConfig.symbolId);
        symbol.onchange=()=>{engineConfig={...engineConfig,symbolId:symbol.value};void startNewSession();render();};
        controls.appendChild(symbol);
        for(const [key,caption,names] of [["techniqueId","Construction technique",EMBLEM_TECHNIQUES],["materialId","Material",EMBLEM_MATERIALS]] as const){
          const select=document.createElement("select");select.setAttribute("aria-label",caption);const evolve=document.createElement("option");evolve.value="evolved";evolve.textContent="Evolve "+caption.toLowerCase();select.appendChild(evolve);
          names.forEach((name,i)=>{const opt=document.createElement("option");opt.value=String(i);opt.textContent=name;select.appendChild(opt);});
          select.value=String(engineConfig[key]);select.onchange=()=>{engineConfig={...engineConfig,[key]:select.value==="evolved"?"evolved":Number(select.value)};refreshDesign();};controls.appendChild(select);
        }
        const hint=document.createElement("span");hint.className="small";hint.textContent="Identity locked · artistic interpretations, not official insignia";controls.appendChild(hint);
      }else{
      const family=document.createElement("select");family.setAttribute("aria-label","Mosaic design family");
      for(const [i,name] of [["evolved","All design families"],...familyNames.map((name,i)=>[String(i),name])]){
        const opt=document.createElement("option");opt.value=i;opt.textContent=name;family.appendChild(opt);
      }
      family.value=String(engineConfig.familyId);
      family.onchange=()=>{engineConfig={...engineConfig,familyId:family.value==="evolved"?"evolved":Number(family.value)};refreshDesign();};
      controls.appendChild(family);
      const palette=document.createElement("select");palette.setAttribute("aria-label","Mosaic material palette");
      for(const key of ["evolved",...paletteNames]){
        const opt=document.createElement("option");opt.value=key;opt.textContent=key==="evolved"?"Evolving palettes":key.charAt(0).toUpperCase()+key.slice(1);palette.appendChild(opt);
      }
      palette.value=String(engineConfig.paletteId);
      palette.onchange=()=>{engineConfig={...engineConfig,paletteId:palette.value};refreshDesign();};
      controls.appendChild(palette);
      if(craft){indexedControl("techniqueId","Construction technique",CRAFT_TECHNIQUES);indexedControl("materialId","Material",CRAFT_MATERIALS);}
      }
    }

    const playBtn = document.createElement("button");
    playBtn.className="playback-toggle";
    playBtn.textContent = (playback === "playing") ? "Pause" : "Play";
    playBtn.onclick = () => setPlayback(playback === "playing" ? "paused" : "playing");
    controls.appendChild(playBtn);

    const paceSel = document.createElement("select");
    paceSel.setAttribute("aria-label","Preview quality");
    paceSel.title="Rendering detail, independent of review speed";
    for (const p of ["slow","medium","fast","ultra"] as Pace[]) {
      const opt = document.createElement("option");
      opt.value = p; opt.textContent = ({slow:"High detail",medium:"Balanced",fast:"Quick preview",ultra:"Lowest detail",manual:"Manual"})[p]; if (p === pace) opt.selected = true;
      paceSel.appendChild(opt);
    }
    paceSel.onchange = () => setPace(paceSel.value as Pace);
    controls.appendChild(paceSel);
    const speed=document.createElement("div");speed.className="review-speed";
    const slow=document.createElement("span");slow.textContent="Slow";const fast=document.createElement("span");fast.textContent="Fast";
    const slider=document.createElement("input");slider.type="range";slider.min="0";slider.max="59";slider.step="1";slider.value=String(60-reviewSeconds);slider.setAttribute("aria-label","Review speed");slider.setAttribute("aria-valuetext",reviewSeconds+" seconds per generation");
    const reading=document.createElement("output");reading.textContent=reviewSeconds+"s / generation";
    slider.oninput=()=>{reviewSeconds=60-Number(slider.value);reading.textContent=reviewSeconds+"s / generation";slider.setAttribute("aria-valuetext",reviewSeconds+" seconds per generation");cancelReadyTimer();};slider.onchange=()=>{cancelReadyTimer();if(!interactionHeld)render();};
    speed.append(slow,slider,fast,reading);controls.append(speed);

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next";
    nextBtn.disabled = gen.candidates.length===0 || !canManualNext({ playback, pace, gate: currentGate() });
    nextBtn.onclick = () => advanceOneGeneration();
    controls.appendChild(nextBtn);

    const picked = document.createElement("div");
    picked.className = "small picked-count";
    picked.textContent = `Picked ${pickedCount()} · optional parents`;
    controls.appendChild(picked);

    const spacer = document.createElement("div"); spacer.className = "spacer"; controls.appendChild(spacer);

    const libBtn = document.createElement("button");
    libBtn.textContent = "Library";
    libBtn.onclick = () => openLibrary();
    controls.appendChild(libBtn);

    const newBtn = document.createElement("button");
    newBtn.textContent = atelier?"New Seed":"New Session";
    newBtn.onclick = () => { if(atelier)sessionSeed=(sessionSeed+1)>>>0; void startNewSession(); };
    controls.appendChild(newBtn);

    header.appendChild(controls);
    el.appendChild(header);

    const prof = paceProfile(pace);
    const readyLatch=shouldShowReadyLatch({ playback, pace, gate: currentGate(), readyToAdvance: readyToAdvance() });
    const latch=document.createElement("div");latch.className="advance-strip";
    const status=document.createElement("span");status.className="advance-status";status.textContent=readyLatch?"Ready · continuing in "+reviewSeconds+"s":currentGate()==="hold_refine"?"Refining generation…":playback==="playing"?"Rendering / exploring":"Paused";
    const hold=document.createElement("button");hold.textContent="Hold";hold.disabled=!readyLatch;hold.onclick=()=>setPlayback("paused");
    const adv=document.createElement("button");adv.textContent="Advance now";adv.disabled=!readyLatch;adv.onclick=()=>advanceOneGeneration();
    latch.append(status,hold,adv);el.append(latch);
    const notification=document.createElement("div");notification.className="gallery-notice";notification.setAttribute("role","status");notification.textContent=lastActionMsg??"";el.append(notification);
    armReadyTimerIfNeeded();

    el.append(renderEvolutionLenses(gen.candidates,thumbMap,lensState,()=>{cancelReadyTimer();render();},openFocus));
    const grid = document.createElement("div"); grid.className = "grid";
    grid.dataset.playback = playback; grid.dataset.pace = pace; grid.dataset.advanceGate = currentGate();
    grid.dataset.engineId=engineRef.engineId;grid.dataset.engineVersion=engineRef.engineVersion;grid.dataset.generation=String(gen.generationId);

    for (const c of gen.candidates) {
      const card = document.createElement("div"); card.className = "card";
      const wrap = document.createElement("div"); wrap.className = "canvasWrap";

      const entry = thumbMap.get(c.id);
      const canvas = document.createElement("canvas");
      card.dataset.candidateId=c.id;
      card.dataset.renderState=entry?.status??"gen";
      card.dataset.generation=String(gen.generationId);
      canvas.setAttribute("aria-label","Preview of candidate "+c.id);
      canvas.width = prof.thumb.w;
      canvas.height = prof.thumb.h;
      canvas.style.width = "100%"; canvas.style.height = "100%";

      const ctx = canvas.getContext("2d");
      if (ctx && entry && entry.status === "ready") {
        if (entry.w === canvas.width && entry.h === canvas.height) {
          ctx.putImageData(new ImageData(new Uint8ClampedArray(entry.rgba), entry.w, entry.h), 0, 0);
        } else {
          // Scale the previous thumb into the new requested size while refinement is in flight.
          const tmp = document.createElement("canvas");
          tmp.width = entry.w; tmp.height = entry.h;
          const tctx = tmp.getContext("2d"); if (tctx) tctx.putImageData(new ImageData(new Uint8ClampedArray(entry.rgba), entry.w, entry.h), 0, 0);
          ctx.drawImage(tmp, 0, 0, canvas.width, canvas.height);
        }
      } else if (ctx) {
        ctx.fillStyle = "rgba(127,127,127,0.18)"; ctx.fillRect(0,0,canvas.width,canvas.height);
        ctx.fillStyle = "rgba(255,255,255,0.75)"; ctx.fillText(entry?.status === "err" ? "render error" : "…", 10, 20);
      }

      canvas.onclick = () => { if (c.status !== "retired") openFocus(c.id); };
      wrap.appendChild(canvas);

      if (c.status !== "normal") {
        const badge = document.createElement("div");
        badge.className = "badge " + c.status;
        badge.textContent = c.status.toUpperCase();
        card.appendChild(badge);
      }

      if (c.status === "retired") {
        const ov = document.createElement("div");
        ov.className = "overlay";
        ov.innerHTML = `<div class="small">out of turns (${c.age}/${c.maxAge})</div>`;
        card.appendChild(ov);
      }

      const footer = document.createElement("div");
      footer.className = "candidate-actions";
      footer.style.borderTop = "1px solid rgba(127,127,127,0.35)";
      footer.style.borderBottom = "none";

      const pickBtn = document.createElement("button");
      pickBtn.textContent = "✓";pickBtn.setAttribute("aria-label",c.status==="picked"?"Unpick":"Pick");pickBtn.title=c.status==="picked"?"Unpick":"Pick";pickBtn.setAttribute("aria-pressed",String(c.status==="picked"));
      pickBtn.disabled = c.status === "retired";
      pickBtn.onclick = () => toggleCandidateStatus(c.id, c.status === "picked" ? "normal" : "picked");
      footer.appendChild(pickBtn);

      const skipBtn = document.createElement("button");
      skipBtn.textContent = "×";skipBtn.setAttribute("aria-label",c.status==="skipped"?"Unskip":"Skip");skipBtn.title=c.status==="skipped"?"Unskip":"Skip";skipBtn.setAttribute("aria-pressed",String(c.status==="skipped"));
      skipBtn.disabled = c.status === "retired";
      skipBtn.onclick = () => toggleCandidateStatus(c.id, c.status === "skipped" ? "normal" : "skipped");
      footer.appendChild(skipBtn);

      const favBtn = document.createElement("button");
      favBtn.textContent = "☆";favBtn.setAttribute("aria-label","Favorite");favBtn.title="Save to library";
      favBtn.disabled = c.status === "retired";
      favBtn.onclick = () => favoriteCandidate(c);
      footer.appendChild(favBtn);

      card.appendChild(wrap);
      if(motif){const d=decodeMotif(c.genomeQ16,engineConfig);const name=document.createElement("div");name.className="atelier-caption";name.textContent=d.title+" · "+MOTIF_TECHNIQUES[d.technique]+" · "+MOTIF_MATERIALS[d.material];card.appendChild(name);}
      else if(craft){const d=engine.decode(c.genomeQ16,engineConfig) as {family:number;palette:number;technique:number;material:number};const name=document.createElement("div");name.className="atelier-caption";name.textContent=CRAFT_FAMILIES[d.family]+" · "+CRAFT_TECHNIQUES[d.technique]+" · "+CRAFT_MATERIALS[d.material];card.appendChild(name);}
      else if(emblem){const design=decodeEmblem(c.genomeQ16,engineConfig);const name=document.createElement("div");name.className="atelier-caption";name.textContent=design.title+" · "+EMBLEM_TECHNIQUES[design.technique]+" · "+EMBLEM_MATERIALS[design.material];card.appendChild(name);}
      else if(atelier){const design=engine.decode(c.genomeQ16,engineConfig) as {family:number;paletteId:string};const name=document.createElement("div");name.className="atelier-caption";name.textContent=ATELIER_FAMILIES[design.family]+" · "+design.paletteId;card.appendChild(name);}
      card.appendChild(footer);
      grid.appendChild(card);
    }

    el.appendChild(grid);

    if (focusCandidateId) {
      const c = gen.candidates.find(x => x.id === focusCandidateId);
      if (!c) {
        // Candidate went away (new session/advance). Close focus defensively.
        focusCandidateId = null;
        focusRender = null;
        cancelReadyTimer();
        render();
        return;
      }
      const back = document.createElement("div");
      back.className = "modalBack";
      back.onclick = (e) => { if (e.target === back) closeFocus(); };

      const modal = document.createElement("div"); modal.className = "modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-label","Candidate focus");modal.setAttribute("aria-modal","true");
      const mh = document.createElement("div"); mh.className = "modalHead";
      mh.innerHTML = `<b>Focus</b> <span class="small">${c.id}</span>`;
      const close = document.createElement("button"); close.textContent = "Close"; close.onclick = () => closeFocus();
      const radarToggle=document.createElement("button");radarToggle.textContent=radarCandidateId===c.id?"Image":"Radar";radarToggle.setAttribute("aria-expanded",String(radarCandidateId===c.id));radarToggle.onclick=()=>{radarCandidateId=radarCandidateId===c.id?null:c.id;render();};mh.append(radarToggle,close); modal.appendChild(mh);

      const body = document.createElement("div"); body.className = "modalBody";
      const canvas2 = document.createElement("canvas"); canvas2.width = 960; canvas2.height = 540; canvas2.style.width = "100%";
      const ctx2 = canvas2.getContext("2d");

      const focus = focusRender && focusRender.candidateId === c.id ? focusRender : null;
      const fallback = thumbMap.get(c.id);
      const src = (focus && focus.status === "ready") ? focus : (fallback && fallback.status === "ready") ? fallback : null;

      if (ctx2 && src) {
        const tmp = document.createElement("canvas");
        tmp.width = src.w; tmp.height = src.h;
        const tctx = tmp.getContext("2d"); if (tctx) tctx.putImageData(new ImageData(new Uint8ClampedArray(src.rgba), src.w, src.h), 0, 0);
        ctx2.drawImage(tmp, 0, 0, canvas2.width, canvas2.height);
      } else if (ctx2) {
        ctx2.fillStyle = "rgba(127,127,127,0.18)";
        ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
        ctx2.fillStyle = "rgba(255,255,255,0.75)";
        ctx2.fillText((focus && focus.status === "err") ? "render error" : "…", 10, 20);
      }
      const frame=document.createElement("div");frame.className="focus-frame";frame.append(canvas2);const panel=renderCandidateRadar(src??undefined);panel.classList.toggle("open",radarCandidateId===c.id);panel.setAttribute("aria-hidden",String(radarCandidateId!==c.id));frame.append(panel);body.append(frame);
      const actions=document.createElement("div");actions.className="focus-actions";
      const items=gen.candidates,at=items.findIndex(x=>x.id===c.id);
      const action=(label:string,fn:()=>void,disabled=false)=>{const b=document.createElement("button");b.textContent=label;b.disabled=disabled;b.onclick=fn;actions.append(b);};
      action("Previous",()=>openFocus(items[at-1].id),at===0);
      action(c.status==="picked"?"Unpick":"Pick",()=>toggleCandidateStatus(c.id,c.status==="picked"?"normal":"picked"),c.status==="retired");
      action(c.status==="skipped"?"Unskip":"Skip",()=>toggleCandidateStatus(c.id,c.status==="skipped"?"normal":"skipped"),c.status==="retired");
      action("Next image",()=>openFocus(items[at+1].id),at===items.length-1);
      body.append(actions);
      modal.appendChild(body);
      back.appendChild(modal);
      el.appendChild(back);body.scrollTop=priorScroll;
    }

    if (libraryOpen) {
      const back = document.createElement("div");
      back.className = "modalBack";
      back.onclick = (e) => { if (e.target === back) closeLibrary(); };

      const modal = document.createElement("div");
      modal.className = "modal";modal.setAttribute("role","dialog");modal.setAttribute("aria-label","Favorites library");modal.setAttribute("aria-modal","true");

      const mh = document.createElement("div");
      mh.className = "modalHead";
      mh.innerHTML = `<b>Library</b> <span class="small">${libraryItems.length} favorites</span>`;
      const exportBtn = document.createElement("button");
      exportBtn.textContent = "Export JSON";
      exportBtn.onclick = () => exportLibraryJson();
      mh.appendChild(exportBtn);
      const importBtn = document.createElement("button");
      importBtn.textContent = "Import JSON";
      importBtn.onclick = () => pickImportLibraryFile();
      mh.appendChild(importBtn);
      const close = document.createElement("button");
      close.textContent = "Close";
      close.onclick = () => closeLibrary();
      mh.appendChild(close);
      modal.appendChild(mh);

      const body = document.createElement("div");
      body.className = "modalBody";

      const hint = document.createElement("div");
      hint.className = "small";
      hint.textContent = motif?"Only favorites with the same locked motif and heraldic composition seed this session; other artwork remains exportable.":emblem?"Only compatible favorites of the selected symbol seed this session; other saved artwork remains available for export.":atelier?"Selected compatible Atelier favorites become actual parents in the next session (up to half the population). Legacy recipes remain exportable.":"Seed selection affects the next New Session. Default is: all favorites.";
      body.appendChild(hint);

      const seedRow = document.createElement("div");
      seedRow.className = "controls";
      const allBtn = document.createElement("button");
      allBtn.textContent = "Seed: All";
      allBtn.onclick = () => { void selectSeedAll(); };
      seedRow.appendChild(allBtn);
      const noneBtn = document.createElement("button");
      noneBtn.textContent = "Seed: None";
      noneBtn.onclick = () => { void selectSeedNone(); };
      seedRow.appendChild(noneBtn);
      body.appendChild(seedRow);

      const list = document.createElement("div");
      list.className = "list";

      if (!libraryItems.length) {
        const empty = document.createElement("div");
        empty.className = "small";
        empty.textContent = "(no favorites yet)";
        list.appendChild(empty);
      } else {
        for (const f of libraryItems.slice().sort((a,b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : a.id.localeCompare(b.id)))) {
          const row = document.createElement("div");
          row.className = "row";

          const cb = document.createElement("input");
          cb.type = "checkbox";
          cb.checked = isSeedSelected(f.id);
          cb.onchange = () => { void toggleSeedSelected(f.id); };
          row.appendChild(cb);

          const meta = document.createElement("div");
          meta.className = "meta";
          const label = document.createElement("div");
          label.className = "label";
          label.textContent = f.label || "(untitled)";
          meta.appendChild(label);
          const sub = document.createElement("div");
          sub.className = "sub";
          sub.textContent = `${f.createdAt}`;
          meta.appendChild(sub);
          row.appendChild(meta);

          const actions = document.createElement("div");
          actions.className = "actions";
          const recipeBtn = document.createElement("button");
          recipeBtn.textContent = "Recipe";
          recipeBtn.onclick = () => exportFavoriteRecipeJson(f);
          actions.appendChild(recipeBtn);
          const pngBtn = document.createElement("button");
          pngBtn.textContent = "PNG";
          pngBtn.onclick = () => { void exportFavoritePng(f); };
          actions.appendChild(pngBtn);
          const del = document.createElement("button");
          del.textContent = "Delete";
          del.onclick = () => { void removeFavorite(f.id); };
          actions.appendChild(del);
          row.appendChild(actions);

          list.appendChild(row);
        }
      }

      body.appendChild(list);
      modal.appendChild(body);
      back.appendChild(modal);
      el.appendChild(back);body.scrollTop=priorScroll;
    }
  }

  render();
  return el;
}
