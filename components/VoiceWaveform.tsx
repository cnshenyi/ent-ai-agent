'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
  onStop: () => void;
}

export default function VoiceWaveform({ isActive, audioStream, onStop }: VoiceWaveformProps) {
  const [volume, setVolume] = useState(0.3);

  useEffect(() => {
    if (!audioStream || !isActive) return;

    let animationId: number;
    let analyser: AnalyserNode | null = null;
    let audioContext: AudioContext | null = null;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        console.log('AudioContext not supported, using fallback animation');
        const animate = () => {
          setVolume(0.3 + Math.random() * 0.5);
          animationId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationId);
      }

      audioContext = new AudioContextClass();
      if (!audioContext) return;

      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateVolume = () => {
        if (!analyser || !isActive) return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        const normalizedVolume = Math.min(1, (average / 255) * 2.5 + 0.2);

        setVolume(normalizedVolume);
        animationId = requestAnimationFrame(updateVolume);
      };

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed');
          updateVolume();
        }).catch(err => {
          console.error('Failed to resume AudioContext:', err);
          const animate = () => {
            setVolume(0.3 + Math.random() * 0.5);
            animationId = requestAnimationFrame(animate);
          };
          animate();
        });
      } else {
        updateVolume();
      }

    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      const animate = () => {
        setVolume(0.3 + Math.random() * 0.5);
        animationId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (audioContext) {
        audioContext.close().catch(console.error);
      }
    };
  }, [audioStream, isActive]);

  if (!isActive) return null;

  return (
    <button
      onClick={onStop}
      className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 border-2 border-blue-400 dark:border-blue-600 cursor-pointer hover:border-blue-500 dark:hover:border-blue-500 transition-all relative overflow-hidden"
      style={{ height: '44px' }}
      title="点击结束录音"
    >
      {/* Center dot */}
      <div
        className="absolute rounded-full bg-blue-600 dark:bg-blue-500 transition-all duration-100 z-10"
        style={{
          width: `${8 + volume * 8}px`,
          height: `${8 + volume * 8}px`,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />

      {/* Expanding rings */}
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="absolute rounded-full border-2 border-blue-500 dark:border-blue-400"
          style={{
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            animation: `ripple ${1.5 + volume * 0.5}s ease-out infinite`,
            animationDelay: `${i * 0.5}s`,
            opacity: 0,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes ripple {
          0% {
            width: 16px;
            height: 16px;
            opacity: ${volume * 0.8};
          }
          100% {
            width: 200px;
            height: 200px;
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
}
