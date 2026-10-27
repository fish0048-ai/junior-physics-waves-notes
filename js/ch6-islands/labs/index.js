import { mountAtomLab } from "./atom-lab.js";
import { mountClassifyLab } from "./classify-lab.js";
import { mountDecomposeLab } from "./decompose-lab.js";
import { mountElementsLab } from "./elements-lab.js";
import { mountMoleculeLab } from "./molecule-lab.js";
import { mountPeriodicLab } from "./periodic-lab.js";

const MOUNTERS = {
  elements: mountElementsLab,
  periodic: mountPeriodicLab,
  atom: mountAtomLab,
  decompose: mountDecomposeLab,
  molecule: mountMoleculeLab,
  classify: mountClassifyLab,
};

export function openIslandLab(root, islandId, handlers) {
  const mount = MOUNTERS[islandId];
  if (!mount) return null;
  return mount(root, handlers);
}
