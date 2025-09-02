import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import App from "./App";
import { store } from "./store/store";
import Dashboard from "./components/features/Dashboard/Dashboard";
import BudgetGrid from "./components/features/BudgetGrid/BudgetGrid";
import TemplatesPage from "./components/features/Templates/TemplatesPage";
import CategoriesPage from "./components/CategoriesPage";
import Settings from "./pages/Settings";
import "./index.css";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: "budget", element: <BudgetGrid /> },
      { path: "categories", element: <CategoriesPage /> },
      { path: "templates", element: <TemplatesPage /> },
      { path: "settings", element: <Settings /> },
    ],
  },
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <Provider store={store}>
      <RouterProvider router={router} />
    </Provider>
  </React.StrictMode>,
);
