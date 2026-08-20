import { useEffect, useRef } from "react";

/**
 * Canvas starfield: parallax depth layers, twinkling stars and falling
 * shooting stars. Monochrome-silver with faint blue/warm accents so it
 * stays inside the Moon palette.
 */
export default function StarfieldCanvas({ className = "", warp = false, meteors = true }) {
  const canvasRef = useRef(null);
  const warpRef = useRef(warp);
  warpRef.current = warp;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let w = 0;
    let h = 0;
    let dpr = 1;
    let stars = [];
    let shots = [];
    let raf;
    let last = performance.now();
    let nextShot = 500;
    let speed = 1;

    const TINTS = [
      "255,255,255",
      "255,255,255",
      "234,238,245",
      "205,216,240", // faint blue
      "245,232,214", // faint warm
    ];

    const build = () => {
      const count = Math.round(Math.min(320, (w * h) / 5200));
      stars = Array.from({ length: count }, () => {
        const z = Math.random(); // depth 0 = far, 1 = near
        return {
          x: Math.random(),
          y: Math.random(),
          z,
          r: 0.35 + z * 1.15,
          tint: TINTS[(Math.random() * TINTS.length) | 0],
          base: 0.25 + z * 0.6,
          phase: Math.random() * Math.PI * 2,
          tw: 0.6 + Math.random() * 1.8,
          glow: z > 0.86,
        };
      });
    };

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = canvas.clientWidth;
      h = canvas.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
    };

    const spawnShot = () => {
      const angle = (100 + Math.random() * 28) * (Math.PI / 180); // down + slightly left
      shots.push({
        x: w * (0.15 + Math.random() * 1.05),
        y: -h * 0.12 * Math.random(),
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        speed: (0.45 + Math.random() * 0.55) * Math.max(w, h),
        len: 90 + Math.random() * 190,
        life: 0,
        ttl: 0.9 + Math.random() * 0.7,
        width: 0.8 + Math.random() * 1.1,
      });
    };

    const frame = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const t = now / 1000;

      // eased acceleration into warp — no stepped jump when the phase flips
      const target = warpRef.current ? 8 : 1;
      speed += (target - speed) * Math.min(1, dt * 2.4);
      const streak = Math.min(1, Math.max(0, (speed - 1.3) / 3.2));

      ctx.clearRect(0, 0, w, h);

      for (const s of stars) {
        if (!reduced) {
          s.y += (0.006 + s.z * 0.022) * dt * speed;
          if (s.y > 1.03) {
            s.y = -0.03;
            s.x = Math.random();
          }
        }
        const twinkle = reduced ? 1 : 0.6 + 0.4 * Math.sin(t * s.tw + s.phase);
        const a = s.base * twinkle;
        const px = s.x * w;
        const py = s.y * h;

        if (s.glow) {
          const g = ctx.createRadialGradient(px, py, 0, px, py, s.r * 9);
          g.addColorStop(0, `rgba(${s.tint},${a * 0.5})`);
          g.addColorStop(1, `rgba(${s.tint},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(px, py, s.r * 9, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.fillStyle = `rgba(${s.tint},${a})`;
        ctx.beginPath();
        ctx.arc(px, py, s.r, 0, Math.PI * 2);
        ctx.fill();

        // warp streaks fade in with the acceleration rather than popping on
        if (streak > 0.01) {
          ctx.strokeStyle = `rgba(${s.tint},${a * 0.55 * streak})`;
          ctx.lineWidth = s.r;
          ctx.beginPath();
          ctx.moveTo(px, py);
          ctx.lineTo(px, py - s.z * speed * 9 * streak);
          ctx.stroke();
        }
      }

      if (meteors && !reduced) {
        const mSpeed = 1 + (speed - 1) * 0.4;
        nextShot -= dt * 1000;
        if (nextShot <= 0 && speed < 1.5) {
          spawnShot();
          if (Math.random() > 0.72) spawnShot();
          nextShot = 700 + Math.random() * 1800;
        }

        for (const m of shots) {
          m.life += dt;
          m.x += m.vx * m.speed * dt * mSpeed;
          m.y += m.vy * m.speed * dt * mSpeed;

          const p = m.life / m.ttl;
          const fade = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
          const a = Math.max(0, fade);
          const tx = m.x - m.vx * m.len;
          const ty = m.y - m.vy * m.len;

          const grad = ctx.createLinearGradient(m.x, m.y, tx, ty);
          grad.addColorStop(0, `rgba(255,255,255,${a * 0.95})`);
          grad.addColorStop(0.35, `rgba(226,232,240,${a * 0.28})`);
          grad.addColorStop(1, "rgba(226,232,240,0)");
          ctx.strokeStyle = grad;
          ctx.lineWidth = m.width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(m.x, m.y);
          ctx.lineTo(tx, ty);
          ctx.stroke();

          const head = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, 14);
          head.addColorStop(0, `rgba(255,255,255,${a * 0.9})`);
          head.addColorStop(0.4, `rgba(210,222,240,${a * 0.22})`);
          head.addColorStop(1, "rgba(210,222,240,0)");
          ctx.fillStyle = head;
          ctx.beginPath();
          ctx.arc(m.x, m.y, 14, 0, Math.PI * 2);
          ctx.fill();
        }
        shots = shots.filter((m) => m.life < m.ttl && m.y < h + 200);
      }

      raf = requestAnimationFrame(frame);
    };

    resize();
    window.addEventListener("resize", resize);
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, [meteors]);

  return <canvas ref={canvasRef} className={`w-full h-full block ${className}`} aria-hidden="true" />;
}
