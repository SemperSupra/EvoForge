import type { WorkerMessage, MainMessage } from "./protocol";
import { getEngine } from "../engines/registry";
import {assertRenderRequest} from "../core/render-contract.mjs";

self.onmessage = async (ev: MessageEvent<WorkerMessage>) => {
  const msg = ev.data;
  if (msg.type !== "render") return;
  try {
    const engine = getEngine(msg.engineId, msg.engineVersion);
    assertRenderRequest(engine.spec(),msg.genomeQ16,msg.engineConfig,msg.intent);
    const { rgba, meta } = await engine.renderRGBA(msg.genomeQ16, msg.engineConfig, msg.intent);
    const out: MainMessage = {
      type: "result",
      jobId: msg.jobId,
      generationId: msg.generationId,
      renderIntentId: msg.renderIntentId,
      candidateId: msg.candidateId,
      slot: msg.slot,
      rgba,
      width: msg.intent.width,
      height: msg.intent.height,
      meta
    };
    (self as any).postMessage(out, [rgba.buffer]);
  } catch (e: any) {
    const out: MainMessage = {
      type: "error",
      jobId: msg.jobId,
      generationId: msg.generationId,
      renderIntentId: msg.renderIntentId,
      candidateId: msg.candidateId,
      slot: msg.slot,
      message: String(e?.message ?? e)
    };
    (self as any).postMessage(out);
  }
};
