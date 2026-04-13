import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Header } from "./components/Header";
import { Footer } from "./components/Footer";
import { ScrollToTop } from "./components/ScrollToTop";
import { LangRouter } from "./components/LangRouter";
import { Home } from "./pages/Home";
import { Features } from "./pages/Features";
import { Download } from "./pages/Download";
import { Contact } from "./pages/Contact";
import { Imprint } from "./pages/Imprint";
import { Privacy } from "./pages/Privacy";

function AppRoutes() {
  return (
    <>
      <ScrollToTop />
      <Header />
      <main className="flex-1">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/features" element={<Features />} />
          <Route path="/download" element={<Download />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/imprint" element={<Imprint />} />
          <Route path="/privacy" element={<Privacy />} />
        </Routes>
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen flex flex-col">
        <Routes>
          <Route path="/de/*" element={<LangRouter lang="de"><AppRoutes /></LangRouter>} />
          <Route path="/ru/*" element={<LangRouter lang="ru"><AppRoutes /></LangRouter>} />
          {/* English = default, no prefix */}
          <Route path="*" element={<LangRouter lang="en"><AppRoutes /></LangRouter>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
