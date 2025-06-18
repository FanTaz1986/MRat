/**
 * Debug overlay component.
 * Shows debug menu and coordinates if provided.
 */
export function DebugMenuOverlay({ show, charPos, worldX, worldY, portal, showPortalPrompt }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: 20,
        right: 20,
        background: "rgba(30,0,60,0.97)",
        border: "2px solid #a259ff",
        borderRadius: 18,
        padding: "18px 32px",
        color: "#a259ff",
        fontWeight: "bold",
        fontSize: "1.3rem",
        zIndex: 9999,
        boxShadow: "0 0 32px #a259ff55",
        textShadow: "0 0 8px #a259ff88, 0 0 2px #fff",
        userSelect: "none",
        minWidth: 320,
      }}
    >
      <div>DEBUG MENU</div>
      <div>1: Load next map</div>
      <div>2: Teleport to portal</div>
      <div>3: Show portal prompt</div>
      <div>D: Toggle this menu</div>
      <hr style={{ margin: "12px 0", borderColor: "#a259ff55" }} />
      <div style={{ fontSize: "1rem", fontWeight: "normal" }}>
        <div>
          <b>Char (screen):</b> x={charPos?.x?.toFixed(1)}, y={charPos?.y?.toFixed(1)}
        </div>
        <div>
          <b>Char (world):</b> x={worldX?.toFixed(1)}, y={worldY?.toFixed(1)}
        </div>
        {portal && (
          <div>
            <b>Portal:</b> x={portal.x?.toFixed(1)}, y={portal.y?.toFixed(1)}
          </div>
        )}
      </div>
    </div>
  );
}