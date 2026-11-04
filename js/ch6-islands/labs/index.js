import { islandById } from "../config.js?v=9";
import { isCompleted } from "../progress.js?v=9";
import { pickForSection } from "../quiz-bank.js?v=9";
import { mountAlkaliLab } from "./alkali-lab.js?v=9";
import { mountAtomLab } from "./atom-lab.js?v=9";
import { mountClassifyLab } from "./classify-lab.js?v=9";
import { mountDecomposeLab } from "./decompose-lab.js?v=9";
import { mountElementsLab } from "./elements-lab.js?v=9";
import { mountExp61Lab } from "./exp61-lab.js?v=9";
import { mountMoleculeLab } from "./molecule-lab.js?v=9";
import { mountPeriodicLab } from "./periodic-lab.js?v=9";
import { mountQuiz } from "./quiz-lab.js?v=9";

const MOUNTERS = {
  elements: mountElementsLab,
  periodic: mountPeriodicLab,
  atom: mountAtomLab,
  decompose: mountDecomposeLab,
  molecule: mountMoleculeLab,
  classify: mountClassifyLab,
  exp61: mountExp61Lab,
  alkali: mountAlkaliLab,
};

function followUp(root, island, stage, handlers) {
  const content = root.querySelector("#islands-lab-content");
  if (!content || content.querySelector(".lab-next-btn")) return;
  const nextStage = island.stages.find((s) => s.id !== stage.id && !isCompleted(s.taskId));
  const nextIsland = islandById(island.nextIsland);
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "isl-btn is-primary lab-next-btn";
  if (nextStage) {
    btn.textContent = `下一關：${nextStage.title}`;
    btn.addEventListener("click", () => handlers.onStage?.(nextStage.id));
  } else if (nextIsland) {
    btn.textContent = `前往下一座：${nextIsland.title}`;
    btn.addEventListener("click", () => handlers.onNext?.(nextIsland.id));
  } else {
    return;
  }
  content.appendChild(btn);
}

export function openStage(root, island, stage, handlers) {
  const wrapped = {
    ...handlers,
    onComplete: () => {
      handlers.onComplete?.();
      followUp(root, island, stage, handlers);
    },
  };
  if (stage.kind === "quiz") {
    return mountQuiz(
      root,
      {
        title: `${island.title} · 挑戰題`,
        lead: `題目來自 ${stage.section} 隨堂練習題庫，每次抽 5 題；答對 4 題點亮星星，答錯的題目會收進錯題本。`,
        load: () => pickForSection(stage.section, stage.topic, 5),
        passAt: 4,
        taskId: stage.taskId,
        links: [
          { href: `../exams/${stage.section}.html`, label: `${stage.section} 段考前練習` },
          { href: island.sectionHref, label: `回講義 ${island.sectionId}` },
        ],
      },
      wrapped
    );
  }
  const mount = MOUNTERS[stage.lab];
  return mount ? mount(root, wrapped) : null;
}
