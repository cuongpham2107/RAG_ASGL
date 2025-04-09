import React from 'react';
interface WaveTextProps {
  text: string;
}

const WaveText = ({text} : WaveTextProps) => {
  return (
      <div className="text-lg font-semibold ">
         {text.split('').map((char, index) => (
          <span
            key={index}
            className={`inline-block ${char === ' ' ? 'w-1.5' : 'animate-pulse'}`}
            style={{
              animationDelay: `${index * 0.1}s`,
              animationDuration: '1s',
            }}
          >
            {char}
          </span>
        ))}
      </div>
  );
};

export default WaveText;