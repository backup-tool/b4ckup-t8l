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
          <Route path="/fr/*" element={<LangRouter lang="fr"><AppRoutes /></LangRouter>} />
          <Route path="/it/*" element={<LangRouter lang="it"><AppRoutes /></LangRouter>} />
          <Route path="/es/*" element={<LangRouter lang="es"><AppRoutes /></LangRouter>} />
          <Route path="/pt/*" element={<LangRouter lang="pt"><AppRoutes /></LangRouter>} />
          <Route path="/nl/*" element={<LangRouter lang="nl"><AppRoutes /></LangRouter>} />
          <Route path="/sv/*" element={<LangRouter lang="sv"><AppRoutes /></LangRouter>} />
          <Route path="/da/*" element={<LangRouter lang="da"><AppRoutes /></LangRouter>} />
          <Route path="/no/*" element={<LangRouter lang="no"><AppRoutes /></LangRouter>} />
          <Route path="/fi/*" element={<LangRouter lang="fi"><AppRoutes /></LangRouter>} />
          <Route path="/ro/*" element={<LangRouter lang="ro"><AppRoutes /></LangRouter>} />
          <Route path="/pl/*" element={<LangRouter lang="pl"><AppRoutes /></LangRouter>} />
          <Route path="/cs/*" element={<LangRouter lang="cs"><AppRoutes /></LangRouter>} />
          <Route path="/hu/*" element={<LangRouter lang="hu"><AppRoutes /></LangRouter>} />
          <Route path="/bg/*" element={<LangRouter lang="bg"><AppRoutes /></LangRouter>} />
          <Route path="/sr/*" element={<LangRouter lang="sr"><AppRoutes /></LangRouter>} />
          <Route path="/hr/*" element={<LangRouter lang="hr"><AppRoutes /></LangRouter>} />
          <Route path="/uk/*" element={<LangRouter lang="uk"><AppRoutes /></LangRouter>} />
          <Route path="/el/*" element={<LangRouter lang="el"><AppRoutes /></LangRouter>} />
          {/* English = default, no prefix */}
          <Route path="*" element={<LangRouter lang="en"><AppRoutes /></LangRouter>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
