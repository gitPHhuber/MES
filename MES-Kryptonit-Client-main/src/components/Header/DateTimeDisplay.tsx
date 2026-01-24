import { useState, useEffect } from 'react';

export const DateTimeDisplay = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Форматирование даты и времени
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  };

  return (
    <div className="flex flex-col items-end justify-center">
      <div className="text-xl font-semibold text-emerald-700 tracking-wide">
        {formatDate(currentTime)}
      </div>
      <div className="text-sm text-gray-600 font-medium bg-emerald-50 px-2 py-1 rounded-md">
        {formatTime(currentTime)}
      </div>
    </div>
  );
};

