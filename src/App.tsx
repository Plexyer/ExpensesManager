import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Calculator, FileText, Settings } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-2xl font-bold text-slate-900">Budget Manager</h1>
            <nav className="hidden md:flex space-x-4">
              <NavLink to="/budget" className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm">Open Budget</NavLink>
            </nav>
          </div>
        </div>
      </header>
      <div className="flex">
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen">
          <nav className="p-4 space-y-2">
            <NavLink to="/" end className={({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
              <LayoutDashboard className="w-5 h-5 mr-3 text-slate-500" />
              Dashboard
            </NavLink>
            <NavLink to="/budget" className={({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Calculator className="w-5 h-5 mr-3 text-slate-500" />
              Budget Grid
            </NavLink>
            <NavLink to="/templates" className={({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
              <FileText className="w-5 h-5 mr-3 text-slate-500" />
              Templates
            </NavLink>
            <NavLink to="/settings" className={({ isActive }) => `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'}`}>
              <Settings className="w-5 h-5 mr-3 text-slate-500" />
              Settings
            </NavLink>
          </nav>
        </aside>
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
