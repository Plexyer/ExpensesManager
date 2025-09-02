import React, { useState } from 'react';
import { Database, CheckCircle, AlertCircle } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface MigrationRunnerProps {
  onMigrationComplete: () => void;
}

const MigrationRunner: React.FC<MigrationRunnerProps> = ({ onMigrationComplete }) => {
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runMigration = async () => {
    try {
      setRunning(true);
      setError(null);
      await invoke('run_migration');
      onMigrationComplete();
    } catch (err) {
      setError(err as string);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200">
      <div className="flex items-center mb-4">
        <Database className="w-6 h-6 text-blue-600 mr-3" />
        <h2 className="text-xl font-semibold text-gray-900">Database Setup Required</h2>
      </div>
      
      <p className="text-gray-600 mb-6">
        The template system needs to be set up in your database. This is a one-time setup that will create the necessary tables and default categories.
      </p>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md flex items-center">
          <AlertCircle className="w-5 h-5 text-red-600 mr-3" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <button
        onClick={runMigration}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {running ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Setting up database...
          </>
        ) : (
          <>
            <CheckCircle className="w-4 h-4" />
            Setup Database
          </>
        )}
      </button>
    </div>
  );
};

export default MigrationRunner;
