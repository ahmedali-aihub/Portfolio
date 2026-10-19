import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { MotionConfig } from "framer-motion";
import "../index.css";
import CustomCursor from "../components/CustomCursor";
import ResumePage from "./ResumePage";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <CustomCursor />
      <ResumePage />
    </MotionConfig>
  </StrictMode>,
);
