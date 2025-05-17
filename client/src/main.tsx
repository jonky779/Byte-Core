import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Error handling has been moved to disable-error-overlay.js which is loaded in index.html

createRoot(document.getElementById("root")!).render(<App />);
