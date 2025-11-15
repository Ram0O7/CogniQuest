
import React, { useState, useEffect, useRef } from 'react';

interface TimerProps {
  durationInMinutes: number;
  onTimeUp: () => void;
  startTime: number;
}

const Timer: React.FC<TimerProps> = ({ durationInMinutes, onTimeUp, startTime }) => {
  const durationInSeconds = durationInMinutes * 60;
  const [remaining, setRemaining] = useState(durationInSeconds);
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    const calculateRemaining = () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      return durationInSeconds - elapsed;
    }

    setRemaining(calculateRemaining());

    intervalRef.current = window.setInterval(() => {
      const remainingSeconds = calculateRemaining();
      if (remainingSeconds <= 0) {
        setRemaining(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onTimeUp();
      } else {
        setRemaining(remainingSeconds);
      }
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationInMinutes, onTimeUp, startTime]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  
  const isLowTime = remaining <= 60;

  return (
    <div className={`px-3 py-1 rounded-full text-sm font-bold ${isLowTime ? 'bg-red-100 text-red-700 animate-pulse' : 'bg-primary/10 text-primary'}`}>
      <span>{String(minutes).padStart(2, '0')}</span>:
      <span>{String(seconds).padStart(2, '0')}</span>
    </div>
  );
};

export default Timer;
