import type { Verdict } from "../lib/pricing";

interface Props {
  verdict: Verdict | null;
  big: string;
  why: string;
}

export default function PriceStamp({ verdict, big, why }: Props) {
  if (!verdict) return <div className="stamp" />;
  return (
    <div className={`stamp show ${verdict}`}>
      <div className="big wenkai">{big}</div>
      <div className="why">{why}</div>
    </div>
  );
}
