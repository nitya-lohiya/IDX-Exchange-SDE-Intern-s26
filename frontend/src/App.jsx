import { BrowserRouter, Routes, Route } from "react-router-dom";
import ErrorBoundary from "./components/ErrorBoundary";
import ListingsPage from "./pages/ListingsPage";
import PropertyDetailPage from "./pages/PropertyDetailPage";
import FavoritesPage from "./pages/FavoritesPage";

export default function App() {
  return (
    <BrowserRouter>
      {/* Inside the router so the recovery UI can still link around the app. */}
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<ListingsPage />} />
          <Route path="/property/:id" element={<PropertyDetailPage />} />
          <Route path="/favorites" element={<FavoritesPage />} />
        </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}
