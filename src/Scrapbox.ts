import { ABCBlock, ExternalABC, ImportABCInfo, ScrapboxLine } from "./Types.ts";

//Scrapboxのページ情報取得関数

const SCRAPBOX_PROJECT_NAME = location.pathname.split("/")[1];
export const SCRAPBOX_URL = `https://scrapbox.io/${SCRAPBOX_PROJECT_NAME}/`;

/** 任意のページの行情報を取得する */
const getPageLines = async (
  page: string,
  project?: string,
): Promise<ScrapboxLine[]> => {
  const res = await fetch(`https://scrapbox.io/api/pages/${project}/${page}`);
  const { lines } = await res.json();
  return lines;
};

/** 任意のコードブロックを取得する */
const getCodeBlock = async (
  pageTitle: string,
  codeTitle: string,
): Promise<string> => {
  const res = await fetch(
    `https://scrapbox.io/api/code/${SCRAPBOX_PROJECT_NAME}/${pageTitle}/${codeTitle}`,
  ).then((res) => {
    if (!res.ok) {
      throw new Error(
        `getCodeBlock(): Failed to HTTP request ${res.status} ${res.statusText}`,
      );
    }
    return res;
  });
  return await res.text();
};

/** ページ中の最初のコードブロックのファイル名を取得する */
const getFirstCodeBlockTitle = async (
  page: string,
  project?: string,
): Promise<string> => {
  const _project = project ? project : SCRAPBOX_PROJECT_NAME;
  for (const line of await getPageLines(page, _project)) {
    if (/code:.*\.abc/.test(line.text)) {
      return line.text.replace(/^(\t|\s)+/, "").slice(5);
    }
  }
  return "";
};

/** ABC記法のImport文を解析する */
const parseImport = (line: string): ImportABCInfo | null => {
  if (/%import:.+/.test(line)) {
    const importStr = line.replace(/.*%import:/, "");
    let project = SCRAPBOX_PROJECT_NAME;
    let page = importStr;
    if (importStr.match(/.+\//)) {
      project = importStr.split("/")[0];
      page = importStr.split("/")[1];
    }
    return { project: project, page: page };
  }
  return null;
};

/** ABCコードのcache */
const externalABCCache: ExternalABC[] = [];
/** cacheを読み込む なかったら`null`を返す*/
const loadExtABCCache = (importABCInfo: ImportABCInfo): string | null => {
  for (let externalABC of externalABCCache) {
    const source = `${importABCInfo.project}/${importABCInfo.page}`;
    if (externalABC.source === source) {
      return externalABC.abc;
    }
  }
  return null;
};

/** cacheを登録する */
const registerExtABCCache = (
  importABCInfo: ImportABCInfo,
  abc: string,
): void => {
  externalABCCache.push({
    source: `${importABCInfo.project}/${importABCInfo.page}`,
    abc: abc,
  });
};

//インポートのための一連の処理
const parseAndImportABC = async (text: string): Promise<string> => {
  const parsedImport = parseImport(text);
  if (parsedImport) {
    console.log("Import external abc", parsedImport);
    const loadedABCCache = loadExtABCCache(parsedImport);
    if (loadedABCCache) return await parseAndImportABC(loadedABCCache);
    const { project, page } = parsedImport;
    const imported = await getCodeBlock(
      page,
      await getFirstCodeBlockTitle(page, project),
    );
    const importedABC = await parseAndImportABC(imported);
    registerExtABCCache(parsedImport, importedABC);
    return importedABC;
  }
  return text.replace(/\n+$/, "");
};

/** 現在のページにある全てのABCコードブロックを取得する */
export const getABCBlocks = async (): Promise<ABCBlock[]> => {
  const blocks: ABCBlock[] = [];
  let tempBlock: ABCBlock | null = null; //連続したcode-block毎に組み立てる
  let hasCodeBlock = false; //1個前のlineがcode-blockならtrue

  //Scrapboxの行
  const lines = document.querySelector(".lines").children;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    //行の子要素
    const span = line.querySelector("span:not(.date-label)");
    const codeBlockEl = span.classList.contains("code-block") ? span : null;

    if (codeBlockEl) { //コードブロックか？
      if (tempBlock && !hasCodeBlock) { //コードブロックが途切れたらblocksにpush
        blocks.push(tempBlock);
        tempBlock = null;
      }

      const abc = `\n${await parseAndImportABC(
        codeBlockEl.textContent.replace(/^\t+/, ""),
      )}`;
      const blockHeight = codeBlockEl.clientHeight;
      const left = codeBlockEl.querySelector(".indent-mark").clientWidth;
      const width = codeBlockEl.querySelector(".indent").clientWidth;

      if (tempBlock) { //tempBlockが存在したら追加系の操作のみ行う
        tempBlock.abc += abc;
        tempBlock.blockHeight += blockHeight;
      } else { //なければすべてのプロパティを一度に追加する
        if (!hasCodeBlock && /\n(.*\.|)abc$/.test(abc)) {
          tempBlock = {
            titleElement: line as HTMLElement,
            titleElementID: line.id,
            abc: "", //コードブロック1行目は無視していい
            blockHeight: blockHeight,
            offsetLeft: left,
            width: width,
            isEditing: false,
          };
        }
      }

      if (
        line.classList.contains("cursor-line") ||
        line.classList.contains("abcediting")
      ) {
        tempBlock.isEditing = true;
      }
      hasCodeBlock = true;
    } else {
      hasCodeBlock = false;
    }

    if (i === lines.length - 1 && tempBlock) {
      blocks.push(tempBlock);
    }
  }

  return blocks;
};

/** なにかのinline styleを作る */
export const generateInlineStyle = (
  isEditing: boolean,
  blockHeight: number,
  offsetLeft: number,
  width: number,
): string => {
  const top = isEditing ? -(28 + blockHeight) : 0;
  const shadow = isEditing ? "box-shadow: 0 0 8px gray;" : "";
  return `position: absolute; width: ${
    width +
    0.5
  }px; background: white; z-index: 100; top: ${top}px; left: ${
    offsetLeft -
    0.5
  }px; height: ${blockHeight}px; ${shadow}`;
};

// .text-inputの変更検知
export const registerTextInputMutationObserver = (
  _function: (textInput?: HTMLInputElement) => void,
) => {
  const textInput = document.getElementById("text-input") as HTMLInputElement;
  const textInputObserver = new MutationObserver((mutations) => {
    mutations.forEach(() => {
      _function(textInput);
    });
  });
  textInputObserver.observe(textInput, { attributes: true });
};

// .shared-cursorの変更検知
export const registerSharedCursorMutationObserver = (_function: () => void) => {
  const sharedCursors = document.querySelector(
    ".shared-cursors",
  ) as HTMLElement;
  const cursorObserver = new MutationObserver(() => {
    console.log("cursor appeared");
    //TODO 1つのカーソルに複数のobserverが登録されないようにする
    const sharedCursor = sharedCursors.querySelector(".cursor") as HTMLElement;
    const observer = new MutationObserver(() => {
      _function();
    });
    observer.observe(sharedCursor, { attributes: true });
  });
  cursorObserver.observe(sharedCursors, { childList: true });
};

// DOM取得 別ファイルに切り出すべき
export const getEditorElement = (): HTMLDivElement => {
  return document.getElementById("editor") as HTMLDivElement;
};

export const getCaretElement = (): HTMLSpanElement => {
  return getEditorElement().querySelector(".cursor") as HTMLSpanElement;
};

export const getTextInputElement = (): HTMLInputElement => {
  return document.getElementById("text-input") as HTMLInputElement;
};
