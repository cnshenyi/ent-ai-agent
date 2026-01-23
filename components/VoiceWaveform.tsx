'use client';

import { useEffect, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
  onStop: () => void;
}

export default function VoiceWaveform({ isActive, audioStream, onStop }: VoiceWaveformProps) {
  const [volume, setVolume] = useState(0.3);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!audioStream || !isActive) return;

    let analyserAnimationId: number;
    let analyser: AnalyserNode | null = null;
    let audioContext: AudioContext | null = null;

    try {
      const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;

      if (!AudioContextClass) {
        console.log('AudioContext not supported, using fallback animation');
        const animate = () => {
          setVolume(0.3 + Math.random() * 0.5);
          analyserAnimationId = requestAnimationFrame(animate);
        };
        animate();
        return () => cancelAnimationFrame(analyserAnimationId);
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
        analyserAnimationId = requestAnimationFrame(updateVolume);
      };

      if (audioContext.state === 'suspended') {
        audioContext.resume().then(() => {
          console.log('AudioContext resumed');
          updateVolume();
        }).catch(err => {
          console.error('Failed to resume AudioContext:', err);
          const animate = () => {
            setVolume(0.3 + Math.random() * 0.5);
            analyserAnimationId = requestAnimationFrame(animate);
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
        analyserAnimationId = requestAnimationFrame(animate);
      };
      animate();
    }

    return () => {
      if (analyserAnimationId) {
        cancelAnimationFrame(analyserAnimationId);
      }
      if (audioContext) {
        audioContext.close().catch(console.error);
      }
    };
  }, [audioStream, isActive]);

  // Animate wave phase
  useEffect(() => {
    if (!isActive) return;

    let animationId: number;
    const animate = () => {
      setPhase(p => p + 0.05);
      animationId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [isActive]);

  if (!isActive) return null;

  // Generate wave path
  const generateWavePath = (amplitude: number, frequency: number, phase: number) => {
    const width = 300;
    const height = 44;
    const centerY = height / 2;
    const points = 50;

    let path = `M 0 ${centerY}`;

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const y = centerY + Math.sin((i / points) * frequency * Math.PI * 2 + phase) * amplitude * volume;
      path += ` L ${x} ${y}`;
    }

    return path;
  };

  return (
    <button
      onClick={onStop}
      className="flex-1 flex items-center justify-center bg-gradient-to-r from-blue-950 to-blue-900 dark:from-gray-950 dark:to-gray-900 rounded-xl px-4 border-2 border-blue-500 dark:border-blue-600 cursor-pointer hover:border-blue-400 dark:hover:border-blue-500 transition-all relative overflow-hidden"
      style={{ height: '44px' }}
      title="点击结束录音"
    >
      <svg
        width="100%"
        height="44"
        viewBox="0 0 300 44"
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        {/* Wave 1 */}
        <path
          d={generateWavePath(8, 2, phase)}
          fill="none"
          stroke="rgba(96, 165, 250, 0.8)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(96, 165, 250, 0.8))',
          }}
        />

        {/* Wave 2 */}
        <path
          d={generateWavePath(6, 3, phase + 1)}
          fill="none"
          stroke="rgba(59, 130, 246, 0.6)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(59, 130, 246, 0.6))',
          }}
        />

        {/* Wave 3 */}
        <path
          d={generateWavePath(10, 1.5, phase + 2)}
          fill="none"
          stroke="rgba(147, 197, 253, 0.5)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 0 4px rgba(147, 197, 253, 0.5))',
          }}
        />
      </svg>
    </button>
  );
}
