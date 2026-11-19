// 화면 문구는 src/i18n/ko.json, id.json에만 둔다 (CLAUDE.md 5절).
// 화면은 useT() (src/components/demo/DemoProvider.tsx)로 문구를 꺼낸다.

import id from "./id.json";
import ko from "./ko.json";
import type { Lang } from "./lang";

type Tree = { [key: string]: string | Tree };

const DICTIONARIES: Record<Lang, Tree> = { ko: ko as Tree, id: id as Tree };

export type TranslateVars = Record<string, string | number>;

function lookup(tree: Tree, key: string): string | undefined {
  let node: string | Tree | undefined = tree;
  for (const part of key.split(".")) {
    if (typeof node !== "object" || node === null) return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * "login.title" 같은 점 경로로 문구를 꺼낸다. {name}은 vars로 바꾼다.
 * 인니어에 없으면 한국어, 둘 다 없으면 키를 그대로 돌려준다 (깨진 화면 대신 눈에 띄게).
 */
export function translate(lang: Lang, key: string, vars?: TranslateVars): string {
  const text = lookup(DICTIONARIES[lang], key) ?? lookup(DICTIONARIES.ko, key) ?? key;
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}

export function hasKey(lang: Lang, key: string): boolean {
  return lookup(DICTIONARIES[lang], key) !== undefined;
}
