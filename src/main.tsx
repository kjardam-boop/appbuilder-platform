import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initEventListeners } from "@/shared/events";

// Initialize event listeners on app startup
initEventListeners();

createRoot(document.getElementById("root")!).render(<App />);
