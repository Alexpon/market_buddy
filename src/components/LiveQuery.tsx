import { useEffect, useState } from "react";
import type { Item } from "../lib/types";
import { queryLive } from "../lib/live";
import { JIN, rd, rd1 } from "../lib/pricing";

interface Props {
  item: Item;
}

const stripParen = (s: string) => s.replace(/\(.+\)/, "");

/** L3：詳細頁即時打農業部 API 查該品項近 7 天均價（不落地） */
export default function LiveQuery({ item }: Props) {
  const [out, setOut] = useState<React.ReactNode>("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // 換品項時清空查詢結果
    setOut(item.c === "肉類" ? "肉類拍賣資料為活體價，與零售分切價差距大，維持內建零售基準。" : "");
  }, [item]);

  // 肉類、retail、無 api 對照的品項（如鯛魚片）沒有對應批發資料，不提供即時查詢
  if (item.c === "肉類") {
    return (
      <div className="live">
        <div className="out">肉類拍賣資料為活體價，與零售分切價差距大，維持內建零售基準。</div>
      </div>
    );
  }
  if (item.retail || !item.api?.length) {
    return <div className="live" />;
  }

  const amisLink = (
    <a href="https://amis.afa.gov.tw" target="_blank" rel="noopener noreferrer">
      批發行情站
    </a>
  );

  const query = async () => {
    setBusy(true);
    setOut("查詢中…");
    const end = new Date();
    const start = new Date(end);
    start.setDate(start.getDate() - 7);
    const r = await queryLive(item, start, end);
    if (r.status === "ok") {
      let retail = `零售參考約 ${rd(r.avg * 1.5 * JIN)}～${rd(r.avg * 2 * JIN)} 元/台斤`;
      if (item.pc) {
        retail += `、一${stripParen(item.pc[0])}約 ${rd1(r.avg * 1.5 * item.pc[1])}～${rd1(r.avg * 2 * item.pc[1])} 元`;
      }
      setOut(
        <>
          近 7 天批發均價約 <b>{r.avg.toFixed(1)} 元/公斤</b>（{r.n} 筆）。{retail}。
        </>,
      );
    } else if (r.status === "empty") {
      setOut(
        <>
          近 7 天查無「{item.n}」的批發交易，可能非產季或市場休市，先參考上方基準價。也可開{" "}
          {amisLink} 查看。
        </>,
      );
    } else {
      setOut(<>目前連不上農業部 API，請稍後再試。也可直接開 {amisLink} 查「{item.n}」。</>);
    }
    setBusy(false);
  };

  return (
    <div className="live">
      <button onClick={query} disabled={busy}>
        查最新批發行情（農業部 API）
      </button>
      <div className="out">{out}</div>
    </div>
  );
}
