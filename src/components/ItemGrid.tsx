import type { Item } from "../lib/types";
import { inSeason, isAllYear, seasonSub } from "../lib/season";

interface Props {
  items: Item[];
  month: number;
  onSelect: (it: Item) => void;
}

export default function ItemGrid({ items, month, onSelect }: Props) {
  if (items.length === 0) {
    return <div className="empty">找不到這一項，換個名字試試？</div>;
  }
  return (
    <div className="grid">
      {items.map((it) => {
        const hot = inSeason(it, month) && !isAllYear(it);
        return (
          <button key={it.n} className={"item" + (hot ? " season" : "")} onClick={() => onSelect(it)}>
            <div className="nm">{it.n}</div>
            <div className="pk">{seasonSub(it)}</div>
          </button>
        );
      })}
    </div>
  );
}
