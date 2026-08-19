import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import { SignInPage, SignUpPage } from "./pages/AuthPages";
import ChatApp from "./components/chat/ChatApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(<StrictMode><AuthProvider><BrowserRouter><Routes><Route path="/signin" element={<SignInPage />} /><Route path="/signup" element={<SignUpPage />} /><Route element={<ProtectedRoute />}><Route path="/homepage" element={<ChatApp />} /></Route><Route path="*" element={<Navigate to="/homepage" replace />} /></Routes></BrowserRouter></AuthProvider></StrictMode>);
