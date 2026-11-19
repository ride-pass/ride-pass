// src/data/fixtures/*.json 파일 묶음의 모양. scripts/seed.ts가 만들고 mockRepository가 읽는다.

import type {
  Application,
  Deposit,
  Partner,
  RentalPayment,
  Rider,
  SettlementCapture,
  ShareGrant,
} from "./types";

export interface FixtureSet {
  riders: Rider[];
  partners: Partner[];
  captures: SettlementCapture[];
  deposits: Deposit[];
  rentalPayments: RentalPayment[];
  applications: Application[];
  shareGrants: ShareGrant[];
  /** 재촬영하면 이 기록으로 바뀐다. id는 원래 촬영과 같다 (r-rizky 장면) */
  retakes: SettlementCapture[];
}

export const FIXTURE_FILES = [
  "riders",
  "partners",
  "captures",
  "deposits",
  "rentalPayments",
  "applications",
  "shareGrants",
  "retakes",
] as const satisfies readonly (keyof FixtureSet)[];
