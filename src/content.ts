/// <reference no-default-lib="true"/>
/// <reference lib="esnext"/>
/// <reference lib="dom"/>
import { ScoresInPage } from "./ScoresInPage.ts";
import {
  getABCBlocks,
  registerSharedCursorMutationObserver,
  registerTextInputMutationObserver,
} from "./Scrapbox.ts";
import { ABCBlock } from "./Types.ts";
import { initIME } from "./IME.ts";
//@deno-types=./deps/webaudio-tinysynth.d.ts
import { WebAudioTinySynth } from "./deps/webaudio-tinysynth.js";
import { scrapbox } from "./deps/types.ts";

//初期化

const MSG = "hyperscorebox";
const tinySynth = new WebAudioTinySynth({ voices: 64 });
const page = new ScoresInPage();
const update = (timeout = 0, isPageTransition = false) =>
  setTimeout(async () => {
    const ABCBlocks: ABCBlock[] = await getABCBlocks();
    console.log(MSG, "update", "ABCBlocks", ABCBlocks);
    page.update(ABCBlocks, isPageTransition);
  }, timeout);
const isScoreClicked = (e: MouseEvent): boolean => {
  for (const el of e["path"]) {
    if (el.className === "scoreview") {
      return true;
    }
  }
  return false;
};
const quitEditing = (): void => {
  const editingABCs = document.getElementsByClassName("abcediting");
  Array.prototype.forEach.call(editingABCs, (abcEl: HTMLElement) => {
    abcEl.classList.remove("abcediting");
  });
};
const handleClickEvent = (e: MouseEvent): void => {
  update();
  if (isScoreClicked(e)) return;
  quitEditing();
};
const init = async (): Promise<void> => {
  console.log(MSG, "hello from hyperscorebox");
  window.addEventListener("click", handleClickEvent);
  registerTextInputMutationObserver(() => update());
  registerSharedCursorMutationObserver(update);

  scrapbox.addListener("page:changed", () => update(0, true));
  update();
  await initIME(tinySynth);
};

await init();
