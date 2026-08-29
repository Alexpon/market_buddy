export interface FreshTag {
  text: string;
  live: boolean;
}

interface Props {
  month: number;
  day: number;
  year: number;
  tag: FreshTag;
  onRefresh: () => void;
}

export default function Header({ month, day, year, tag, onRefresh }: Props) {
  return (
    <header>
      <h1>
        菜市場比價<span className="tag">菜・果・魚・肉</span>
      </h1>
      <p>{`今天 ${year}/${month}/${day}・打✔的是本月當季，價格會漂亮`}</p>
      <div className="freshrow">
        <span className={"fresh" + (tag.live ? " live" : "")}>{tag.text}</span>
        <button id="refreshBtn" onClick={onRefresh}>
          🔄 更新行情
        </button>
      </div>
    </header>
  );
}
