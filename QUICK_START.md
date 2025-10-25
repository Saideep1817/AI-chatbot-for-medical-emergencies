# Medication Reminder System - Quick Start Guide

## 🚀 Get Started in 3 Steps

### Step 1: Configure Email Service (5 minutes)

Choose the easiest option for you:

#### Option A: Resend (Recommended - Easiest)
1. Go to [resend.com](https://resend.com) and sign up
2. Get your API key from the dashboard
3. Add to `.env.local`:
```env
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
CRON_SECRET=any_random_string_here
```

#### Option B: SendGrid
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key
3. Add to `.env.local`:
```env
SENDGRID_API_KEY=SG.your_api_key_here
EMAIL_FROM=noreply@yourdomain.com
CRON_SECRET=any_random_string_here
```

#### Option C: Skip Email (Testing Only)
Just add to `.env.local`:
```env
CRON_SECRET=test123
```
Reminders will log to console instead of sending emails.

---

### Step 2: Set Up Cron Job (2 minutes)

#### If Deploying to Vercel:
✅ Already done! The `vercel.json` file is configured.

#### If Using Another Platform:
1. Go to [cron-job.org](https://cron-job.org)
2. Create a free account
3. Add a new cron job:
   - **URL**: `https://yourdomain.com/api/medications/send-reminders`
   - **Schedule**: Every 1 minute (`* * * * *`)
   - **HTTP Method**: POST
   - **Headers**: 
     - `Authorization: Bearer YOUR_CRON_SECRET`
     - `Content-Type: application/json`

---

### Step 3: Test It! (3 minutes)

1. **Start your app**:
```bash
npm run dev
```

2. **Add a test medication**:
   - Go to: http://localhost:3000/health-metrics
   - Click "Medications" tab
   - Click "Add Medication"
   - Fill in:
     - Name: "Test Medication"
     - Frequency: "Twice daily"
     - Times: Set one time to 5 minutes from now
     - Start Date: Today
     - Enable reminders: ✓
   - Click "Add Medication"

3. **Wait and check**:
   - In 5 minutes, check your email (or console if no email service)
   - You should receive a reminder!
   - Click "Mark as Taken" in the email or on the dashboard
   - See the status change to green ✓

---

## 📱 How to Use

### Adding a Medication

1. Navigate to **Health Metrics** page
2. Click **"Medications"** tab
3. Click **"+ Add Medication"** button
4. Fill in the form:
   - **Medication Name**: e.g., "Aspirin"
   - **Frequency**: Select how many times per day (1-5)
   - **Time Slots**: Set the specific times
   - **Start Date**: When to begin
   - **End Date**: (Optional) When to stop
   - **Notes**: (Optional) Special instructions
   - **Enable reminders**: Toggle on for email reminders
5. Click **"Add Medication"**

### Marking as Taken

**Method 1 - From Dashboard**:
1. Go to Medications tab
2. Find your medication
3. Click **"Mark as Taken"** button next to the time slot
4. Status changes to green checkmark ✓

**Method 2 - From Email**:
1. Receive reminder email (5 minutes before time)
2. Click **"Mark as Taken"** button in email
3. Status updates automatically

### Viewing Status

- **Green checkmark** = Taken ✓
- **Yellow badge** = Pending ⏰
- Each time slot shows its own status

---

## 🎯 Common Use Cases

### Daily Medication
```
Name: Blood Pressure Medication
Frequency: Once daily
Time: 08:00 AM
```

### Multiple Times Per Day
```
Name: Antibiotic
Frequency: Three times daily
Times: 08:00 AM, 02:00 PM, 08:00 PM
```

### Short-Term Course
```
Name: Pain Medication
Frequency: Twice daily
Times: 09:00 AM, 09:00 PM
Start: Today
End: 7 days from now
```

---

## 🔧 Troubleshooting

### Not Receiving Emails?

**Check 1**: Email service configured?
```bash
# Look in .env.local for:
RESEND_API_KEY=...
# or
SENDGRID_API_KEY=...
```

**Check 2**: Cron job running?
- Test: `curl http://localhost:3000/api/medications/send-reminders`
- Should return JSON with current time and medications

**Check 3**: Email address correct?
- Check your user profile has valid email
- Check spam folder

### Mark as Taken Not Working?

**Check 1**: Logged in?
- Must be authenticated to mark medications

**Check 2**: Browser console errors?
- Press F12, check Console tab
- Look for red error messages

**Check 3**: Database connected?
- Check terminal for MongoDB connection errors

### Cron Job Not Running?

**For Vercel**:
- Cron jobs only work in production, not local dev
- Deploy to Vercel to test

**For Other Platforms**:
- Check cron-job.org dashboard
- Verify URL is correct
- Check Authorization header matches CRON_SECRET

---

## 📊 What Gets Tracked?

For each medication dose, the system tracks:
- ✅ Medication name
- ✅ Scheduled time
- ✅ Scheduled date
- ✅ Whether it was taken
- ✅ Exact timestamp when marked as taken
- ✅ Status (pending/taken/missed)

---

## 🎨 UI Features

### Modern Design
- Gradient backgrounds with your brand colors
- Smooth animations and transitions
- Responsive layout (works on mobile)
- Touch-friendly buttons

### Visual Indicators
- 💊 Medication icon
- 🟡 Yellow = Pending dose
- 🟢 Green = Taken dose
- 🔔 Bell = Reminders enabled

### Color Scheme
- Dark blues: #000814, #001d3d, #003566
- Bright yellows: #ffc300, #ffd60a

---

## 💡 Pro Tips

1. **Set realistic times**: Choose times you'll actually be awake
2. **Use notes**: Add instructions like "with food" or "before bed"
3. **Enable reminders**: Don't rely on memory alone
4. **Check daily**: Review your medication list each morning
5. **Update end dates**: Set end dates for short-term medications

---

## 🆘 Need Help?

1. Check `MEDICATION_REMINDER_SETUP.md` for detailed setup
2. Check `MEDICATION_FEATURE_SUMMARY.md` for technical details
3. Look at browser console (F12) for errors
4. Check server terminal for backend errors

---

## ✅ Quick Checklist

Before going live:

- [ ] Email service configured and tested
- [ ] Cron job set up and running
- [ ] Test medication added
- [ ] Reminder received successfully
- [ ] Mark as taken works from dashboard
- [ ] Mark as taken works from email
- [ ] Status updates correctly
- [ ] UI looks good on mobile

---

## 🎉 You're All Set!

The medication reminder system is ready to use. Add your medications and never miss a dose again!

**Questions?** Check the detailed documentation files:
- `MEDICATION_REMINDER_SETUP.md` - Complete setup guide
- `MEDICATION_FEATURE_SUMMARY.md` - Feature overview
- `env.example.txt` - Environment variables reference
