interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function SearchBar({ value, onChange }: Props) {
  return (
    <div className="search">
      <span>🔍</span>
      <input
        type="search"
        placeholder="找菜、水果、魚、肉（例：鮭魚、雞腿）"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
