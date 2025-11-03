// Quick script to check users in database
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function checkUsers() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));
    
    const users = await User.find({});
    
    console.log(`Found ${users.length} users in database:\n`);
    
    if (users.length === 0) {
      console.log('❌ No users found!');
      console.log('\nThis means you need to sign up or your user wasn\'t saved.');
      console.log('Try logging out and signing up again.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. Email: ${user.email}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   Name: ${user.name || 'N/A'}`);
        console.log('');
      });
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error.message);
  }
}

checkUsers();
