import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { store } from "./store/store";
import ErrorBoundary from "./components/common/ErrorBoundary";
import App from "./App";
import "./i18n"; // Initialize i18n before rendering
import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <MemoryRouter>
          <App />
        </MemoryRouter>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>
);
