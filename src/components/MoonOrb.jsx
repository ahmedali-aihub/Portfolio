import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

export default function MoonOrb({ className = "" }) {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 60, damping: 20, mass: 0.6 });
  const sy = useSpring(my, { stiffness: 60, damping: 20, mass: 0.6 });
  const rotate = useTransform(sx, [-40, 40], [-3, 3]);

  useEffect(() => {
    const onMove = (e) => {
      const relX = e.clientX / window.innerWidth - 0.5;
      const relY = e.clientY / window.innerHeight - 0.5;
      mx.set(relX * 60);
      my.set(relY * 40);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  return (
    <motion.div
      className={`relative ${className}`}
      style={{ x: sx, y: sy, rotate }}
    >
      {/* outer halo */}
      <div
        className="absolute inset-[-30%] rounded-full opacity-70"
        style={{
          background: "radial-gradient(circle, color-mix(in srgb, var(--color-silver-bright) 22%, transparent) 0%, transparent 65%)",
          filter: "blur(40px)",
        }}
      />

      {/* sphere */}
      <motion.div
        className="relative rounded-full aspect-square"
        animate={{ rotate: 360 }}
        transition={{ duration: 140, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "radial-gradient(circle at 32% 28%, #ffffff 0%, #e4e6e9 10%, #b7bac0 32%, #7d8085 58%, #35373b 82%, #1a1b1d 100%)",
          boxShadow:
            "inset -14px -18px 40px rgba(0,0,0,0.55), inset 8px 10px 24px rgba(255,255,255,0.15), 0 0 60px -10px color-mix(in srgb, var(--color-silver-bright) 45%, transparent)",
        }}
      >
        {/* shine sweep */}
        <motion.div
          className="absolute inset-0 rounded-full overflow-hidden"
          style={{ mixBlendMode: "overlay" }}
        >
          <motion.div
            className="absolute -inset-y-1/2 w-1/3"
            animate={{ x: ["-120%", "220%"] }}
            transition={{ duration: 5, repeat: Infinity, repeatDelay: 3.5, ease: "easeInOut" }}
            style={{
              background: "linear-gradient(100deg, transparent, rgba(255,255,255,0.9), transparent)",
              filter: "blur(6px)",
            }}
          />
        </motion.div>

        {/* subtle craters */}
        <div
          className="absolute inset-0 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle at 60% 65%, rgba(0,0,0,0.35) 0%, transparent 8%), radial-gradient(circle at 45% 75%, rgba(0,0,0,0.25) 0%, transparent 6%), radial-gradient(circle at 70% 40%, rgba(0,0,0,0.2) 0%, transparent 10%)",
          }}
        />
      </motion.div>
    </motion.div>
  );
}
