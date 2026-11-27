export const EXPERIENCES = [
  {
    "id": "mosaic",
    "title": "Mosaic Atelier",
    "description": "Evolve mosaics through artistic motifs, construction techniques, materials, heraldic composition and favorite ancestry.",
    "status": "CPU replay candidates · legacy recipes retained · R1 not yet release-qualified",
    "actions": [
      {
        "label": "Craft Lab 3.0",
        "href": "./?experience=mosaic-craft"
      },
      {
        "label": "Motif & Heraldry Lab",
        "href": "./?experience=mosaic-motifs"
      },
      {
        "label": "Emblems & flags",
        "href": "./?experience=mosaic-emblems"
      },
      {
        "label": "Mosaic Atelier 2.0",
        "href": "./?experience=mosaic"
      },
      {
        "label": "Legacy Mosaic 1.0.0",
        "href": "./?experience=mosaic-legacy"
      }
    ]
  },
  {
    "id": "alife",
    "title": "ALife Creature Arena",
    "description": "Watch and influence evolving artificial creatures across seven configurable environments.",
    "status": "Experimental · WebGPU required · not bit-exact replay",
    "actions": [
      {
        "label": "Observe",
        "href": "./experiences/alife/index.html?mode=observe"
      },
      {
        "label": "Play",
        "href": "./experiences/alife/index.html?mode=play"
      }
    ]
  }
] as const;

export type ExperienceRoute = "launcher"|"mosaic"|"mosaic-legacy"|"mosaic-craft"|"mosaic-motifs"|"mosaic-emblems"|"golden";
export function resolveExperience(search:string,hash:string):ExperienceRoute {
 if(hash==="#golden")return "golden";
 const id=new URLSearchParams(search).get("experience");
 switch(id){case "mosaic":case "mosaic-legacy":case "mosaic-craft":case "mosaic-motifs":case "mosaic-emblems":return id;default:return "launcher";}
}
