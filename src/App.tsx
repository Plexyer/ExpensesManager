import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Welcome to Tauri + React</h1>

      <div className="flex space-x-8 mb-8">
        <a href="https://vitejs.dev" target="_blank" className="hover:scale-110 transition-transform">
          <img src="/vite.svg" className="h-16 w-16" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank" className="hover:scale-110 transition-transform">
          <img src="/tauri.svg" className="h-16 w-16" alt="Tauri logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" className="hover:scale-110 transition-transform">
          <img src={reactLogo} className="h-16 w-16 animate-spin" alt="React logo" />
        </a>
      </div>
      <p className="text-gray-600 mb-8">Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="flex flex-col sm:flex-row gap-4 items-center"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button 
          type="submit"
          className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
          Greet
        </button>
      </form>
      {greetMsg && (
        <p className="mt-4 text-lg text-green-600 font-semibold">{greetMsg}</p>
      )}
    </main>
  );
}

export default App;
