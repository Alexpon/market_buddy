import { CATS } from "../lib/types";

const ALL_CATS = ["全部", ...CATS];

interface Props {
  value: string;
  onChange: (cat: string) => void;
}

export default function CategoryChips({ value, onChange }: Props) {
  return (
    <div className="chips">
      {ALL_CATS.map((c) => (
        <button
          key={c}
          className={"chip" + (c === value ? " on" : "")}
          onClick={() => onChange(c)}
        >
          {c}
        </button>
      ))}
    </div>
  );
}
