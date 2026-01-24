export const FirmwareOld: React.FC = () => {
  return (
    <div className="w-100 h-screen bg-gray-100/70">
      <iframe
        src="http://localhost:1880"
        title="Node-RED"
        width="100%"
        height="100%"
        style={{ border: "none" }}
      ></iframe>
    </div>
  );
};
