import fs from 'fs/promises';
import path from 'path';
import { recalculateNetGains } from '../src/utils/netGainsCalculator';
import type { DailyPortfolioRecord } from '../src/utils/portfolioHistory';

/**
 * Migration script to recompute net gains for all history files
 * using the standardized formula: total_portfolio - capital_invertido
 */
async function migrateNetGains(): Promise<void> {
  try {
    const historyDir = path.join(process.cwd(), 'data', 'history');
    
    // Check if history directory exists
    try {
      await fs.access(historyDir);
    } catch {
      console.log('History directory does not exist. No files to migrate.');
      return;
    }
    
    // Get all JSON files in the history directory
    const files = await fs.readdir(historyDir);
    const jsonFiles = files.filter(file => file.endsWith('.json'));
    
    if (jsonFiles.length === 0) {
      console.log('No history files found to migrate.');
      return;
    }
    
    console.log(`Found ${jsonFiles.length} history files to migrate.`);
    
    let totalRecords = 0;
    let updatedRecords = 0;
    
    for (const file of jsonFiles) {
      const filePath = path.join(historyDir, file);
      const username = file.replace('.json', '');
      
      try {
        // Read the file
        const fileContent = await fs.readFile(filePath, 'utf-8');
        const history: DailyPortfolioRecord[] = JSON.parse(fileContent);
        
        if (!Array.isArray(history)) {
          console.warn(`Skipping ${file}: Invalid format (not an array)`);
          continue;
        }
        
        totalRecords += history.length;
        let fileUpdated = false;
        
        // Process each record
        for (const record of history) {
          // Calculate net gains using standardized formula
          const netGains = recalculateNetGains(record);
          
          // Check if the values need to be updated
          const needsUpdate = 
            record.ganancias_netas_ars !== netGains.ARS ||
            record.ganancias_netas_usd !== netGains.USD;
          
          if (needsUpdate) {
            record.ganancias_netas_ars = netGains.ARS;
            record.ganancias_netas_usd = netGains.USD;
            updatedRecords++;
            fileUpdated = true;
          }
        }
        
        // Write back to file if any records were updated
        if (fileUpdated) {
          await fs.writeFile(filePath, JSON.stringify(history, null, 2));
          console.log(`✓ Updated ${username}: ${history.length} records`);
        } else {
          console.log(`- No changes needed for ${username}: ${history.length} records`);
        }
        
      } catch (error) {
        console.error(`Error processing ${file}:`, error);
      }
    }
    
    console.log('\nMigration completed!');
    console.log(`Total records processed: ${totalRecords}`);
    console.log(`Records updated: ${updatedRecords}`);
    console.log(`Files processed: ${jsonFiles.length}`);
    
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateNetGains()
    .then(() => {
      console.log('Migration script completed successfully.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateNetGains }; 