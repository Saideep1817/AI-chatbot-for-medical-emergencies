// Email service for sending medication reminders
// This uses a simple approach with nodemailer or can be configured with services like SendGrid, Resend, etc.

import nodemailer from 'nodemailer';

interface MedicationReminderParams {
  to: string;
  medicationName: string;
  scheduledTime: string;
  medicationId: string;
  userId: string;
  scheduledDate: string;
}

export async function sendMedicationReminderEmail(params: MedicationReminderParams) {
  const { to, medicationName, scheduledTime, medicationId, userId, scheduledDate } = params;

  // Generate the "Mark as Taken" URL
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const markAsTakenUrl = `${baseUrl}/api/medications/mark-taken?medicationId=${medicationId}&scheduledTime=${scheduledTime}&scheduledDate=${scheduledDate}&userId=${userId}`;

  // Email HTML content
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Medication Reminder</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #f5f5f5;
        }
        .container {
          background-color: #ffffff;
          border-radius: 12px;
          padding: 30px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #001d3d 0%, #003566 100%);
          color: white;
          padding: 20px;
          border-radius: 8px;
          text-align: center;
          margin-bottom: 30px;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
        }
        .icon {
          font-size: 48px;
          margin-bottom: 10px;
        }
        .content {
          padding: 20px 0;
        }
        .medication-info {
          background-color: #f8f9fa;
          border-left: 4px solid #ffc300;
          padding: 20px;
          margin: 20px 0;
          border-radius: 4px;
        }
        .medication-name {
          font-size: 24px;
          font-weight: bold;
          color: #001d3d;
          margin-bottom: 10px;
        }
        .scheduled-time {
          font-size: 20px;
          color: #003566;
          font-weight: 600;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #ffc300 0%, #ffd60a 100%);
          color: #000814;
          text-decoration: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-weight: bold;
          font-size: 16px;
          text-align: center;
          margin: 20px 0;
          box-shadow: 0 4px 6px rgba(255, 195, 0, 0.3);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(255, 195, 0, 0.4);
        }
        .footer {
          text-align: center;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #e0e0e0;
          color: #666;
          font-size: 14px;
        }
        .reminder-text {
          color: #666;
          font-size: 14px;
          margin-top: 20px;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="icon">💊</div>
          <h1>Medication Reminder</h1>
        </div>
        
        <div class="content">
          <p>Hello,</p>
          <p>This is a friendly reminder that it's almost time to take your medication.</p>
          
          <div class="medication-info">
            <div class="medication-name">${medicationName}</div>
            <div class="scheduled-time">⏰ Scheduled Time: ${scheduledTime}</div>
          </div>
          
          <p style="text-align: center;">
            <a href="${markAsTakenUrl}" class="button">
              ✓ Mark as Taken
            </a>
          </p>
          
          <p class="reminder-text">
            <strong>Note:</strong> This reminder is sent 5 minutes before your scheduled time. 
            Click the button above after taking your medication to track your adherence.
          </p>
        </div>
        
        <div class="footer">
          <p>This is an automated reminder from your Health Tracker app.</p>
          <p>If you have any questions, please contact your healthcare provider.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const textContent = `
Medication Reminder

Hello,

This is a friendly reminder that it's almost time to take your medication.

Medication: ${medicationName}
Scheduled Time: ${scheduledTime}

Mark as Taken: ${markAsTakenUrl}

This reminder is sent 5 minutes before your scheduled time.
Click the link above after taking your medication to track your adherence.

---
This is an automated reminder from your Health Tracker app.
If you have any questions, please contact your healthcare provider.
  `;

  // Check which email service is configured
  if (process.env.RESEND_API_KEY) {
    return await sendWithResend(to, medicationName, scheduledTime, htmlContent, textContent);
  } else if (process.env.SENDGRID_API_KEY) {
    return await sendWithSendGrid(to, medicationName, scheduledTime, htmlContent, textContent);
  } else if (process.env.SMTP_HOST) {
    return await sendWithNodemailer(to, medicationName, scheduledTime, htmlContent, textContent);
  } else {
    // Log to console if no email service is configured
    console.log('=== MEDICATION REMINDER EMAIL ===');
    console.log(`To: ${to}`);
    console.log(`Medication: ${medicationName}`);
    console.log(`Scheduled Time: ${scheduledTime}`);
    console.log(`Mark as Taken URL: ${markAsTakenUrl}`);
    console.log('================================');
    
    // Return success for development
    return { success: true, message: 'Email logged to console (no email service configured)' };
  }
}

// Resend implementation
async function sendWithResend(to: string, medicationName: string, scheduledTime: string, html: string, text: string) {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@healthtracker.com',
        to: [to],
        subject: `💊 Medication Reminder: ${medicationName} at ${scheduledTime}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending email with Resend:', error);
    throw error;
  }
}

// SendGrid implementation
async function sendWithSendGrid(to: string, medicationName: string, scheduledTime: string, html: string, text: string) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: process.env.EMAIL_FROM || 'noreply@healthtracker.com' },
        subject: `💊 Medication Reminder: ${medicationName} at ${scheduledTime}`,
        content: [
          { type: 'text/plain', value: text },
          { type: 'text/html', value: html },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`SendGrid API error: ${response.statusText}`);
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email with SendGrid:', error);
    throw error;
  }
}

// Nodemailer implementation
async function sendWithNodemailer(to: string, medicationName: string, scheduledTime: string, html: string, text: string) {
  try {
    // Create transporter with SMTP configuration
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Send email
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: to,
      subject: `💊 Medication Reminder: ${medicationName} at ${scheduledTime}`,
      text: text,
      html: html,
    });

    console.log('Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email with Nodemailer:', error);
    throw error;
  }
}
