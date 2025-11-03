// Test script to verify nodemailer configuration
require('dotenv').config({ path: '.env.local' });
const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing nodemailer configuration...\n');
  
  console.log('SMTP Configuration:');
  console.log('- Host:', process.env.SMTP_HOST);
  console.log('- Port:', process.env.SMTP_PORT);
  console.log('- User:', process.env.SMTP_USER);
  console.log('- From:', process.env.EMAIL_FROM);
  console.log('- Password:', process.env.SMTP_PASSWORD ? '***configured***' : 'MISSING');
  console.log('');

  try {
    // Create transporter
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    console.log('Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully!\n');

    // Send test email
    console.log('Sending test email...');
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: process.env.SMTP_USER, // Send to yourself for testing
      subject: '💊 Test Medication Reminder',
      text: 'This is a test email from your medication reminder system.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #001d3d 0%, #003566 100%); color: white; padding: 20px; text-align: center; border-radius: 8px;">
            <h1 style="margin: 0;">💊 Test Medication Reminder</h1>
          </div>
          <div style="padding: 20px; background-color: #f8f9fa; margin-top: 20px; border-radius: 8px;">
            <p>This is a test email from your medication reminder system.</p>
            <p><strong>If you received this, your nodemailer configuration is working correctly!</strong></p>
          </div>
        </div>
      `,
    });

    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('\n📧 Check your inbox at:', process.env.SMTP_USER);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    
    console.log('\n🔧 Troubleshooting tips:');
    console.log('1. Verify your Gmail App Password is correct');
    console.log('2. Make sure 2-factor authentication is enabled on your Google account');
    console.log('3. Check that "Less secure app access" is not blocking the connection');
    console.log('4. Verify the email address is correct');
  }
}

testEmail();
