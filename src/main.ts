import "./ui/styles.css";
import { resolveExperience, EXPERIENCES } from "./experiences";

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
  const shell = document.createElement("main");
  shell.className = "experience-shell";
  const heading = document.createElement("h1"); heading.textContent = "EvoForge";
  const intro = document.createElement("p"); intro.textContent = "Choose an evolutionary experience. Each runs independently in your browser.";
  const grid = document.createElement("div"); grid.className = "experience-grid";
  for (const entry of EXPERIENCES) {
    const card = document.createElement("section"); card.className = "experience-card";
    const title = document.createElement("h2"); title.textContent = entry.title;
    const desc = document.createElement("p"); desc.textContent = entry.description;
    const status = document.createElement("p"); status.className = "small"; status.textContent = entry.status;
    const links = document.createElement("div"); links.className = "experience-links";
    for (const action of entry.actions) {
      const a = document.createElement("a"); a.href = action.href; a.textContent = action.label; links.append(a);
    }
    card.append(title,desc,status,links); grid.append(card);
  }
  shell.append(heading,intro,grid);
  const api = document.createElement("p"); const apiLink = document.createElement("a"); apiLink.href="./experiences.json"; apiLink.textContent="Machine-readable experience catalog"; api.append(apiLink);shell.append(api);
  root.append(shell);
}
void main().catch(error => {
  const root = document.getElementById("app");
  if(root)root.textContent = "EvoForge could not start: "+String(error);
});
