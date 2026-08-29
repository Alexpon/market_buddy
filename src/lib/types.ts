export type Category = "葉菜" | "瓜果茄豆" | "根莖蔥蒜" | "菇菌" | "水果" | "海鮮" | "肉類";
export const CATS: Category[] = ["葉菜", "瓜果茄豆", "根莖蔥蒜", "菇菌", "水果", "海鮮", "肉類"];

export interface Item {
  /** 顯示名（= prices.json 的 key） */
  n: string;
  /** 別名（搜尋用） */
  a: string[];
  c: Category;
  /** 內建基準價區間 [低, 高] 元/公斤；retail 品項為零售價，其餘為批發價 */
  w: [number, number];
  /** true = w 已是零售價：判價不加成，也不接自動更新 */
  retail?: boolean;
  /** 盛產月份 1-12；長度 12 = 全年供應 */
  peak: number[];
  /** 論個計價 [單位名, 一單位約幾公斤]，如 ["顆", 1.8] */
  pc?: [string, number];
  /** 官方品名關鍵字（抓價腳本與 L3 查詢用）；無 = 不自動更新 */
  api?: string[];
  /** 挑選要領：一句話教你在攤位前挑出品質好的 */
  pick: string;
}

export interface PriceEntry {
  /** 近 N 天批發均價 元/公斤 */
  kg: number;
  /** 樣本筆數 */
  n: number;
}

export interface PricesFile {
  updatedAt: string | null;
  days: number;
  source: string;
  items: Record<string, PriceEntry>;
}
