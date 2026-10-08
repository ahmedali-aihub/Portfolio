import { motion } from "framer-motion";

const container = {
  hidden: {},
  visible: (stagger) => ({ transition: { staggerChildren: stagger } }),
};

const word = {
  hidden: { y: "115%" },
  visible: { y: "0%", transition: { duration: 0.95, ease: [0.16, 1, 0.3, 1] } },
};

// Headline whose words rise out of a clipped mask when scrolled into view.
export default function MaskText({
  text,
  as: Tag = "h2",
  className = "",
  stagger = 0.07,
  amount = 0.6,
}) {
  const MotionTag = motion[Tag] ?? motion.h2;

  return (
    <MotionTag
      aria-label={text}
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={container}
      custom={stagger}
    >
      {text.split(" ").map((w, i, all) => (
        <span key={i} aria-hidden="true" className="inline-block overflow-hidden align-bottom pb-[0.08em] -mb-[0.08em]">
          <motion.span variants={word} className="inline-block">
            {w}
            {i < all.length - 1 ? " " : ""}
          </motion.span>
        </span>
      ))}
    </MotionTag>
  );
}
