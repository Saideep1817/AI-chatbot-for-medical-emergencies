'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface HealthMetric {
  _id: string;
  type: 'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours';
  value: any;
  unit: string;
  notes?: string;
  recordedAt: string;
}

interface Medication {
  _id: string;
  name: string;
  frequency: string;
  timeOfDay: string[];
  startDate: string;
  endDate?: string;
  notes?: string;
  reminderEnabled: boolean;
  active: boolean;
}

interface MedicationLog {
  _id: string;
  medicationId: string;
  medicationName: string;
  scheduledTime: string;
  scheduledDate: string;
  takenAt?: string;
  status: 'pending' | 'taken' | 'missed';
}

export default function HealthMetricsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'medications'>('dashboard');
  const [selectedMetricType, setSelectedMetricType] = useState<'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours'>('blood_pressure');
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationLogs, setMedicationLogs] = useState<MedicationLog[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [metricType, setMetricType] = useState<'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours'>('blood_pressure');
  const [metricValue, setMetricValue] = useState<any>({});
  const [metricNotes, setMetricNotes] = useState('');
  
  // Medication form states
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    frequency: '1',
    timeOfDay: ['08:00'],
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: '',
    reminderEnabled: true,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (status === 'loading') return;
    if (!session) router.push('/auth/signin');
    else {
      loadMetrics();
      loadMedications();
      loadMedicationLogs();
    }
  }, [mounted, session, status, router]);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/health-metrics?days=30');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      } else {
        console.error('Failed to load metrics:', response.status, response.statusText);
        setMetrics([]);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMedications = async () => {
    try {
      const response = await fetch('/api/medications?active=true');
      if (response.ok) {
        const data = await response.json();
        setMedications(data.medications || []);
      } else {
        console.error('Failed to load medications:', response.status, response.statusText);
        setMedications([]);
      }
    } catch (error) {
      console.error('Failed to load medications:', error);
      setMedications([]);
    }
  };

  const loadMedicationLogs = async () => {
    try {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(today);
      endDate.setHours(23, 59, 59, 999);

      const response = await fetch(
        `/api/medications/mark-taken?startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (response.ok) {
        const data = await response.json();
        setMedicationLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to load medication logs:', error);
      setMedicationLogs([]);
    }
  };

  const addMetric = async () => {
    try {
      let value = metricValue;
      let unit = '';

      // Format value based on type
      if (metricType === 'blood_pressure') {
        if (!metricValue.systolic || !metricValue.diastolic) {
          alert('Please enter both systolic and diastolic values');
          return;
        }
        value = { systolic: parseInt(metricValue.systolic), diastolic: parseInt(metricValue.diastolic) };
        unit = 'mmHg';
      } else if (metricType === 'blood_sugar') {
        if (!metricValue.level) {
          alert('Please enter blood sugar level');
          return;
        }
        value = parseFloat(metricValue.level);
        unit = 'mg/dL';
      } else if (metricType === 'weight') {
        if (!metricValue.weight) {
          alert('Please enter weight');
          return;
        }
        value = parseFloat(metricValue.weight);
        unit = 'kg';
      } else if (metricType === 'heart_rate') {
        if (!metricValue.rate) {
          alert('Please enter heart rate');
          return;
        }
        value = parseInt(metricValue.rate);
        unit = 'bpm';
      } else if (metricType === 'temperature') {
        if (!metricValue.temp) {
          alert('Please enter temperature');
          return;
        }
        value = parseFloat(metricValue.temp);
        unit = '°F';
      } else if (metricType === 'oxygen_saturation') {
        if (!metricValue.spo2) {
          alert('Please enter oxygen saturation');
          return;
        }
        value = parseInt(metricValue.spo2);
        unit = '%';
      } else if (metricType === 'sleep_hours') {
        if (!metricValue.hours) {
          alert('Please enter sleep hours');
          return;
        }
        value = parseFloat(metricValue.hours);
        unit = 'hours';
      }

      const response = await fetch('/api/health-metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: metricType,
          value,
          unit,
          notes: metricNotes,
        }),
      });

      if (response.ok) {
        setMetricValue({});
        setMetricNotes('');
        loadMetrics();
        setActiveTab('dashboard');
      }
    } catch (error) {
      console.error('Failed to add metric:', error);
      alert('Failed to add metric');
    }
  };

  const addMedication = async () => {
    try {
      if (!medicationForm.name) {
        alert('Please enter medication name');
        return;
      }

      const response = await fetch('/api/medications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(medicationForm),
      });

      if (response.ok) {
        setMedicationForm({
          name: '',
          frequency: '1',
          timeOfDay: ['08:00'],
          startDate: new Date().toISOString().split('T')[0],
          endDate: '',
          notes: '',
          reminderEnabled: true,
        });
        setShowMedicationForm(false);
        loadMedications();
      }
    } catch (error) {
      console.error('Failed to add medication:', error);
      alert('Failed to add medication');
    }
  };

  const deleteMedication = async (id: string) => {
    if (!confirm('Are you sure you want to delete this medication?')) return;

    try {
      const response = await fetch(`/api/medications?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadMedications();
      }
    } catch (error) {
      console.error('Failed to delete medication:', error);
    }
  };

  const deleteMetric = async (id: string) => {
    if (!confirm('Are you sure you want to delete this reading?')) return;

    try {
      const response = await fetch(`/api/health-metrics?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        loadMetrics();
      }
    } catch (error) {
      console.error('Failed to delete metric:', error);
    }
  };

  const markMedicationAsTaken = async (medicationId: string, medicationName: string, scheduledTime: string) => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await fetch('/api/medications/mark-taken', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          medicationId,
          medicationName,
          scheduledTime,
          scheduledDate: today,
        }),
      });

      if (response.ok) {
        loadMedicationLogs();
      }
    } catch (error) {
      console.error('Failed to mark medication as taken:', error);
      alert('Failed to mark medication as taken');
    }
  };

  const getMedicationStatus = (medicationId: string, scheduledTime: string) => {
    const today = new Date().toISOString().split('T')[0];
    const log = medicationLogs.find(
      (log) =>
        log.medicationId === medicationId &&
        log.scheduledTime === scheduledTime &&
        log.scheduledDate.startsWith(today)
    );
    return log?.status || 'pending';
  };

  const getMetricsByType = (type: string) => {
    return metrics.filter(m => m.type === type).slice(0, 10).reverse();
  };

  const getLatestMetric = (type: string) => {
    const filtered = metrics.filter(m => m.type === type);
    return filtered.length > 0 ? filtered[0] : null;
  };

  if (status === 'loading' || !mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-gray-600 hover:text-gray-900"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Health Metrics</h1>
                <p className="text-sm text-gray-600">Track your health data and medications</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex space-x-2 border-b">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'dashboard'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            📊 Dashboard
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'add'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            ➕ Add Metric
          </button>
          <button
            onClick={() => setActiveTab('medications')}
            className={`px-4 py-2 font-medium ${
              activeTab === 'medications'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            💊 Medications
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Metric Type Tabs */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Health Metrics</h2>
              
              {/* Metric Selector Tabs */}
              <div className="flex flex-wrap gap-2 mb-6">
                <button
                  onClick={() => setSelectedMetricType('blood_pressure')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'blood_pressure'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Blood Pressure
                </button>
                <button
                  onClick={() => setSelectedMetricType('blood_sugar')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'blood_sugar'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Blood Sugar
                </button>
                <button
                  onClick={() => setSelectedMetricType('weight')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'weight'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Weight
                </button>
                <button
                  onClick={() => setSelectedMetricType('heart_rate')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'heart_rate'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Heart Rate
                </button>
                <button
                  onClick={() => setSelectedMetricType('temperature')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'temperature'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Temperature
                </button>
                <button
                  onClick={() => setSelectedMetricType('oxygen_saturation')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'oxygen_saturation'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Oxygen Level
                </button>
                <button
                  onClick={() => setSelectedMetricType('sleep_hours')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedMetricType === 'sleep_hours'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Sleep Hours
                </button>
              </div>

              {/* Single Large Chart */}
              {getMetricsByType(selectedMetricType).length > 0 ? (
                <div>
                  <ResponsiveContainer width="100%" height={400}>
                    {selectedMetricType === 'blood_pressure' ? (
                      <LineChart data={getMetricsByType(selectedMetricType).map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                        systolic: Number(m.value.systolic),
                        diastolic: Number(m.value.diastolic),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis domain={[60, 160]} stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="systolic" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          name="Systolic" 
                          dot={{ r: 6, fill: '#3b82f6' }}
                          activeDot={{ r: 8 }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="diastolic" 
                          stroke="#8b5cf6" 
                          strokeWidth={3} 
                          name="Diastolic" 
                          dot={{ r: 6, fill: '#8b5cf6' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    ) : (
                      <LineChart data={getMetricsByType(selectedMetricType).map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }),
                        value: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis dataKey="date" stroke="#6b7280" />
                        <YAxis stroke="#6b7280" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
                          labelStyle={{ color: '#374151', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="value" 
                          stroke="#3b82f6" 
                          strokeWidth={3} 
                          name={
                            selectedMetricType === 'blood_sugar' ? 'Blood Sugar (mg/dL)' :
                            selectedMetricType === 'weight' ? 'Weight (kg)' :
                            selectedMetricType === 'heart_rate' ? 'Heart Rate (bpm)' :
                            selectedMetricType === 'temperature' ? 'Temperature (°F)' :
                            selectedMetricType === 'oxygen_saturation' ? 'Oxygen (%)' :
                            'Sleep (hours)'
                          }
                          dot={{ r: 6, fill: '#3b82f6' }}
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    )}
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p className="text-lg">No data available for this metric</p>
                  <p className="text-sm mt-2">Add your first reading using the "Add Metric" tab</p>
                </div>
              )}
            </div>

            {/* Data Table for Selected Metric */}
            {getMetricsByType(selectedMetricType).length > 0 && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  {selectedMetricType === 'blood_pressure' && '❤️ Blood Pressure Readings'}
                  {selectedMetricType === 'blood_sugar' && '🍬 Blood Sugar Readings'}
                  {selectedMetricType === 'weight' && '⚖️ Weight Readings'}
                  {selectedMetricType === 'heart_rate' && '💓 Heart Rate Readings'}
                  {selectedMetricType === 'temperature' && '🌡️ Temperature Readings'}
                  {selectedMetricType === 'oxygen_saturation' && '🫁 Oxygen Level Readings'}
                  {selectedMetricType === 'sleep_hours' && '😴 Sleep Readings'}
                </h3>
                <div className="space-y-3">
                  {getMetricsByType(selectedMetricType).map((metric) => (
                    <div key={metric._id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">
                          {selectedMetricType === 'blood_pressure' && `${metric.value.systolic}/${metric.value.diastolic} ${metric.unit}`}
                          {selectedMetricType !== 'blood_pressure' && `${metric.value} ${metric.unit}`}
                        </p>
                        <p className="text-sm text-gray-600 mt-1">
                          {new Date(metric.recordedAt).toLocaleString()}
                        </p>
                        {metric.notes && (
                          <p className="text-sm text-gray-500 mt-1">{metric.notes}</p>
                        )}
                      </div>
                      <button
                        onClick={() => deleteMetric(metric._id)}
                        className="ml-4 text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded"
                        title="Delete reading"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Add Health Metric</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Metric Type</label>
                  <select
                    value={metricType}
                    onChange={(e) => {
                      setMetricType(e.target.value as any);
                      setMetricValue({});
                    }}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="blood_pressure">❤️ Blood Pressure</option>
                    <option value="blood_sugar">🍬 Blood Sugar</option>
                    <option value="weight">⚖️ Weight</option>
                    <option value="heart_rate">💓 Heart Rate</option>
                    <option value="temperature">🌡️ Temperature</option>
                    <option value="oxygen_saturation">🫁 Oxygen Level</option>
                    <option value="sleep_hours">😴 Sleep Hours</option>
                  </select>
                </div>

                {metricType === 'blood_pressure' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Systolic (mmHg)</label>
                      <input
                        type="number"
                        value={metricValue.systolic || ''}
                        onChange={(e) => setMetricValue({ ...metricValue, systolic: e.target.value })}
                        placeholder="120"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Diastolic (mmHg)</label>
                      <input
                        type="number"
                        value={metricValue.diastolic || ''}
                        onChange={(e) => setMetricValue({ ...metricValue, diastolic: e.target.value })}
                        placeholder="80"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}

                {metricType === 'blood_sugar' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Blood Sugar Level (mg/dL)</label>
                    <input
                      type="number"
                      value={metricValue.level || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, level: e.target.value })}
                      placeholder="100"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {metricType === 'weight' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={metricValue.weight || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, weight: e.target.value })}
                      placeholder="70.5"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {metricType === 'heart_rate' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Heart Rate (bpm)</label>
                    <input
                      type="number"
                      value={metricValue.rate || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, rate: e.target.value })}
                      placeholder="72"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {metricType === 'temperature' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Temperature (°F)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={metricValue.temp || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, temp: e.target.value })}
                      placeholder="98.6"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {metricType === 'oxygen_saturation' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Oxygen Saturation (%)</label>
                    <input
                      type="number"
                      value={metricValue.spo2 || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, spo2: e.target.value })}
                      placeholder="98"
                      min="0"
                      max="100"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                {metricType === 'sleep_hours' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Hours</label>
                    <input
                      type="number"
                      step="0.5"
                      value={metricValue.hours || ''}
                      onChange={(e) => setMetricValue({ ...metricValue, hours: e.target.value })}
                      placeholder="7.5"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                  <textarea
                    value={metricNotes}
                    onChange={(e) => setMetricNotes(e.target.value)}
                    placeholder="Any additional notes..."
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <button
                  onClick={addMetric}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Add Metric
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'medications' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Active Medications</h2>
              <button
                onClick={() => setShowMedicationForm(!showMedicationForm)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
              >
                {showMedicationForm ? 'Cancel' : '+ Add Medication'}
              </button>
            </div>

            {showMedicationForm && (
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Medication</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Medication Name</label>
                    <input
                      type="text"
                      value={medicationForm.name}
                      onChange={(e) => setMedicationForm({ ...medicationForm, name: e.target.value })}
                      placeholder="e.g., Aspirin, Metformin, Lisinopril"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Frequency (times per day)</label>
                    <select
                      value={medicationForm.frequency}
                      onChange={(e) => {
                        const freq = parseInt(e.target.value);
                        const newTimes = Array(freq).fill('').map((_, i) => 
                          medicationForm.timeOfDay[i] || `${String(8 + i * 4).padStart(2, '0')}:00`
                        );
                        setMedicationForm({ ...medicationForm, frequency: e.target.value, timeOfDay: newTimes });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-[#001d3d] text-white"
                    >
                      <option value="1">Once daily</option>
                      <option value="2">Twice daily</option>
                      <option value="3">Three times daily</option>
                      <option value="4">Four times daily</option>
                      <option value="5">Five times daily</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Time Slots</label>
                    <div className="space-y-2">
                      {medicationForm.timeOfDay.map((time, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-600 w-20">Dose {index + 1}:</span>
                          <input
                            type="time"
                            value={time}
                            onChange={(e) => {
                              const newTimes = [...medicationForm.timeOfDay];
                              newTimes[index] = e.target.value;
                              setMedicationForm({ ...medicationForm, timeOfDay: newTimes });
                            }}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#003566] bg-white"
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                      <input
                        type="date"
                        value={medicationForm.startDate}
                        onChange={(e) => setMedicationForm({ ...medicationForm, startDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">End Date (Optional)</label>
                      <input
                        type="date"
                        value={medicationForm.endDate}
                        onChange={(e) => setMedicationForm({ ...medicationForm, endDate: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                    <textarea
                      value={medicationForm.notes}
                      onChange={(e) => setMedicationForm({ ...medicationForm, notes: e.target.value })}
                      placeholder="Any special instructions..."
                      rows={3}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={medicationForm.reminderEnabled}
                      onChange={(e) => setMedicationForm({ ...medicationForm, reminderEnabled: e.target.checked })}
                      className="mr-2"
                    />
                    <label className="text-sm text-gray-700">Enable reminders</label>
                  </div>

                  <button
                    onClick={addMedication}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
                  >
                    Add Medication
                  </button>
                </div>
              </div>
            )}

            {/* Medications List */}
            <div className="grid grid-cols-1 gap-4">
              {medications.length > 0 ? (
                medications.map((med) => (
                  <div key={med._id} className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border-2 border-[#003566]/10 p-6 hover:shadow-xl transition-all duration-300">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-[#003566] to-[#001d3d] rounded-lg flex items-center justify-center text-2xl">
                          💊
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-[#000814]">{med.name}</h3>
                          <p className="text-sm text-gray-600">
                            {med.frequency} {parseInt(med.frequency) === 1 ? 'time' : 'times'} per day
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMedication(med._id)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>

                    {/* Time Slots with Status */}
                    <div className="space-y-3 mb-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">Today's Schedule:</h4>
                      {med.timeOfDay.map((time, index) => {
                        const status = getMedicationStatus(med._id, time);
                        return (
                          <div
                            key={index}
                            className={`flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                              status === 'taken'
                                ? 'bg-green-50 border-green-300'
                                : 'bg-white border-gray-200 hover:border-[#003566]'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold ${
                                status === 'taken'
                                  ? 'bg-green-500 text-white'
                                  : 'bg-[#ffc300] text-[#000814]'
                              }`}>
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold text-[#001d3d]">{time}</p>
                                <p className="text-xs text-gray-500">Dose {index + 1}</p>
                              </div>
                            </div>
                            
                            {status === 'taken' ? (
                              <div className="flex items-center gap-2 text-green-600 font-medium">
                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">Taken</span>
                              </div>
                            ) : (
                              <button
                                onClick={() => markMedicationAsTaken(med._id, med.name, time)}
                                className="bg-gradient-to-r from-[#ffc300] to-[#ffd60a] hover:from-[#ffd60a] hover:to-[#ffc300] text-[#000814] px-4 py-2 rounded-lg font-semibold text-sm transition-all duration-300 hover:shadow-lg"
                              >
                                Mark as Taken
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Additional Info */}
                    <div className="border-t pt-4 space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-gray-700">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span><span className="font-medium">Started:</span> {new Date(med.startDate).toLocaleDateString()}</span>
                      </div>
                      {med.endDate && (
                        <div className="flex items-center gap-2 text-gray-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span><span className="font-medium">Ends:</span> {new Date(med.endDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {med.notes && (
                        <div className="flex items-start gap-2 text-gray-700 mt-2 p-2 bg-blue-50 rounded">
                          <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs">{med.notes}</span>
                        </div>
                      )}
                      {med.reminderEnabled && (
                        <div className="flex items-center gap-2 mt-3 text-[#003566] bg-[#ffc300]/20 px-3 py-2 rounded-lg">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="text-xs font-semibold">Email reminders enabled (5 min before)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-gray-500 bg-white rounded-xl border-2 border-dashed border-gray-300">
                  <div className="text-6xl mb-4">💊</div>
                  <p className="text-lg font-medium text-gray-700">No medications added yet</p>
                  <p className="text-sm text-gray-500 mt-2">Click "Add Medication" to get started</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
