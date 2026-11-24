export function Badge({ children }: { children: string }) {
  return (
    <span style={{ color: "#3b82f6", borderRadius: "8px", border: "1px solid #3b82f6", padding: "2px 8px", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }}>
      {children}
    </span>
  );
}
