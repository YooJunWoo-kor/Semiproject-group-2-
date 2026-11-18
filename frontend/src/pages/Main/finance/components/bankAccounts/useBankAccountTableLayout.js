import { useEffect } from "react";

export default function useBankAccountTableLayout(accountListRef, accountColumns) {
  // BasicTable은 thead 없이 첫 tr에 제목을 표시합니다.
  // 공통 파일 대신 이 목록의 DOM에만 인라인 너비·여백을 적용합니다.
  useEffect(() => {
    const container = accountListRef.current;
    if (!container) return;
    function applyLayout() {
      const table = container.querySelector("table");
      if (!table) return;
      Object.assign(table.style, {
        width: "100%",
        minWidth: "0",
        maxWidth: "100%",
        tableLayout: "fixed",
        boxSizing: "border-box",
      });
      const headers = table.rows[0]?.cells;
      const cols = table.querySelectorAll("colgroup > col");
      accountColumns.forEach((column, index) => {
        if (headers?.[index])
          Object.assign(headers[index].style, {
            width: column.width || "auto",
            minWidth: "0",
            boxSizing: "border-box",
          });
        if (cols[index])
          Object.assign(cols[index].style, {
            width: column.width || "auto",
            minWidth: "0",
          });
      });
      table.querySelectorAll("th, td").forEach((cell) =>
        Object.assign(cell.style, {
          padding: "8px 10px",
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }),
      );
      table.querySelectorAll("button").forEach((button) =>
        Object.assign(button.style, {
          minHeight: "30px",
          height: "30px",
          padding: "6px 8px",
          fontSize: "12px",
          lineHeight: "16px",
          borderRadius: "8px",
          whiteSpace: "nowrap",
          flexShrink: "0",
          boxSizing: "border-box",
          cursor: button.disabled ? "default" : "pointer",
        }),
      );
      const card = container.querySelector(".attendance-card");
      if (card)
        Object.assign(card.style, {
          paddingBottom: "12px",
          minWidth: "0",
        });
      const title = card?.querySelector("h4");
      if (title)
        Object.assign(title.style, {
          marginTop: "0",
          marginBottom: "10px",
        });
      const shell = container.querySelector(".table-shell");
      if (shell)
        Object.assign(shell.style, {
          width: "100%",
          maxWidth: "100%",
          minWidth: "0",
          boxSizing: "border-box",
        });
    }
    applyLayout();
    // 페이지 전환으로 교체되는 행에도 같은 여백을 적용합니다.
    const observer = new MutationObserver(applyLayout);
    observer.observe(container, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  });

}
