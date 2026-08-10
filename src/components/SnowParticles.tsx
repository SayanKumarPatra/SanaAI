import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  speedX: number;
  speedY: number;
  opacity: number;
  pulseSpeed: number;
  color: string;
}

export function SnowParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      'rgba(125, 211, 252, ', // sky-300
      'rgba(56, 189, 248, ',  // sky-400
      'rgba(147, 197, 253, ', // blue-300
      'rgba(186, 230, 253, ', // sky-200
      'rgba(224, 242, 254, '  // sky-100
    ];

    const particleCount = Math.min(Math.floor((width * height) / 18000), 55);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 0.8,
        speedX: (Math.random() - 0.5) * 0.3,
        speedY: -(Math.random() * 0.4 + 0.1), // Gentle floating upwards
        opacity: Math.random() * 0.6 + 0.2,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        color: colors[Math.floor(Math.random() * colors.length)]
      });
    }

    let time = 0;

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      time += 0.01;

      // Oscillating wind parameter that changes smoothly over time
      const wind = Math.sin(time * 0.4) * 0.7 + Math.cos(time * 0.2) * 0.3;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Combine individual speed, sine wave drift, and time-oscillating wind force
        p.x += p.speedX + wind + Math.sin(time + i) * 0.15;
        p.y += p.speedY;

        // Pulse opacity slightly
        const currentOpacity = Math.max(0.1, Math.min(0.8, p.opacity + Math.sin(time * 2 + i) * 0.2));

        // Wrap around screen edges
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        } else if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Draw particle with soft glow
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${currentOpacity})`;
        ctx.shadowBlur = 6;
        ctx.shadowColor = 'rgba(56, 189, 248, 0.5)';
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none z-0 opacity-70"
    />
  );
}
