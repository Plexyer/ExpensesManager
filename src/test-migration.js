// Test script to run migration
import { invoke } from '@tauri-apps/api/core';

async function testMigration() {
  try {
    console.log('Running migration...');
    const result = await invoke('run_migration');
    console.log('Migration result:', result);
    
    console.log('Testing global categories...');
    const categories = await invoke('get_global_categories');
    console.log('Global categories:', categories);
    
    console.log('Testing budget templates...');
    const templates = await invoke('get_budget_templates');
    console.log('Budget templates:', templates);
    
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test
testMigration();
