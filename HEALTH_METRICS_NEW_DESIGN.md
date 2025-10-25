# Health Metrics - New Tab-Based Design

## Overview
The HealthMetricsClient.tsx file has become corrupted with duplicate code. Here's what the new design should look like:

## New Design Features

### 1. Metric Tabs (Like Your Image)
- Horizontal tabs for each metric type
- Click a tab to view that metric's graph
- Active tab highlighted in blue
- Tabs: Blood Pressure | Blood Sugar | Weight | Heart Rate | Temperature | Oxygen Level | Sleep Hours

### 2. Single Large Graph
- One big graph showing selected metric
- Full width of container
- Height: 400px
- Shows values on data points when hovering
- Date format: MM/DD/YYYY

### 3. Data Table Below Graph
- List of all readings for selected metric
- Shows: Value, Date/Time, Notes (if any)
- Delete button (red trash icon) for each reading
- Hover effect on rows

### 4. Key Changes Needed

The file needs to be cleaned up. Here's the structure:

```typescript
// State
const [selectedMetricType, setSelectedMetricType] = useState('blood_pressure');

// Dashboard Section
{activeTab === 'dashboard' && (
  <div>
    {/* Metric Tabs */}
    <div className="flex gap-2">
      <button onClick={() => setSelectedMetricType('blood_pressure')}>
        Blood Pressure
      </button>
      {/* ... other tabs */}
    </div>

    {/* Single Large Chart */}
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={getMetricsByType(selectedMetricType)}>
        {/* Chart config */}
      </LineChart>
    </ResponsiveContainer>

    {/* Data Table */}
    <div>
      {getMetricsByType(selectedMetricType).map(metric => (
        <div key={metric._id}>
          {/* Value, Date, Delete button */}
        </div>
      ))}
    </div>
  </div>
)}
```

## Current File Status
- File backed up to: HealthMetricsClient.tsx.backup
- File has duplicate dashboard sections
- Needs complete rewrite of dashboard section (lines 323-850 approx)

## Solution
The file needs manual cleanup to remove duplicate code sections. The backup is saved if needed.

## What Works
- Add Metric tab
- Medications tab
- API endpoints
- Delete functionality
- Data fetching

## What Needs Fixing
- Dashboard section has duplicate code
- Remove old card-based layout
- Remove old multiple charts layout
- Keep only: Tabs + Single Chart + Data Table
