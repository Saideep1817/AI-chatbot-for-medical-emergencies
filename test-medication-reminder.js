// Test script for the complete medication reminder flow
require('dotenv').config({ path: '.env.local' });

// Check if server is running on a different port
const BASE_URL = process.env.NEXTAUTH_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

async function testMedicationReminder() {
  console.log('🧪 Testing Medication Reminder System\n');
  console.log('Base URL:', BASE_URL);
  console.log('Cron Secret:', CRON_SECRET ? '***configured***' : '❌ MISSING');
  console.log('');

  // Step 1: Check what reminders would be sent now
  console.log('Step 1: Checking for pending reminders...');
  try {
    const response = await fetch(`${BASE_URL}/api/medications/send-reminders`);
    const data = await response.json();
    
    console.log('✅ Reminder check successful');
    console.log('Current Time:', data.currentTime);
    console.log('Reminder Time:', data.reminderTime);
    console.log('Medications Found:', data.medicationsFound);
    
    if (data.medications && data.medications.length > 0) {
      console.log('\nMedications that would receive reminders:');
      data.medications.forEach((med, index) => {
        console.log(`  ${index + 1}. ${med.name} at ${med.timeOfDay.join(', ')}`);
      });
    } else {
      console.log('\n⚠️  No medications scheduled for current time');
      console.log('💡 Tip: Add a medication with a time slot matching the current time');
    }
  } catch (error) {
    console.error('❌ Error checking reminders:', error.message);
    console.log('\n🔧 Make sure your dev server is running: npm run dev');
    return;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Step 2: Manually trigger reminder sending (requires auth)
  console.log('Step 2: Manually triggering reminder emails...');
  
  if (!CRON_SECRET) {
    console.log('❌ CRON_SECRET not found in .env.local');
    console.log('Cannot test manual trigger without CRON_SECRET');
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/medications/send-reminders`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
      },
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Reminder trigger successful');
      console.log('Current Time:', data.currentTime);
      console.log('Reminders Sent:', data.remindersSent);
      
      if (data.details && data.details.length > 0) {
        console.log('\n📧 Emails sent to:');
        data.details.forEach((detail, index) => {
          console.log(`  ${index + 1}. ${detail.email} - ${detail.medicationName} at ${detail.scheduledTime}`);
        });
        console.log('\n✅ Check your email inbox!');
      } else {
        console.log('\n⚠️  No reminders were sent');
        console.log('This is normal if no medications match the current time');
      }
    } else {
      console.error('❌ Error:', data.error);
      if (response.status === 401) {
        console.log('🔧 CRON_SECRET might be incorrect');
      }
    }
  } catch (error) {
    console.error('❌ Error triggering reminders:', error.message);
  }

  console.log('\n' + '='.repeat(60) + '\n');

  // Step 3: Instructions for testing
  console.log('📋 How to Test the Complete Flow:\n');
  console.log('1. Start your dev server: npm run dev');
  console.log('2. Go to http://localhost:3000');
  console.log('3. Navigate to Health Metrics → Medications');
  console.log('4. Add a medication with:');
  console.log('   - Name: Test Medication');
  console.log('   - Frequency: 1 time per day');
  
  const now = new Date();
  const testTime = new Date(now.getTime() + 1 * 60000); // 1 minute from now
  const testTimeStr = `${String(testTime.getHours()).padStart(2, '0')}:${String(testTime.getMinutes()).padStart(2, '0')}`;
  
  console.log(`   - Time: ${testTimeStr} (1 minute from now)`);
  console.log('   - Enable reminders: Yes');
  console.log('5. Wait 1 minute and run this script again');
  console.log('6. Check your email for the reminder');
  console.log('7. Click "Mark as Taken" in the email\n');
}

// Run the test
testMedicationReminder().catch(console.error);
