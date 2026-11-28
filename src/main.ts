import "./ui/styles.css";
import { resolveExperience } from "./experiences";
import { mountLauncher } from "./ui/launcher";

async function main() {
  const root = document.getElementById("app");
  if (!root) throw new Error("Missing #app root");
  // The golden hook is a dev-only test surface, not a public experience.
  const route = resolveExperience(location.search, import.meta.env.DEV ? location.hash : "");
  if(route==="golden"){
    const {maybeInstallGoldenHook}=await import("./ui/app-golden");
    maybeInstallGoldenHook();
    root.textContent="Canonical golden replay test harness";
    return;
  }
  if (route !== "launcher") {
    {
      const nav = document.createElement("nav");
      nav.className = "experience-nav";
      const back = document.createElement("a");
      back.href = "./"; back.textContent = "All EvoForge experiences";
      nav.append(back); root.append(nav);
    }
    const { App } = await import("./ui/app");
    root.appendChild(route==="mosaic-motifs"?App("1.0.0","mosaic-motif"):route==="mosaic-emblems"?App("1.0.0","mosaic-emblem"):App(route==="mosaic-craft"?"3.0.0":route==="mosaic"?"2.0.0":"1.0.0"));
    return;
  }
  mountLauncher(root);
}
void main().catch(error => {
  const root = document.getElementById("app");
  if(root)root.textContent = "EvoForge could not start: "+String(error);
});
