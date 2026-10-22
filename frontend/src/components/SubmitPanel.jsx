import { useState } from 'react';
import { Upload, Send, Trash2, CheckCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { monitorEvents } from '../api/client.js';

export default function SubmitPanel({ onSuccess }) {
  const [json, setJson] = useState('');
  const [status, setStatus] = useState(null); // null | 'loading' | 'success' | 'error'
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleClear = () => {
    setJson('');
    setStatus(null);
    setResult(null);
    setError('');
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setJson(ev.target.result);
      setStatus(null);
      setError('');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    setError('');
    setResult(null);

    if (!json.trim()) {
      setError('Please paste or upload JSON telemetry events before submitting.');
      setStatus('error');
      return;
    }

    setStatus('loading');

    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      setError('Invalid JSON syntax — please check brackets and quotes.');
      setStatus('error');
      return;
    }

    try {
      const res = await monitorEvents(parsed);
      setResult(res);
      setStatus('success');
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Submission failed');
      setStatus('error');
    }
  };

  return (
    <div className="glass-card" style={{ overflow: 'hidden' }}>
      {/* Header toggle */}
      <button
        id="btn-toggle-submit"
        onClick={() => setIsOpen((v) => !v)}
        style={{
          width: '100%', padding: '16px 20px', background: 'none', border: 'none',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ padding: '6px', borderRadius: '8px', background: 'rgba(59,130,246,0.1)' }}>
            <Send size={16} color="#3b82f6" />
          </div>
          <div style={{ textAlign: 'left' }}>
            <p style={{ fontSize: '14px', fontWeight: 600, color: '#f1f5f9' }}>Submit Monitoring Events</p>
            <p style={{ fontSize: '12px', color: '#475569' }}>Upload or paste custom JSON events to store in MongoDB</p>
          </div>
        </div>
        {isOpen ? <ChevronUp size={16} color="#475569" /> : <ChevronDown size={16} color="#475569" />}
      </button>

      {isOpen && (
        <div style={{ padding: '0 20px 20px' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <label className="btn btn-ghost" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Upload JSON File
              <input type="file" accept=".json" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
            {json && (
              <button className="btn btn-ghost" onClick={handleClear} id="btn-clear-json">
                <Trash2 size={14} /> Clear
              </button>
            )}
          </div>

          <textarea
            id="submit-json-textarea"
            className="textarea"
            value={json}
            onChange={(e) => setJson(e.target.value)}
            placeholder={`Paste JSON array of events here, for example:\n[\n  {\n    "api_name": "PatientDataAPI",\n    "response_time_ms": 1200,\n    "status_code": 200,\n    "records_returned": 50\n  }\n]`}
            style={{ minHeight: '180px', fontFamily: 'monospace', fontSize: '13px' }}
          />

          {/* Status messages */}
          {status === 'error' && (
            <div style={{ marginTop: 10, padding: '10px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <AlertCircle size={14} color="#f87171" style={{ marginTop: 1, flexShrink: 0 }} />
              <p style={{ fontSize: '13px', color: '#f87171' }}>{error}</p>
            </div>
          )}

          {status === 'success' && result && (
            <div style={{ marginTop: 10, padding: '12px 14px', background: 'rgba(34,197,94,0.1)', border: '1px solid rgba(34,197,94,0.3)', borderRadius: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                <CheckCircle size={14} color="#4ade80" />
                <p style={{ fontSize: '13px', fontWeight: 600, color: '#4ade80' }}>Events processed successfully</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8 }}>
                {[
                  ['Total Input', result.summary?.total_input],
                  ['Processed', result.summary?.processed],
                  ['Alerts', result.summary?.alerts_generated],
                  ['Errors', result.summary?.invalid_input],
                ].map(([label, val]) => (
                  <div key={label} style={{ textAlign: 'center', background: '#0f1420', borderRadius: 6, padding: '8px' }}>
                    <p style={{ fontSize: '20px', fontWeight: 800, color: '#4ade80' }}>{val ?? 0}</p>
                    <p style={{ fontSize: '10px', color: '#475569' }}>{label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            id="btn-submit-events"
            className="btn btn-primary"
            style={{ marginTop: 14, width: '100%', justifyContent: 'center' }}
            onClick={handleSubmit}
            disabled={status === 'loading'}
          >
            {status === 'loading'
              ? <><div className="spinner" style={{ width: 14, height: 14, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white', borderRadius: '50%' }} /> Processing…</>
              : <><Send size={14} /> Submit Events</>
            }
          </button>
        </div>
      )}
    </div>
  );
}
