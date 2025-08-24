import { ArrowLeft } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';

function BackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    // Check if user navigated here via internal navigation
    // This is determined by:
    // 1. Presence of navigation state (set when using our navigate() calls)
    // 2. Browser history length > 1 AND not a direct page access/refresh
    
    const hasNavigationState = location.state && Object.keys(location.state).length > 0;
    
    // For a more reliable check, we'll primarily rely on navigation state
    // which we control when using navigate() in our app
    const shouldShowBack = hasNavigationState;
    
    setCanGoBack(shouldShowBack);
  }, [location]);

  const handleBack = () => {
    navigate(-1);
  };

  if (!canGoBack) {
    return null;
  }

  return (
    <button
      onClick={handleBack}
      className="flex items-center text-slate-600 hover:text-slate-900 font-medium text-sm transition-colors duration-200 mb-4"
    >
      <ArrowLeft className="w-4 h-4 mr-2" />
      Back
    </button>
  );
}

export default BackButton;
