import { useState } from "react";
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
  const [loaded, setLoaded] = useState(false);

  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      <Preloader onComplete={() => setLoaded(true)} />
      <div className="noise-overlay" />
      <CustomCursor />
      <CommandPalette />
      <ChatBot />

      <div
        style={{
          opacity: loaded ? 1 : 0,
          transition: "opacity 0.8s ease",
        }}
      >
        <Navbar />
        <main>
          <Hero loaded={loaded} />
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
