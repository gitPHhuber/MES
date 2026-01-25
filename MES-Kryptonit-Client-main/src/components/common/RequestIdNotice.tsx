import React from "react";

type RequestIdNoticeProps = {
  requestId?: string | null;
};

export const RequestIdNotice: React.FC<RequestIdNoticeProps> = ({
  requestId,
}) => {
  if (!requestId) {
    return null;
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(requestId);
    } catch (error) {
      console.error("Не удалось скопировать requestId", error);
    }
  };

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-red-600">
      <span className="font-mono">RequestId: {requestId}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="rounded border border-red-300 px-2 py-1 text-xs font-semibold text-red-600 hover:bg-red-50"
      >
        Скопировать requestId
      </button>
    </div>
  );
};
