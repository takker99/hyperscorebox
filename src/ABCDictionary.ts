//楽譜IMEの辞書管理
//constructorでasync/awaitできないので、initABCDictを最初に呼ぶこと
import { PageList } from "https://raw.githubusercontent.com/scrapbox-jp/types/0.0.5/mod.ts";
import { parse } from "https://esm.sh/@progfay/scrapbox-parser@7.1.0";

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

export class ABCDictionary {
  private readonly MSG = "ABCDictionary";
  private abcDict: { title: string; abc: string }[] = [];

  /** ABC記法の辞書をネットワークから取得して初期化する */
  public initABCDict = async () => {
    const pagesRes = await fetch(
      `https://scrapbox.io/api/pages/abcdict?limit=1000`,
    );
    const { pages }: PageList = await pagesRes.json();
    const abcDict = [];
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
    this.abcDict = abcDict;
  };

  private getRegExp = (arr: string[]): RegExp =>
    new RegExp(`(${arr.join("|")})`);

  private convertAccidentals = (input: string) => {
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

  private convertDoremiToABC = (input: string) => {
    let result = input;
    for (
      const key of Object.keys(doremiToABC) as (keyof typeof doremiToABC)[]
    ) {
      const regexp = new RegExp(key, "g");
      result = result.replace(regexp, doremiToABC[key]);
    }
    return result;
  };

  private convertToABC = (input: string): string | null => {
    let convertedStr = "";
    if (this.getRegExp(Object.keys(doremiToABC)).test(input)) {
      //ドレミ
      console.log(this.MSG, "convert", "doremi", input);
      convertedStr = this.convertDoremiToABC(input);
    }
    const nextStr = convertedStr ? convertedStr : input;
    if (this.getRegExp(Object.keys(accidentalToABC)).test(nextStr)) {
      //臨時記号
      console.log(this.MSG, "convert", "acc", nextStr);
      convertedStr = this.convertAccidentals(nextStr);
    }
    if (convertedStr) return convertedStr;
    return null;
  };
  public getSearchResult = (input: string): string[] => {
    console.log(this.MSG, "searchDict", input);
    if (input === "") return [];
    const candidates = [];
    let searchStr = input;

    const converted = this.convertToABC(searchStr);
    if (converted) {
      searchStr = converted;
      candidates.push(converted);
    }
    for (const entry of this.abcDict) {
      if (new RegExp(".*" + searchStr + ".*").test(entry.title)) {
        candidates.push(entry.abc);
      }
    }
    return candidates;
  };
}

export const imeDict = new ABCDictionary();
