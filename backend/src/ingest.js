import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!process.argv[2]) {
  console.log(`\n======================================================`);
  console.log(`  INTELLIGENT API MONITOR - STATIC JSON INGESTER`);
  console.log(`======================================================`);
  console.log(`\nUsage: npm run ingest <path/to/your/events.json>`);
  console.log(`Example: npm run ingest my_events.json\n`);
  process.exit(0);
}

const filePath = path.resolve(process.cwd(), process.argv[2]);

const targetUrl = process.env.API_URL || 'http://localhost:3001/monitor';

async function ingestStaticFile() {
  console.log(`\n======================================================`);
  console.log(`  INTELLIGENT API MONITOR - STATIC JSON INGESTER`);
  console.log(`======================================================`);
  console.log(`\n Reading input file: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at "${filePath}"`);
    process.exit(1);
  }

  let rawData;
  try {
    rawData = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`❌ Error reading file: ${err.message}`);
    process.exit(1);
  }

  let jsonData;
  try {
    jsonData = JSON.parse(rawData);
  } catch (err) {
    console.error(`❌ Error: Invalid JSON content in file: ${err.message}`);
    process.exit(1);
  }

  const items = Array.isArray(jsonData) ? jsonData : [jsonData];
  console.log(` Loaded ${items.length} telemetry records.\n`);

  try {
    console.log(`📡 Sending to monitoring endpoint: ${targetUrl} ...`);
    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonData),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ Server rejected request (${response.status}):`, result);
      process.exit(1);
    }

    console.log(`\n✅ Ingestion Successful! HTTP ${response.status}`);
    console.log(`------------------------------------------------------`);
    if (result.summary) {
      console.log(` Total Submitted:     ${result.summary.total_input}`);
      console.log(` Valid Events:        ${result.summary.valid_input}`);
      console.log(` Invalid Events:      ${result.summary.invalid_input}`);
      console.log(` Healthy Responses:   ${result.summary.healthy_responses}`);
      console.log(` Alerts Generated:    ${result.summary.alerts_generated}`);
    }
    console.log(`------------------------------------------------------\n`);

    if (result.alerts && result.alerts.length > 0) {
      console.log(`🚨 Anomalies & Alerts Detected:`);
      result.alerts.forEach((alert, idx) => {
        const sevColor = alert.severity === 'critical' ? '🔴' : (alert.severity === 'high' ? '🟠' : '🟡');
        console.log(` [${idx + 1}] ${sevColor} ${alert.api_name} [${alert.severity?.toUpperCase()}]`);
        console.log(`     Title:   ${alert.title}`);
        console.log(`     Status:  ${alert.status} | Anomalies: ${alert.anomaly_count}`);
      });
    } else {
      console.log(`✨ All endpoints reported normal health (no anomalies detected).`);
    }

    if (result.validation_errors && result.validation_errors.length > 0) {
      console.log(`\n⚠️ Validation Errors:`);
      result.validation_errors.forEach((err) => {
        console.log(`   - Item at index ${err.index}: ${err.errors.join(', ')}`);
      });
    }

    console.log(`\n🎉 Ingestion complete. View the real-time UI at http://localhost:5173\n`);
  } catch (err) {
    console.error(`\n❌ Failed to communicate with backend server at ${targetUrl}:`);
    console.error(`   ${err.message}`);
    console.log(`\n💡 Tip: Ensure the backend is running with "npm run dev" or "launch.bat" before ingesting.`);
    process.exit(1);
  }
}

ingestStaticFile();
