// src/index.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import './styles/global.css';
import { Toaster } from "react-hot-toast"; // ✅ Import Toaster

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        {/* ✅ Toaster goes here at top-level */}
        <Toaster position="top-right" reverseOrder={false} />
        <App />
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);


