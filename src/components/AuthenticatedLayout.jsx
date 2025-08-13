// components/AuthenticatedLayout.jsx
import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";

export default function AuthenticatedLayout() {
  return (
    <div style={{ minHeight: "100vh", background:"#fafbfc" }}>
      <Navbar />
      <main style={{ padding: "1rem" }}>
        <Outlet />
      </main>
    </div>
  );
}
