'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export default function VoiceWaveform({ isActive, audioStream }: VoiceWaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(20).fill(0.3));

  useEffect(() => {
    if (!audioStream || !isActive) return;

    let animationId: number;
    let analyser: AnalyserNode | null = null;
    let audioContext: AudioContext | null = null;

    try {
      // Try to create AudioContext with fallback
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        console.log('AudioContext not supported, using fallback animation');
        // Fallback: simple animation without audio analysis
        const animate = () => {
          setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
          animationId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(animationId);
      }

      audioContext = new AudioContextClass();
      analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(audioStream);

      analyser.fftSize = 64;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      const updateBars = () => {
        if (!analyser || !isActive) return;

        analyser.getByteFrequencyData(dataArray);

        // Convert frequency data to bar heights
        const newBars = Array(20).fill(0).map((_, i) => {
          const index = Math.floor((i / 20) * bufferLength);
          const value = dataArray[index] || 0;
          return (value / 255) * 0.8 + 0.2;
        });

        setBars(newBars);
        animationId = requestAnimationFrame(updateBars);
      };

      // Resume audio context if suspended (required for mobile)
      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed');
          updateBars();
        }).catch(err => {
          console.error('Failed to resume AudioContext:', err);
          // Fallback animation
          const animate = () => {
            setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
            animationId = requestAnimationFrame(animate);
          };
          animate();
        });
      } else {
        updateBars();
      }

    } catch (error) {
      console.error('Error setting up audio visualization:', error);
      // Fallback: simple animation
      const animate = () => {
        setBars(prev => prev.map(() => 0.2 + Math.random() * 0.8));
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
    <div className="flex-1 flex items-center justify-center gap-1 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600">
      {bars.map((height, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-100"
          style={{
            height: `${height * 100}%`,
            maxHeight: '40px',
            minHeight: '8px',
            background: 'linear-gradient(to bottom, #6366F1, #A855F7, #06B6D4)',
            boxShadow: height > 0.5 ? '0 0 10px rgba(168, 85, 247, 0.5)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
