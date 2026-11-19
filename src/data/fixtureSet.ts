// src/data/fixtures/*.json 파일 묶음의 모양. scripts/seed.ts가 만들고 mockRepository가 읽는다.

import type { RiderRecords } from "./derive";
import type {
  Application,
  Deposit,
  Partner,
  RentalPayment,
  Rider,
  SettlementCapture,
  ShareGrant,
  SlikReport,
  TelecomBill,
} from "./types";

export interface FixtureSet {
  riders: Rider[];
  partners: Partner[];
  captures: SettlementCapture[];
  deposits: Deposit[];
  rentalPayments: RentalPayment[];
  slikReports: SlikReport[];
  telecomBills: TelecomBill[];
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
  "slikReports",
  "telecomBills",
  "applications",
  "shareGrants",
  "retakes",
] as const satisfies readonly (keyof FixtureSet)[];

/** fixture 묶음에서 기사 한 명의 원본 기록만 골라낸다 */
export function riderRecordsFrom(fx: FixtureSet, rider: Rider): RiderRecords {
  const mine = <T extends { riderId: string }>(items: T[]) =>
    items.filter((item) => item.riderId === rider.id);
  return {
    rider,
    captures: mine(fx.captures),
    deposits: mine(fx.deposits),
    rentalPayments: mine(fx.rentalPayments),
    slikReports: mine(fx.slikReports),
    telecomBills: mine(fx.telecomBills),
  };
}
