import { islandById } from "../config.js?v=7";
import { mountAtomLab } from "./atom-lab.js?v=7";
import { mountClassifyLab } from "./classify-lab.js?v=7";
import { mountDecomposeLab } from "./decompose-lab.js?v=7";
import { mountElementsLab } from "./elements-lab.js?v=7";
import { mountMoleculeLab } from "./molecule-lab.js?v=7";
import { mountPeriodicLab } from "./periodic-lab.js?v=7";

const MOUNTERS = {
  elements: mountElementsLab,
  periodic: mountPeriodicLab,
  atom: mountAtomLab,
  decompose: mountDecomposeLab,
  molecule: mountMoleculeLab,
  classify: mountClassifyLab,
};

function offerNext(root, islandId, handlers) {
  const content = root.querySelector("#islands-lab-content");
  const island = islandById(islandId);
  const next = islandById(island?.nextIsland);
  if (!content || !next || content.querySelector("[data-next-island]")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.dataset.nextIsland = next.id;
  btn.className = "is-primary lab-check-btn";
  btn.textContent = `下一座：${next.title}`;
  btn.addEventListener("click", () => handlers.onNext?.(next.id));
  content.appendChild(btn);
}

export function openIslandLab(root, islandId, handlers) {
  const mount = MOUNTERS[islandId];
  if (!mount) return null;
  return mount(root, {
    ...handlers,
    onComplete: () => {
      handlers.onComplete?.();
      offerNext(root, islandId, handlers);
    },
  });
}
