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

export default function HealthMetricsClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'add' | 'medications'>('dashboard');
  const [selectedMetricType, setSelectedMetricType] = useState<'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours'>('blood_pressure');
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form states
  const [metricType, setMetricType] = useState<'blood_pressure' | 'blood_sugar' | 'weight' | 'heart_rate' | 'temperature' | 'oxygen_saturation' | 'sleep_hours'>('blood_pressure');
  const [metricValue, setMetricValue] = useState<any>({});
  const [metricNotes, setMetricNotes] = useState('');
  
  // Medication form states
  const [showMedicationForm, setShowMedicationForm] = useState(false);
  const [medicationForm, setMedicationForm] = useState({
    name: '',
    frequency: 'Once daily',
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
    }
  }, [mounted, session, status, router]);

  const loadMetrics = async () => {
    try {
      const response = await fetch('/api/health-metrics?days=30');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
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
      }
    } catch (error) {
      console.error('Failed to load medications:', error);
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
          frequency: 'Once daily',
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
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">❤️ Blood Pressure</h3>
                </div>
                {getLatestMetric('blood_pressure') ? (
                  <div>
                    <p className="text-3xl font-bold text-blue-600">
                      {getLatestMetric('blood_pressure')?.value.systolic}/
                      {getLatestMetric('blood_pressure')?.value.diastolic}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('blood_pressure')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              {/* Blood Sugar Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🍬 Blood Sugar</h3>
                </div>
                {getLatestMetric('blood_sugar') ? (
                  <div>
                    <p className="text-3xl font-bold text-green-600">
                      {getLatestMetric('blood_sugar')?.value} mg/dL
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('blood_sugar')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              {/* Weight Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">⚖️ Weight</h3>
                </div>
                {getLatestMetric('weight') ? (
                  <div>
                    <p className="text-3xl font-bold text-purple-600">
                      {getLatestMetric('weight')?.value} kg
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('weight')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              {/* Heart Rate Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">💓 Heart Rate</h3>
                </div>
                {getLatestMetric('heart_rate') ? (
                  <div>
                    <p className="text-3xl font-bold text-red-600">
                      {getLatestMetric('heart_rate')?.value} bpm
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('heart_rate')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>
            </div>

            {/* Additional Metrics Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Temperature Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🌡️ Temperature</h3>
                </div>
                {getLatestMetric('temperature') ? (
                  <div>
                    <p className="text-3xl font-bold text-orange-600">
                      {getLatestMetric('temperature')?.value}°F
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('temperature')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              {/* Oxygen Saturation Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">🫁 Oxygen Level</h3>
                </div>
                {getLatestMetric('oxygen_saturation') ? (
                  <div>
                    <p className="text-3xl font-bold text-cyan-600">
                      {getLatestMetric('oxygen_saturation')?.value}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('oxygen_saturation')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>

              {/* Sleep Hours Card */}
              <div className="bg-white rounded-lg shadow-sm border p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">😴 Sleep</h3>
                </div>
                {getLatestMetric('sleep_hours') ? (
                  <div>
                    <p className="text-3xl font-bold text-indigo-600">
                      {getLatestMetric('sleep_hours')?.value} hrs
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                      {new Date(getLatestMetric('sleep_hours')!.recordedAt).toLocaleDateString()}
                    </p>
                  </div>
                ) : (
                  <p className="text-gray-500">No data yet</p>
                )}
              </div>
            </div>

            {/* Charts - Horizontal Layout */}
            {metrics.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Blood Pressure Chart */}
                {getMetricsByType('blood_pressure').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">❤️ Blood Pressure Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('blood_pressure').map((m, index) => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        systolic: Number(m.value.systolic),
                        diastolic: Number(m.value.diastolic),
                        fullDate: new Date(m.recordedAt).toLocaleString(),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[60, 160]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="systolic" stroke="#3b82f6" strokeWidth={2} name="Systolic" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="diastolic" stroke="#8b5cf6" strokeWidth={2} name="Diastolic" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Blood Sugar Chart */}
                {getMetricsByType('blood_sugar').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🍬 Blood Sugar Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('blood_sugar').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        level: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[50, 200]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="level" stroke="#22c55e" strokeWidth={2} name="Blood Sugar (mg/dL)" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Weight Chart */}
                {getMetricsByType('weight').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">⚖️ Weight Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('weight').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        weight: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="weight" stroke="#a855f7" strokeWidth={2} name="Weight (kg)" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Heart Rate Chart */}
                {getMetricsByType('heart_rate').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">💓 Heart Rate Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('heart_rate').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        rate: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[40, 120]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="rate" stroke="#ef4444" strokeWidth={2} name="Heart Rate (bpm)" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Temperature Chart */}
                {getMetricsByType('temperature').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🌡️ Temperature Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('temperature').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        temp: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[95, 105]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="temp" stroke="#f97316" strokeWidth={2} name="Temperature (°F)" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Oxygen Saturation Chart */}
                {getMetricsByType('oxygen_saturation').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">🫁 Oxygen Level Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('oxygen_saturation').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        spo2: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[90, 100]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="spo2" stroke="#06b6d4" strokeWidth={2} name="Oxygen Saturation (%)" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Sleep Hours Chart */}
                {getMetricsByType('sleep_hours').length > 0 && (
                  <div className="bg-white border border-gray-200 rounded-lg p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">😴 Sleep Trend</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={getMetricsByType('sleep_hours').map(m => ({
                        date: new Date(m.recordedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        hours: Number(m.value),
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                        <YAxis domain={[0, 12]} />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="hours" stroke="#6366f1" strokeWidth={2} name="Sleep Hours" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}

            {/* Recent Metrics */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Readings</h3>
              {metrics.length > 0 ? (
                <div className="space-y-3">
                  {metrics.slice(0, 10).map((metric) => (
                    <div key={metric._id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">
                          {metric.type === 'blood_pressure' && `❤️ Blood Pressure: ${metric.value.systolic}/${metric.value.diastolic} ${metric.unit}`}
                          {metric.type === 'blood_sugar' && `🍬 Blood Sugar: ${metric.value} ${metric.unit}`}
                          {metric.type === 'weight' && `⚖️ Weight: ${metric.value} ${metric.unit}`}
                          {metric.type === 'heart_rate' && `💓 Heart Rate: ${metric.value} ${metric.unit}`}
                          {metric.type === 'temperature' && `🌡️ Temperature: ${metric.value} ${metric.unit}`}
                          {metric.type === 'oxygen_saturation' && `🫁 Oxygen Level: ${metric.value}${metric.unit}`}
                          {metric.type === 'sleep_hours' && `😴 Sleep: ${metric.value} ${metric.unit}`}
                        </p>
                        <p className="text-sm text-gray-600">
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
              ) : (
                <p className="text-gray-500 text-center py-8">No metrics recorded yet. Add your first metric!</p>
              )}
            </div>
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

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Frequency</label>
                      <select
                        value={medicationForm.frequency}
                        onChange={(e) => setMedicationForm({ ...medicationForm, frequency: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="Once daily">Once daily</option>
                        <option value="Twice daily">Twice daily</option>
                        <option value="Three times daily">Three times daily</option>
                        <option value="Every 8 hours">Every 8 hours</option>
                        <option value="As needed">As needed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Time of Day</label>
                      <input
                        type="time"
                        value={medicationForm.timeOfDay[0]}
                        onChange={(e) => setMedicationForm({ ...medicationForm, timeOfDay: [e.target.value] })}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {medications.length > 0 ? (
                medications.map((med) => (
                  <div key={med._id} className="bg-white rounded-lg shadow-sm border p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{med.name}</h3>
                      </div>
                      <button
                        onClick={() => deleteMedication(med._id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-2 text-sm">
                      <p className="text-gray-700">
                        <span className="font-medium">Frequency:</span> {med.frequency}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Time:</span> {med.timeOfDay.join(', ')}
                      </p>
                      <p className="text-gray-700">
                        <span className="font-medium">Started:</span> {new Date(med.startDate).toLocaleDateString()}
                      </p>
                      {med.notes && (
                        <p className="text-gray-600 mt-2">{med.notes}</p>
                      )}
                      {med.reminderEnabled && (
                        <div className="flex items-center mt-3 text-blue-600">
                          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                          </svg>
                          <span className="text-xs">Reminders enabled</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-gray-500">
                  No medications added yet. Click "Add Medication" to get started.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
