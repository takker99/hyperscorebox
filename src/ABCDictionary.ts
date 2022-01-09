//楽譜IMEの辞書管理
//constructorでasync/awaitできないので、initABCDictを最初に呼ぶこと
import { PageList } from "./deps/types.ts";
import { parse } from "./deps/scrapbox-parser.ts";

const doremiToABC = {
  "ド": "c",
  "レ": "d",
  "ミ": "e",
  "ファ": "f",
  "ソ": "g",
  "ラ": "a",
  "シ": "b",
} as const;
const accidentalToABC = {
  "♯": "^",
  "＃": "^",
  "#": "^",
  "♭": "_",
  "♮": "=",
} as const;
const MSG = "ABCDictionary" as const;
const abcDict: { title: string; abc: string }[] = [];

/** ABC記法の辞書をネットワークから取得して初期化する */
export const initABCDict = async () => {
  const pagesRes = await fetch(
    `https://scrapbox.io/api/pages/abcdict?limit=1000`,
  );
  const { pages }: PageList = await pagesRes.json();
  for (const page of pages) {
    const { title } = page;
    const pageRes = await fetch(
      `https://scrapbox.io/api/pages/abcdict/${title}/text`,
    );
    const text = await pageRes.text();
    const blocks = parse(text, { hasTitle: true });
    const codeBlock = blocks.find((block) => block.type === "codeBlock");
    if (codeBlock?.type !== "codeBlock") continue;
    if (!codeBlock.fileName.endsWith(".abc")) continue;
    abcDict.push({ title: title, abc: codeBlock.content.trim() });
  }
};
export const getSearchResult = (input: string): string[] => {
  console.log(MSG, "searchDict", input);
  if (input === "") return [];
  const candidates = [];
  let searchStr = input;

  const converted = convertToABC(searchStr);
  if (converted) {
    searchStr = converted;
    candidates.push(converted);
  }
  for (const entry of abcDict) {
    if (new RegExp(".*" + searchStr + ".*").test(entry.title)) {
      candidates.push(entry.abc);
    }
  }
  return candidates;
};

const convertDoremiToABC = (input: string) => {
  let result = input;
  for (
    const key of Object.keys(doremiToABC) as (keyof typeof doremiToABC)[]
  ) {
    const regexp = new RegExp(key, "g");
    result = result.replace(regexp, doremiToABC[key]);
  }
  return result;
};

const getRegExp = (arr: string[]): RegExp => new RegExp(`(${arr.join("|")})`);

const convertAccidentals = (input: string) => {
  let result = input;
  for (
    const accidental of Object.keys(
      accidentalToABC,
    ) as (keyof typeof accidentalToABC)[]
  ) {
    const accRegExp = new RegExp(`[a-g]${accidental}`, "g");
    const matched = result.match(accRegExp);
    if (!matched) continue;
    for (const match of matched) {
      result = result.replace(
        match,
        accidentalToABC[accidental] + match.replace(accidental, ""),
      );
    }
  }
  return result;
};
const convertToABC = (input: string): string | null => {
  let convertedStr = "";
  if (getRegExp(Object.keys(doremiToABC)).test(input)) {
    //ドレミ
    console.log(MSG, "convert", "doremi", input);
    convertedStr = convertDoremiToABC(input);
  }
  const nextStr = convertedStr ? convertedStr : input;
  if (getRegExp(Object.keys(accidentalToABC)).test(nextStr)) {
    //臨時記号
    console.log(MSG, "convert", "acc", nextStr);
    convertedStr = convertAccidentals(nextStr);
  }
  if (convertedStr) return convertedStr;
  return null;
};
