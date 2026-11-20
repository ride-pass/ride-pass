"use client";

// 추천 상품 보내기 (/recommend/send?product=…). 「추천」에서 상품 하나를 고르면 그 상품의 기관 한 곳에만 보낸다.
// 상품 확인 → 함께 보내는 내용 → 동의 한 줄 → 「동의하고 보내기」 → 공유 완료(/share/done).
// 무엇을(자료 목록)·누구에게(기관)·얼마 동안(30일)을 한 화면에 둔다 (CLAUDE.md 3절 3단계와 같은 원칙).
// 보내는 자료: 렌털 신청 때 동의한 항목이 있으면 그대로, 없으면 동의 화면 기본값(올린 자료 전부).
// 금리는 예시 금리만, 대출을 이 앱에서 실행하지 않는다 (2-1). 이미 보낸 곳이면 다시 보내지 않고 상태만 보여 준다.

import { CircleCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useDemo, useT } from "@/components/demo/DemoProvider";
import { CATEGORY_ICON, PriceText, useProductText } from "@/components/recommend/ProductParts";
import { SendCard } from "@/components/share/SendCard";
import { AppHeader } from "@/components/ui/AppHeader";
import { BottomBar } from "@/components/ui/BottomBar";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { IconTile } from "@/components/ui/IconTile";
import { ScreenSkeleton } from "@/components/ui/Skeleton";
import { DEMO_TODAY } from "@/config/demo";
import {
  getRiderProductView,
  getRiderSubmissionView,
  type ProductOffer,
  type RiderProductView,
  type RiderSubmissionView,
} from "@/credit/riderView";
import { createShareGrant, getPartner, getRider, listApplications, listShareGrants, submitApplication } from "@/data/repository";
import type { Application, Partner, Product } from "@/data/types";
import { addDays } from "@/lib/date";
import { defaultShareItems, isActiveGrant, type ShareItem } from "@/lib/shareItems";
import { formatDate } from "@/lib/format";

const SHARE_DAYS = 30; // mockRepository.createShareGrant와 같은 기간

const subscribeNever = () => () => {};
const readProductParam = () => new URLSearchParams(window.location.search).get("product");

interface Target {
  product: Product;
  offer: ProductOffer | null;
  partner: Partner;
  items: ShareItem[];
  /** 이 기관에 이미 넣은 신청 (대기 중·승인) */
  sent: Application | null;
  hasGrant: boolean;
}

export default function RecommendSendPage() {
  const t = useT();
  const router = useRouter();
  const { riderId, partnerId: entryPartnerId, stage, lang, dataVersion } = useDemo();
  const productId = useSyncExternalStore(subscribeNever, readProductParam, () => null);
  const [view, setView] = useState<RiderProductView | null>(null);
  const [target, setTarget] = useState<Target | null | "missing">(null);
  const [submission, setSubmission] = useState<RiderSubmissionView | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!productId) return;
    (async () => {
      const v = await getRiderProductView(riderId, stage);
      setView(v);
      if (!v || v.stage !== "C" || v.status !== "scored") return;
      const offer = v.available.find((o) => o.product.id === productId) ?? null;
      const product = offer?.product ?? v.locked.find((l) => l.product.id === productId)?.product;
      const partner = product ? await getPartner(product.partnerId) : null;
      if (!product || !partner) {
        setTarget("missing");
        return;
      }
      const [rider, grants, apps] = await Promise.all([getRider(riderId), listShareGrants(riderId), listApplications(partner.id)]);
      const entryGrant = grants.find((g) => g.partnerId === entryPartnerId && isActiveGrant(g));
      const items = defaultShareItems(rider, entryGrant);
      const sent = apps.find((a) => a.riderId === riderId && a.status !== "rejected") ?? null;
      const hasGrant = grants.some((g) => g.partnerId === partner.id && isActiveGrant(g));
      setTarget({ product, offer, partner, items, sent, hasGrant });
      setSubmission(await getRiderSubmissionView(riderId, items, stage));
    })();
    // dataVersion: 조작판에서 승인·초기화하면 다시 읽는다
  }, [productId, riderId, entryPartnerId, stage, dataVersion]);

  if (!productId || target === "missing") {
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t("recommend.sendPage.title")} back="/recommend" />
        <main className="px-4 pt-2">
          <Card className="text-sm text-muted">{t("recommend.sendPage.notFound")}</Card>
        </main>
      </div>
    );
  }
  if (view && (view.stage !== "C" || view.status !== "scored")) {
    // 평가 보류면 추천하지 않으므로 보내기도 하지 않는다
    return (
      <div className="flex flex-1 flex-col">
        <AppHeader title={t("recommend.sendPage.title")} back="/recommend" />
        <main className="flex flex-col gap-3 px-4 pt-2">
          <Card className="text-sm text-muted">{t("recommend.hold")}</Card>
          <ButtonLink href="/recommend" variant="secondary">
            {t("recommend.title")}
          </ButtonLink>
        </main>
      </div>
    );
  }
  if (!target) return <ScreenSkeleton />;

  const partnerName = lang === "ko" ? target.partner.nameKo : target.partner.nameId;
  const until = formatDate(addDays(DEMO_TODAY, SHARE_DAYS), lang);
  const locked = !target.offer;

  const send = async () => {
    setBusy(true);
    if (!target.hasGrant) await createShareGrant({ riderId, partnerId: target.partner.id, items: target.items });
    await submitApplication(riderId, target.partner.id);
    router.push(`/share/done?to=${target.partner.id}`);
  };

  return (
    <div className="flex flex-1 flex-col">
      <AppHeader title={t("recommend.sendPage.title")} back="/recommend" />
      <main className="flex flex-col gap-4 px-4 pt-2 pb-6">
        <ProductCard product={target.product} offer={target.offer} partner={partnerName} />

        {locked && view?.stage === "C" && view.status === "scored" ? (
          <Card className="text-sm text-muted">
            {t("recommend.lockedGrade", { g: view.locked.find((l) => l.product.id === target.product.id)?.minGrade ?? "" })}
          </Card>
        ) : null}

        {!locked && target.sent ? (
          <Card className="flex flex-col gap-3">
            <p className="flex items-center gap-2 font-semibold">
              <CircleCheck className="size-5 text-brand-purple" aria-hidden />
              {t("recommend.sendPage.already")}
            </p>
            <p className="text-sm text-muted">
              {target.sent.status === "approved"
                ? t("recommend.sendPage.approvedBody", { partner: partnerName })
                : t("recommend.sendPage.pendingBody", { partner: partnerName })}
            </p>
            <ButtonLink href="/history" variant="secondary">
              {t("recommend.sendPage.toHistory")}
            </ButtonLink>
          </Card>
        ) : null}

        {!locked && !target.sent ? (
          <>
            <SendCard items={target.items} submission={submission} />
            <p className="px-1 text-xs leading-relaxed text-muted">{t("recommend.sendPage.onlyHere", { partner: partnerName })}</p>
            <label className="flex items-start gap-3 rounded-2xl bg-lavender p-4">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 size-5 accent-brand-purple"
              />
              <span className="text-sm">{t("recommend.sendPage.consent", { partner: partnerName, until })}</span>
            </label>
          </>
        ) : null}

        <p className="px-1 text-xs leading-relaxed text-muted">{t("recommend.disclaimer")}</p>
      </main>
      {!locked && !target.sent ? (
        <BottomBar>
          <Button disabled={!confirmed || busy} onClick={send}>
            {t("recommend.sendPage.submit")}
          </Button>
        </BottomBar>
      ) : null}
    </div>
  );
}

function ProductCard({ product, offer, partner }: { product: Product; offer: ProductOffer | null; partner: string }) {
  const t = useT();
  const { name, desc } = useProductText(product);
  const Icon = CATEGORY_ICON[product.category];
  const term = product.termMonths;
  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <IconTile>
          <Icon className="size-5" aria-hidden />
        </IconTile>
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-muted">
            {partner} · {t(`recommend.categories.${product.category}`)}
          </span>
          <span className="block text-lg font-bold">{name}</span>
          <span className="block text-sm text-muted">{desc}</span>
          {term ? <span className="mt-1 block text-xs text-muted">{t("recommend.term", { min: term[0], max: term[1] })}</span> : null}
        </span>
        {offer ? <PriceText offer={offer} big /> : null}
      </div>
    </Card>
  );
}
