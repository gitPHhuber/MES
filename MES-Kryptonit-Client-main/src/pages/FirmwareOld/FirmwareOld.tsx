export const FirmwareOld: React.FC = () => {
  const nodeRedUrl = import.meta.env.VITE_NODE_RED_URL || "http://localhost:1880";

  return (
    <div className="w-100 h-screen bg-gray-100/70">
      <iframe
        src={nodeRedUrl}
        title="Node-RED"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      ></iframe>
    </div>
  );
};
