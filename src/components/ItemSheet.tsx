import { useEffect, useState } from "react";
import type { Item, PriceEntry } from "../lib/types";
import { seasonBadge, inSeason, isAllYear } from "../lib/season";
import {
  JIN, fairKg, toKgPrice, judgeVerdict, rd, rd1, type Unit, type Verdict,
} from "../lib/pricing";
import PriceStamp from "./PriceStamp";
import LiveQuery from "./LiveQuery";

interface Props {
  item: Item | null;
  live: PriceEntry | null;
  liveDays: number;
  month: number;
  onClose: () => void;
}

/** 單位名去掉括號註記：「串(約6-8根)」→「串」 */
const pcLabel = (it: Item) => it.pc![0].replace(/\(.+\)/, "");

const MONTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

export default function ItemSheet({ item, live, liveDays, month, onClose }: Props) {
  const [price, setPrice] = useState("");
  const [unit, setUnit] = useState<Unit>("jin");

  // 換品項時重置輸入；沒有 pc 的品項不能停在 pc 單位
  useEffect(() => {
    setPrice("");
    if (item && !item.pc) setUnit((u) => (u === "pc" ? "jin" : u));
  }, [item]);

  if (!item) return <div className="overlay" />;

  const badge = seasonBadge(item, month);
  const [lo, hi] = fairKg(item, live, month);

  let refSub = `約 ${rd(lo)}～${rd(hi)} 元/公斤`;
  if (item.pc) refSub += `・一${pcLabel(item)}約 ${rd1(lo * item.pc[1])}～${rd1(hi * item.pc[1])} 元`;

  let srcText: string;
  let srcLive = false;
  if (live) {
    srcText = `基準：近${liveDays}天批發均價 ${live.kg.toFixed(1)} 元/公斤（${live.n} 筆，自動更新）`;
    srcLive = true;
  } else if (item.retail) {
    srcText = "基準：市場零售概略值（此類無對應拍賣資料）";
  } else {
    srcText = "基準：內建概略值（部署後會自動換成官方行情）";
  }

  const v = parseFloat(price);
  let verdict: Verdict | null = null;
  let big = "";
  let why = "";
  if (v > 0) {
    const priceKg = toKgPrice(v, unit, item.pc?.[1]);
    verdict = judgeVerdict(priceKg, lo, hi);
    const rngTxt =
      unit === "pc" && item.pc
        ? `合理約一${pcLabel(item)} ${rd1(lo * item.pc[1])}～${rd1(hi * item.pc[1])} 元`
        : `合理約 ${rd(lo * JIN)}～${rd(hi * JIN)} 元/台斤`;
    if (verdict === "cheap") {
      big = "俗！買起來";
      why = `低於${rngTxt}，可以下手`;
    } else if (verdict === "fair") {
      big = "價格合理";
      why = `${rngTxt}，正常行情`;
    } else {
      big = "偏貴，再比比";
      why = `高於${rngTxt}${inSeason(item, month) || isAllYear(item) ? "" : "（現在非產季，貴很正常）"}`;
    }
  }

  const setU = (u: Unit) => setUnit(u);

  return (
    <>
      <div className="overlay show" onClick={onClose} />
      <div className="panel show">
        <div className="grab" />
        <div className="p-head">
          <div className="p-name wenkai">{item.n}</div>
          <div className="p-cat">{item.c + (item.a.length ? "｜又叫 " + item.a.join("、") : "")}</div>
        </div>
        <div className="season-line">
          <span className={`badge ${badge.cls}`}>{badge.text}</span>
          <span style={{ fontSize: 13, color: "var(--muted)" }}>
            {isAllYear(item) ? "供應月份：" : "盛產月份："}
          </span>
          <div className="dot-row">
            {MONTHS.map((m) => (
              <span
                key={m}
                className={"mdot" + (item.peak.includes(m) ? " on" : "") + (m === month ? " now" : "")}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
        <div className="ref">
          <div className="lbl">合理零售參考價（這個月）</div>
          <div className="rng">
            {rd(lo * JIN)}～{rd(hi * JIN)} <small>元/台斤</small>
          </div>
          <div className="sub">{refSub}</div>
          <div className={"src" + (srcLive ? " live" : "")}>{srcText}</div>
        </div>
        <div className="ask">
          <div className="q">你看到的價格是多少？</div>
          <div className="inrow">
            <input
              type="number"
              inputMode="decimal"
              placeholder="0"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <div className="unit">
              <button className={unit === "jin" ? "on" : ""} onClick={() => setU("jin")}>
                元/台斤
              </button>
              <button className={unit === "kg" ? "on" : ""} onClick={() => setU("kg")}>
                元/公斤
              </button>
              {item.pc && (
                <button className={unit === "pc" ? "on" : ""} onClick={() => setU("pc")}>
                  元/{pcLabel(item)}
                </button>
              )}
            </div>
          </div>
          {item.pc && unit === "pc" && (
            <div className="pc-hint show">
              {(() => {
                const [, kg] = item.pc!;
                const jin = kg / JIN;
                return `以中等大小一${pcLabel(item)}約 ${kg} 公斤（${jin % 1 ? jin.toFixed(1) : jin} 台斤）估算，特大特小請自行斟酌`;
              })()}
            </div>
          )}
        </div>
        <PriceStamp verdict={verdict} big={big} why={why} />
        <LiveQuery item={item} />
      </div>
    </>
  );
}
