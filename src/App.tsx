import { Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SettingsPage from "./pages/SettingsPage";

const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  );
};

export default App;
