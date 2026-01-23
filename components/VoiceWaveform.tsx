'use client';

import { useEffect, useRef, useState } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export default function VoiceWaveform({ isActive, audioStream }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const analyserRef = useRef<AnalyserNode | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | undefined>(undefined);
  const [canvasSize, setCanvasSize] = useState({ width: 600, height: 60 });

  // Update canvas size based on container
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const width = containerRef.current.clientWidth;
        const height = 60;
        setCanvasSize({ width, height });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (!audioStream || !canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Create AudioContext with proper initialization for mobile
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextClass();
    audioContextRef.current = audioContext;

    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isActive) return;

      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Calculate average volume
      const average = dataArray.reduce((a, b) => a + b) / bufferLength;

      // Draw waveform bars
      const barCount = Math.min(40, Math.floor(canvas.width / 15)); // Adaptive bar count
      const barWidth = canvas.width / barCount;
      const centerY = canvas.height / 2;

      for (let i = 0; i < barCount; i++) {
        const dataIndex = Math.floor((i / barCount) * bufferLength);
        const value = dataArray[dataIndex] || 0;

        // Normalize and add some minimum height
        const normalizedValue = (value / 255) * 0.8 + 0.2;
        const barHeight = normalizedValue * (canvas.height * 0.8);

        // Create gradient
        const gradient = ctx.createLinearGradient(0, centerY - barHeight/2, 0, centerY + barHeight/2);
        gradient.addColorStop(0, '#6366F1');
        gradient.addColorStop(0.5, '#A855F7');
        gradient.addColorStop(1, '#06B6D4');

        ctx.fillStyle = gradient;

        // Draw bar with rounded corners
        const x = i * barWidth + barWidth * 0.2;
        const width = barWidth * 0.6;
        const y = centerY - barHeight / 2;

        ctx.beginPath();
        ctx.roundRect(x, y, width, barHeight, width / 2);
        ctx.fill();
      }

      // Add glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = average > 50 ? '#A855F7' : '#6366F1';
    };

    // Resume AudioContext for mobile (required by some browsers)
    if (audioContext.state === 'suspended') {
      audioContext.resume().then(() => {
        draw();
      });
    } else {
      draw();
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream, isActive, canvasSize]);

  if (!isActive) return null;

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600"
    >
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        className="w-full"
        style={{ maxHeight: '60px', display: 'block' }}
      />
    </div>
  );
}
