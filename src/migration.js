import { invoke } from '@tauri-apps/api/core';

// Simple migration script to run the SQL
const runMigration = async () => {
    try {
        // We'll create a special command for this
        await invoke('run_migration');
        console.log('Migration completed successfully');
    } catch (error) {
        console.error('Migration failed:', error);
    }
};

runMigration();
