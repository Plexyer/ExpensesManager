import { NavLink, Outlet } from "react-router-dom";
import { LayoutDashboard, Calculator, FileText, Settings, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { TimezoneProvider } from './contexts/TimezoneContext';

function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard", end: true },
    { to: "/budget", icon: Calculator, label: "Budgets" },
    { to: "/templates", icon: FileText, label: "Templates" },
    { to: "/settings", icon: Settings, label: "Settings" },
  ];

  return (
    <TimezoneProvider>
      <div className="min-h-screen bg-slate-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/25 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      <header className="bg-white border-b border-slate-200 shadow-sm relative z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              {/* Mobile Menu Button */}
              <button 
                className="lg:hidden p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100 mr-3"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
              
              <h1 className="text-2xl font-bold text-slate-900">Budget Manager</h1>
            </div>
          </div>
        </div>
      </header>
      
      <div className="flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 bg-white border-r border-slate-200 min-h-screen">
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink 
                  key={item.to}
                  to={item.to} 
                  end={item.end}
                  className={({ isActive }) => 
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon className="w-5 h-5 mr-3 text-slate-500" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Mobile Sidebar */}
        <aside className={`
          fixed left-0 top-0 w-64 h-full bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out lg:hidden
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Mobile Sidebar Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Navigation</h2>
            <button 
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {/* Mobile Navigation Items */}
          <nav className="p-4 space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink 
                  key={item.to}
                  to={item.to} 
                  end={item.end}
                  className={({ isActive }) => 
                    `flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive ? 'bg-blue-100 text-blue-700' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                    }`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="w-5 h-5 mr-3 text-slate-500" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
      </div>
    </TimezoneProvider>
  );
}

export default App;
