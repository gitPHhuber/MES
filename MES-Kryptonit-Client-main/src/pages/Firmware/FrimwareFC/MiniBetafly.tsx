import React from "react";
import { Activity, Gauge, BatteryCharging } from "lucide-react";
import { BetaflyDevice } from "src/hooks/useBetaflyData";

interface MiniBetaflyProps {
device?: BetaflyDevice;
highlight: string | null;
proMode: boolean;}


export const MiniBetafly: React.FC<MiniBetaflyProps> = ({ device, highlight, proMode }) => {
  
 // Значения по умолчанию, если device отсутствует
  const attitude = device?.attitude || { roll: 0, pitch: 0, yaw: 0 };
  const altitude = device?.altitude || { estAlt: 0, vario: 0 };
  const analog = device?.analog || { amperage: 0, vbat: 0, rssi: 0 };

const highlightClass =
    highlight === "green"
      ? "bg-green-200"
      : highlight === "red"
      ? "bg-red-400"
      : "";

  return (
    <>
    { proMode&&
    <div 
    className={`flex flex-col space-y-2 text-sm rounded-lg p-2 shadow-inner transition-colors duration-300 ${highlightClass}`}
    >
      {/* Акселерометр */}
      <div className="flex items-center space-x-2">
        <Activity className="text-blue-600 w-5 h-5" />
        <span>Roll: {attitude.roll.toFixed(1)}°</span>
        <span>Pitch: {attitude.pitch.toFixed(1)}°</span>
        <span>Yaw: {attitude.yaw.toFixed(1)}°</span>
      </div>

      {/* Барометр */}
      <div className="flex items-center space-x-2">
        <Gauge className="text-purple-600 w-5 h-5" />
        <span>Alt: {altitude.estAlt.toFixed(1)} см</span>
      </div>

      {/* Ток */}
      <div className="flex items-center space-x-2">
        <BatteryCharging className="text-green-600 w-5 h-5" />
        <span>{(analog.amperage /100).toFixed(3)} А</span>
      </div>
    </div>
}
    </>
  );
};
