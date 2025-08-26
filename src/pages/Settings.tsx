import { useState } from 'react';
import { Clock, Save, Check } from 'lucide-react';
import { useTimezone, COMMON_TIMEZONES } from '../contexts/TimezoneContext';

function Settings() {
  const { timezone, setTimezone } = useTimezone();
  const [selectedTimezone, setSelectedTimezone] = useState(timezone);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      setTimezone(selectedTimezone);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save timezone:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const currentTime = new Date().toLocaleString('en-US', {
    timeZone: selectedTimezone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
        <p className="text-slate-600 mt-2">Customize your application preferences</p>
      </div>

      {/* Timezone Settings */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-slate-900">Timezone Settings</h2>
        </div>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="timezone-select" className="block text-sm font-medium text-slate-700 mb-2">
              Select Your Timezone
            </label>
            <select
              id="timezone-select"
              value={selectedTimezone}
              onChange={(e) => setSelectedTimezone(e.target.value)}
              className="w-full max-w-md px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {COMMON_TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>

          {/* Current Time Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <p className="text-sm font-medium text-slate-700 mb-1">Current time in selected timezone:</p>
            <p className="text-lg font-mono text-slate-900">{currentTime}</p>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={isSaving || selectedTimezone === timezone}
              className={`
                flex items-center px-4 py-2 rounded-lg font-medium transition-colors duration-200
                ${selectedTimezone === timezone 
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                }
                ${isSaving ? 'bg-blue-400 cursor-not-allowed' : ''}
              `}
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Timezone
                </>
              )}
            </button>
          </div>

          {/* Info Text */}
          <div className="text-sm text-slate-600">
            <p>Your timezone setting will be saved locally and used for displaying all dates and times throughout the application.</p>
          </div>
        </div>
      </div>

      {/* Other Settings Sections (Placeholder) */}
      <div className="bg-white rounded-lg shadow-financial border border-slate-200 p-6">
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Other Settings</h2>
        <p className="text-slate-600">Additional settings will be added here in future updates.</p>
      </div>
    </div>
  );
}

export default Settings;
