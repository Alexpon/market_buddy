import { useMemo, useState } from "react";
import itemsJson from "../data/items.json";
import { filterItems } from "./lib/catalog";
import type { Item } from "./lib/types";
import { usePrices, liveOf } from "./hooks/usePrices";
import Header from "./components/Header";
import SearchBar from "./components/SearchBar";
import CategoryChips from "./components/CategoryChips";
import ItemGrid from "./components/ItemGrid";
import ItemSheet from "./components/ItemSheet";

const DB = itemsJson as Item[];
const NOW = new Date();
const MONTH = NOW.getMonth() + 1;

export default function App() {
  const [cat, setCat] = useState("全部");
  const [q, setQ] = useState("");
  const [current, setCurrent] = useState<Item | null>(null);
  const { prices, tag, refresh } = usePrices();

  const list = useMemo(() => filterItems(DB, cat, q, MONTH), [cat, q]);

  return (
    <>
      <Header
        year={NOW.getFullYear()}
        month={MONTH}
        day={NOW.getDate()}
        tag={tag}
        onRefresh={refresh}
      />
      <div className="sheet">
        <SearchBar value={q} onChange={setQ} />
        <CategoryChips value={cat} onChange={setCat} />
        <ItemGrid items={list} month={MONTH} onSelect={setCurrent} />
      </div>
      <footer>
        蔬果基準：農業部「農產品批發市場交易行情」；漁產基準：「漁產品批發市場交易行情」；肉類為市場零售概略值（拍賣資料為活體毛豬/家禽，與零售分切價差異大，故不自動更新）。
        零售參考＝批發×1.5～2；單位重量為常見中等大小估值。詳情見{" "}
        <a href="https://amis.afa.gov.tw" target="_blank" rel="noopener noreferrer">
          批發行情站
        </a>
        。
      </footer>
      <ItemSheet
        item={current}
        live={current ? liveOf(prices, current) : null}
        liveDays={prices?.days ?? 30}
        month={MONTH}
        onClose={() => setCurrent(null)}
      />
    </>
  );
}
