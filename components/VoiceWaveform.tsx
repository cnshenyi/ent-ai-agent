'use client';

import { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  isActive: boolean;
  audioStream: MediaStream | null;
}

export default function VoiceWaveform({ isActive, audioStream }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>();
  const analyserRef = useRef<AnalyserNode>();

  useEffect(() => {
    if (!audioStream || !canvasRef.current) return;

    const audioContext = new AudioContext();
    const analyser = audioContext.createAnalyser();
    const source = audioContext.createMediaStreamSource(audioStream);

    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.8;
    source.connect(analyser);
    analyserRef.current = analyser;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      const barCount = 40;
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

    draw();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      audioContext.close();
    };
  }, [audioStream, isActive]);

  if (!isActive) return null;

  return (
    <div className="flex-1 flex items-center justify-center bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-gray-800 dark:to-gray-700 rounded-xl px-4 py-3 border-2 border-indigo-300 dark:border-indigo-600">
      <canvas
        ref={canvasRef}
        width={600}
        height={60}
        className="w-full h-full"
        style={{ maxHeight: '60px' }}
      />
    </div>
  );
}
