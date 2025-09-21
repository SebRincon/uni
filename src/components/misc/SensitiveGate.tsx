import { useState } from "react";
import { FaEyeSlash } from "react-icons/fa";

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
      <>
        {text}
        {image}
      </>
    );
  }

  return (
    <div className="sensitive-gate" onClick={(e) => e.stopPropagation()}>
      <div className="gate-content">
        <div className="icon">
          <FaEyeSlash />
        </div>
        <div className="gate-text">
          <strong>Potentially sensitive content</strong>
          <p>This content may not be suitable for all audiences.</p>
          {categories && categories.length > 0 && (
            <div className="categories">
              Categories: {categories.join(", ")}
            </div>
          )}
        </div>
        <button
          className="btn btn-white"
          onClick={(e) => {
            e.stopPropagation();
            setRevealed(true);
          }}
        >
          View
        </button>
      </div>
    </div>
  );
}
