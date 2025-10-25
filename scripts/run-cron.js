// Simple cron job runner for local development
// This will check for medication reminders every minute

const CRON_SECRET = 'med_reminder_cron_2025_secure_key_xyz789';
const API_URL = 'http://localhost:3000/api/medications/send-reminders';

async function runCronJob() {
  try {
    console.log(`[${new Date().toLocaleTimeString()}] Checking for medication reminders...`);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    
    if (data.success) {
      console.log(`✓ Checked at ${data.currentTime}, reminders for ${data.reminderTime}`);
      if (data.remindersSent > 0) {
        console.log(`📧 Sent ${data.remindersSent} reminder(s)!`);
        console.log('Details:', data.details);
      } else {
        console.log('  No reminders to send at this time.');
      }
    } else {
      console.error('✗ Error:', data.error);
    }
  } catch (error) {
    console.error('✗ Failed to run cron job:', error.message);
  }
}

// Run immediately
runCronJob();

// Then run every minute
setInterval(runCronJob, 60000);

console.log('🕐 Medication reminder cron job started!');
console.log('   Checking every minute for reminders...');
console.log('   Press Ctrl+C to stop\n');
