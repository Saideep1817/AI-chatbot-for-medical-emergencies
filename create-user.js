// Script to create a user in the database
require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function createUser() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected!\n');

    const UserSchema = new mongoose.Schema({
      name: String,
      email: { type: String, unique: true, required: true },
      password: String,
      provider: { type: String, default: 'credentials' },
    }, { timestamps: true });

    const User = mongoose.models.User || mongoose.model('User', UserSchema);
    
    // Check if user already exists
    const existingUser = await User.findOne({ email: 'kondurusaideep6@gmail.com' });
    
    if (existingUser) {
      console.log('✅ User already exists!');
      console.log('Email:', existingUser.email);
      console.log('Name:', existingUser.name);
      console.log('ID:', existingUser._id);
    } else {
      // Create new user
      console.log('Creating user: kondurusaideep6@gmail.com');
      
      const hashedPassword = await bcrypt.hash('password123', 10); // Change this password!
      
      const newUser = await User.create({
        name: 'Saideep',
        email: 'kondurusaideep6@gmail.com',
        password: hashedPassword,
        provider: 'credentials',
      });
      
      console.log('\n✅ User created successfully!');
      console.log('Email:', newUser.email);
      console.log('Name:', newUser.name);
      console.log('ID:', newUser._id);
      console.log('\n⚠️  Default password: password123');
      console.log('You can log in with this email and password.');
    }
    
    await mongoose.disconnect();
    console.log('\n✅ Done!');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createUser();
