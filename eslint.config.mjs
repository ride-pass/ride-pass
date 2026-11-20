import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// CLAUDE.md 4-1: 화면은 fixture JSON·mockRepository를 직접 읽지 않고 repository.ts만 부른다.
const screenDataRule = {
  group: [
    "@/data/fixtures/*",
    "**/data/fixtures/*",
    "@/data/mockRepository",
    "**/data/mockRepository",
  ],
  message: "화면은 src/data/repository.ts의 함수만 부른다 (CLAUDE.md 4-1).",
};

// CLAUDE.md 2-4, 4-5: 기사 화면은 신용 엔진·렌털사용 출력을 import하지 않는다. 이 규칙을 끄지 않는다.
const riderCreditRule = {
  group: [
    "@/credit/engine",
    "**/credit/engine",
    "@/credit/partnerView",
    "**/credit/partnerView",
    "@/credit/sharedCredit",
    "**/credit/sharedCredit",
  ],
  message:
    "기사 화면은 src/credit/riderView.ts의 getRiderCreditView()·getRiderSubmissionView()만 쓴다 (CLAUDE.md 2-4).",
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    files: ["src/app/**", "src/components/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [screenDataRule] }],
    },
  },
  {
    // 나중 블록이 같은 규칙을 덮어쓰므로 두 패턴을 함께 둔다.
    files: ["src/app/(rider)/**"],
    rules: {
      "no-restricted-imports": [
        "error",
        { patterns: [screenDataRule, riderCreditRule] },
      ],
    },
  },
  {
    // CLAUDE.md 4-1: 기준일은 DEMO_TODAY 하나로 고정한다. 현재 시각을 읽지 않는다.
    files: ["src/**", "scripts/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "NewExpression[callee.name='Date'][arguments.length=0]",
          message: "현재 시각 대신 src/config/demo.ts의 DEMO_TODAY를 쓴다 (CLAUDE.md 4-1).",
        },
        {
          selector:
            "CallExpression[callee.object.name='Date'][callee.property.name='now']",
          message: "현재 시각 대신 src/config/demo.ts의 DEMO_TODAY를 쓴다 (CLAUDE.md 4-1).",
        },
      ],
    },
  },
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
