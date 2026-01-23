'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export default function VoiceWaveform({ isActive, audioStream }: VoiceWaveformProps) {
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
    <div className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 py-3 border-2 border-blue-400 dark:border-blue-600">
      <div className="relative flex items-center justify-center" style={{ width: '80px', height: '80px' }}>
        {/* Outer pulsing ring */}
        <div
          className="absolute rounded-full bg-blue-500/20 transition-all duration-100"
          style={{
            width: `${60 + volume * 40}px`,
            height: `${60 + volume * 40}px`,
          }}
        />

        {/* Middle pulsing ring */}
        <div
          className="absolute rounded-full bg-blue-500/30 transition-all duration-100"
          style={{
            width: `${50 + volume * 30}px`,
            height: `${50 + volume * 30}px`,
          }}
        />

        {/* Inner pulsing ring */}
        <div
          className="absolute rounded-full bg-blue-500/40 transition-all duration-100"
          style={{
            width: `${40 + volume * 20}px`,
            height: `${40 + volume * 20}px`,
          }}
        />

        {/* Center circle */}
        <div
          className="absolute rounded-full bg-blue-600 shadow-lg transition-all duration-100"
          style={{
            width: `${30 + volume * 10}px`,
            height: `${30 + volume * 10}px`,
            boxShadow: `0 0 ${volume * 20}px rgba(59, 130, 246, 0.6)`,
          }}
        />

        {/* Microphone icon */}
        <svg
          className="relative z-10 text-white"
          width="20"
          height="20"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
          />
        </svg>
      </div>
    </div>
  );
}
