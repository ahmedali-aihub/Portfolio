import { useCallback, useState } from "react";
import { ReactLenis } from "lenis/react";
import Preloader from "./components/Preloader";
import CustomCursor from "./components/CustomCursor";
import CommandPalette from "./components/CommandPalette";
import ChatBot from "./components/ChatBot";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import MarqueeTicker from "./components/MarqueeTicker";
import About from "./components/About";
import CoreExpertise from "./components/CoreExpertise";
import TechStack from "./components/TechStack";
import Projects from "./components/Projects";
import Experience from "./components/Experience";
import Contact from "./components/Contact";
import Footer from "./components/Footer";

function App() {
  // `reveal` starts the site's entrance while the preloader is still
  // dissolving, so the two overlap into one continuous transition.
  const [reveal, setReveal] = useState(false);
  const [settled, setSettled] = useState(false);
  const handleReveal = useCallback(() => setReveal(true), []);
  const handleComplete = useCallback(() => setSettled(true), []);

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      <Preloader onReveal={handleReveal} onComplete={handleComplete} />
      <div className="noise-overlay" />
      <CustomCursor />
      <CommandPalette />
      <ChatBot />

      <div
        style={{
          opacity: reveal ? 1 : 0,
          transition: "opacity 1.2s cubic-bezier(0.22, 1, 0.36, 1)",
          willChange: settled ? "auto" : "opacity",
        }}
      >
        <Navbar />
        <main>
          <Hero loaded={reveal} />
          <MarqueeTicker />
          <About />
          <CoreExpertise />
          <TechStack />
          <Projects />
          <Experience />
          <Contact />
        </main>
        <Footer />
      </div>
    </ReactLenis>
  );
}

export default App;
