'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export default function VoiceWaveform({ isActive, audioStream }: VoiceWaveformProps) {
  const [bars, setBars] = useState<number[]>(Array(60).fill(0.3));

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
          setBars(prev => prev.map(() => 0.3 + Math.random() * 0.7));
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

      const updateBars = () => {
        if (!analyser || !isActive) return;

        analyser.getByteFrequencyData(dataArray);

        // Convert frequency data to bar heights with more variation
        const newBars = Array(60).fill(0).map((_, i) => {
          const index = Math.floor((i / 60) * bufferLength);
          const value = dataArray[index] || 0;
          // Increase sensitivity and range for more prominent waveform effect
          return Math.min(1, (value / 255) * 2.5 + 0.2);
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
          // Fallback animation with more variation
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
      // Fallback: animation with more variation
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
    <div className="flex-1 flex items-center justify-center gap-0.5 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 py-3 border-2 border-blue-400 dark:border-blue-600">
      {bars.map((height, i) => {
        // Create vertical movement based on height for wave effect
        const verticalOffset = (height - 0.5) * 20; // -10px to +10px movement
        return (
          <div
            key={i}
            className="flex-1 rounded-sm transition-all duration-50"
            style={{
              height: `${height * 100}%`,
              maxHeight: '56px',
              minHeight: '8px',
              transform: `translateY(${verticalOffset}px)`,
              background: 'linear-gradient(to top, #2563EB, #3B82F6, #60A5FA)',
              boxShadow: height > 0.7 ? '0 0 10px rgba(59, 130, 246, 0.8)' : 'none',
            }}
          />
        );
      })}
    </div>
  );
}
