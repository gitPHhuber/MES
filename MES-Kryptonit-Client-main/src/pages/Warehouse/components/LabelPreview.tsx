import React from "react";
import QRCode from "react-qr-code";

interface LabelPreviewProps {
  label: string;
  project: string;
  batch: string;
  id: string;
  qrValue: string;
  qty: number;
  unit: string;
  isPartial?: boolean;
}

export const LabelPreview: React.FC<LabelPreviewProps> = ({ label, project, batch, id, qrValue, qty, unit, isPartial }) => (
  <div className={`border-2 ${isPartial ? 'border-amber-500 bg-amber-50/30' : 'border-gray-800 bg-white'} rounded-lg p-3 w-full max-w-[280px] shadow-xl relative overflow-hidden group transition-all hover:scale-[1.02]`}>
      {isPartial && <div className="absolute top-0 right-0 bg-amber-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-bl shadow-sm">ОСТАТОК</div>}
      <div className="flex gap-3 items-center">
          <div className="bg-white p-1 rounded border border-gray-100">
             {qrValue ? <QRCode value={qrValue} size={70} /> : <div className="w-[70px] h-[70px] bg-gray-100 animate-pulse rounded"/>}
          </div>
          <div className="flex-1 text-left overflow-hidden">
              <div className="text-[9px] font-bold text-gray-400 uppercase tracking-wider flex justify-between">
                  <span>{batch || "БЕЗ ПАРТИИ"}</span>
              </div>
              <div className="text-sm font-black text-gray-900 leading-tight mb-1 line-clamp-2 mt-0.5">
                  {label || "Изделие"}
              </div>
              <div className="text-[10px] text-gray-500 truncate mb-1 bg-gray-100 px-1 rounded w-max max-w-full">
                  {project || "Без проекта"}
              </div>
              <div className="flex items-center justify-between border-t border-gray-200 pt-1.5 mt-1">
                  <span className="font-mono text-[9px] text-gray-400">ID: {id || "..."}</span>
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${isPartial ? 'bg-amber-100 text-amber-800' : 'bg-black text-white'}`}>
                      {qty} {unit}
                  </span>
              </div>
          </div>
      </div>
  </div>
);