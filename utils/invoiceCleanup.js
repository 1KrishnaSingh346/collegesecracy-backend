import fs from 'fs';
import path from 'path';
import cron from 'node-cron';

const INVOICE_DIR = path.join(process.cwd(), 'invoices');
const DAYS_OLD = 15; // Change to 30 if needed

// Run every day at 2:00 AM
cron.schedule('0 2 * * *', () => {
  console.log('🧹 Running invoice cleanup job...');

  fs.readdir(INVOICE_DIR, (err, files) => {
    if (err) return console.error('❌ Failed to read invoices folder:', err);

    files.forEach(file => {
      const filePath = path.join(INVOICE_DIR, file);

      fs.stat(filePath, (err, stats) => {
        if (err) return console.error(`❌ Error reading file stats for ${file}:`, err);

        const now = Date.now();
        const modifiedTime = new Date(stats.mtime).getTime();
        const ageInDays = (now - modifiedTime) / (1000 * 60 * 60 * 24);

        if (ageInDays > DAYS_OLD) {
          fs.unlink(filePath, err => {
            if (err) console.error(`❌ Failed to delete ${file}:`, err);
            else console.log(`✅ Deleted old invoice: ${file}`);
          });
        }
      });
    });
  });
});
