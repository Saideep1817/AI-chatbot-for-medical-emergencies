# How to Fix HealthMetricsClient.tsx

## Problem
The file has duplicate code sections causing build errors. My attempts to fix it have made it worse.

## Solution
You need to restore from a working version or manually fix it.

## Option 1: Restore from Git (RECOMMENDED)
If you have git:
```bash
git status
git checkout components/HealthMetricsClient.tsx
```

## Option 2: Manual Fix
The file has old dashboard card code mixed with new tab code. You need to:

1. Open `components/HealthMetricsClient.tsx`
2. Find line 525: `{activeTab === 'add' && (`
3. Delete everything from line 529 to approximately line 840
4. This section contains old duplicate dashboard cards
5. Keep only the correct "Add Health Metric" form that starts around line 850

## Option 3: Use Working Backup
If you have a backup from before I made changes, restore that.

## What the File Should Have

### Dashboard Section (lines 323-523)
- Metric type tabs (Blood Pressure, Blood Sugar, etc.)
- Single large chart
- Data table with delete buttons

### Add Section (lines 525+)
- Form to add new metrics
- Dropdown to select metric type
- Input fields for values

### Medications Section
- List of medications
- Add medication form

## Current Status
- File is corrupted with duplicate code
- Build fails with parsing errors
- Backup also has corrupted code

## Recommendation
Restore from git or an earlier backup before my changes, then I can implement the new tab-based design more carefully.
