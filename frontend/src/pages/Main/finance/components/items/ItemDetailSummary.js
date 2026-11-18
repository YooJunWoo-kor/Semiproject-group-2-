import React from "react";

export default function DetailSummary({ title, amount, status }) {
  return (
    <dl
      aria-label="상세 요약"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 2fr)",
        gap: "8px 12px",
        margin: "0 0 12px",
        padding: 12,
        background: "var(--color-canvas)",
        borderRadius: 10,
        fontSize: 13,
      }}
    >
      {[
        ["제목", title],
        ["금액", amount],
        ["상태", status],
      ].map(([label, value]) => (
        <React.Fragment key={label}>
          <dt>{label}</dt>
          <dd
            style={{
              margin: 0,
              fontWeight: 600,
              overflowWrap: "anywhere",
            }}
          >
            {value}
          </dd>
        </React.Fragment>
      ))}
    </dl>
  );
}
