# Medication Reminder System - Setup Guide

## Overview
The medication reminder system allows users to:
- Add medications with multiple time slots per day
- Receive email reminders 5 minutes before each scheduled time
- Mark medications as taken via email or web dashboard
- Track medication adherence over time

## Features Implemented

### 1. Add Medication Form
- **Medication Name**: Text input for medication name
- **Frequency**: Dropdown to select 1-5 times per day
- **Multiple Time Slots**: Dynamic time inputs based on frequency
- **Start Date & End Date**: Date pickers for medication schedule
- **Notes**: Optional instructions field
- **Reminder Toggle**: Enable/disable email reminders

### 2. Medication Dashboard
- View all active medications
- See today's schedule with time slots
- Visual status indicators (Taken/Pending)
- "Mark as Taken" buttons for each time slot
- Color-coded status (Green for taken, Yellow for pending)

### 3. Email Reminder System
- Automated emails sent 5 minutes before scheduled time
- Beautiful HTML email template with brand colors
- "Mark as Taken" button in email
- Medication name and scheduled time included

### 4. Tracking System
- `MedicationLog` model tracks each dose
- Records when medication was marked as taken
- Stores status: pending, taken, or missed
- Queryable by date range

## Database Models

### Medication Model
```typescript
{
  userId: string;
  name: string;
  frequency: string; // "1", "2", "3", etc.
  timeOfDay: string[]; // ["08:00", "14:00", "20:00"]
  startDate: Date;
  endDate?: Date;
  notes?: string;
  reminderEnabled: boolean;
  active: boolean;
}
```

### MedicationLog Model
```typescript
{
  userId: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string; // "08:00"
  scheduledDate: Date;
  takenAt?: Date;
  status: 'pending' | 'taken' | 'missed';
}
```

## API Endpoints

### 1. Medications CRUD
- `GET /api/medications` - Get all medications
- `POST /api/medications` - Add new medication
- `PATCH /api/medications` - Update medication
- `DELETE /api/medications` - Delete medication

### 2. Medication Tracking
- `POST /api/medications/mark-taken` - Mark medication as taken
- `GET /api/medications/mark-taken` - Get medication logs

### 3. Email Reminders
- `POST /api/medications/send-reminders` - Send reminder emails (cron job)
- `GET /api/medications/send-reminders` - Test endpoint to check upcoming reminders

## Email Service Setup

The system supports multiple email providers. Configure one of the following:

### Option 1: Resend (Recommended)
```env
RESEND_API_KEY=your_resend_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Option 2: SendGrid
```env
SENDGRID_API_KEY=your_sendgrid_api_key
EMAIL_FROM=noreply@yourdomain.com
```

### Option 3: SMTP (Nodemailer)
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
EMAIL_FROM=your_email@gmail.com
```

### Development Mode
If no email service is configured, reminders will be logged to the console.

## Cron Job Setup

The email reminder system requires a cron job to run every minute.

### Option 1: Vercel Cron (Recommended for Vercel deployments)
Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/medications/send-reminders",
    "schedule": "* * * * *"
  }]
}
```

### Option 2: External Cron Service (cron-job.org, EasyCron, etc.)
Set up a cron job to hit:
```
POST https://yourdomain.com/api/medications/send-reminders
Authorization: Bearer YOUR_CRON_SECRET
```

### Option 3: Node-cron (Self-hosted)
Install: `npm install node-cron`

Create `lib/cron.ts`:
```typescript
import cron from 'node-cron';

export function startMedicationReminderCron() {
  cron.schedule('* * * * *', async () => {
    try {
      await fetch('http://localhost:3000/api/medications/send-reminders', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`,
        },
      });
    } catch (error) {
      console.error('Cron job error:', error);
    }
  });
}
```

## Environment Variables

Add these to your `.env.local` file:

```env
# Database
MONGODB_URI=your_mongodb_connection_string

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Email Service (choose one)
RESEND_API_KEY=your_resend_api_key
# OR
SENDGRID_API_KEY=your_sendgrid_api_key
# OR
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email
SMTP_PASSWORD=your_password

# Email Configuration
EMAIL_FROM=noreply@yourdomain.com

# Cron Security
CRON_SECRET=your_random_secret_key
```

## Testing the System

### 1. Test Adding Medication
1. Go to Health Metrics page
2. Click "Medications" tab
3. Click "Add Medication"
4. Fill in the form with multiple time slots
5. Submit

### 2. Test Mark as Taken
1. View your medications list
2. Click "Mark as Taken" for a time slot
3. The status should change to "Taken" with a green checkmark

### 3. Test Email Reminders
1. Add a medication with a time slot 6 minutes from now
2. Wait for the cron job to run
3. Check your email for the reminder
4. Click "Mark as Taken" in the email

### 4. Test Reminder Endpoint
```bash
curl http://localhost:3000/api/medications/send-reminders
```

This will show which medications would receive reminders.

## UI Features

### Brand Colors Used
- Primary Dark: `#000814`, `#001d3d`, `#003566`
- Accent Yellow: `#ffc300`, `#ffd60a`

### Visual Indicators
- **Pending**: Yellow badge with dose number
- **Taken**: Green badge with checkmark
- **Reminder Enabled**: Yellow background with bell icon

### Responsive Design
- Mobile-friendly layout
- Touch-friendly buttons
- Collapsible medication cards

## Troubleshooting

### Emails Not Sending
1. Check email service API key is correct
2. Verify `EMAIL_FROM` is a verified sender
3. Check console logs for error messages
4. Test with development mode (console logging)

### Cron Job Not Running
1. Verify cron job is configured correctly
2. Check `CRON_SECRET` matches in both places
3. Test the endpoint manually with curl
4. Check server logs

### Mark as Taken Not Working
1. Check browser console for errors
2. Verify user is authenticated
3. Check medication ID is valid
4. Verify database connection

## Future Enhancements

Potential improvements:
- SMS reminders via Twilio
- Push notifications
- Medication history charts
- Adherence statistics
- Missed dose alerts
- Refill reminders
- Drug interaction warnings
- Photo upload for medication

## Support

For issues or questions, check:
1. Console logs in browser (F12)
2. Server logs in terminal
3. Database connection status
4. Email service status page
