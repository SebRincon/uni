import { useState } from "react";

export default function SensitiveGate({
  text,
  image,
  categories,
}: {
  text?: React.ReactNode;
  image?: React.ReactNode;
  categories?: string[];
}) {
  const [revealed, setRevealed] = useState(false);
  if (revealed) {
    return (
      <div>
        {text}
        {image}
      </div>
    );
  }
  return (
    <div style={{ border: "1px solid #333", padding: 12, borderRadius: 12, background: "#111", color: "#ddd" }}>
      <strong>Sensitive content</strong>
      {categories && categories.length > 0 && (
        <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
          Categories: {categories.join(", ")}
        </div>
      )}
      <button onClick={() => setRevealed(true)} style={{ marginTop: 8 }}>
        View anyway
      </button>
    </div>
  );
}