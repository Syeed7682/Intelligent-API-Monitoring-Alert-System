import streamlit as st
import requests
import json
import pandas as pd
import plotly.express as px
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="API Monitor & Alert System",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom Styling for modern dark theme
st.markdown("""
<style>
    .metric-card {
        background: linear-gradient(135deg, rgba(30, 41, 59, 0.7) 0%, rgba(15, 23, 42, 0.8) 100%);
        border: 1px solid rgba(148, 163, 184, 0.15);
        border-radius: 12px;
        padding: 18px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2);
    }
    .badge-critical { background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
    .badge-high { background-color: #f97316; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
    .badge-medium { background-color: #eab308; color: black; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
    .badge-low { background-color: #3b82f6; color: white; padding: 4px 8px; border-radius: 6px; font-weight: bold; }
</style>
""", unsafe_allow_html=True)

# Configuration
API_BASE = "http://localhost:3001"

# Helper Functions
def check_backend_health():
    try:
        r = requests.get(f"{API_BASE}/health", timeout=2)
        if r.status_code in [200, 503]:
            return r.json()
    except Exception:
        pass
    return None

def fetch_alerts(status_filter=None, severity_filter=None):
    try:
        params = {"limit": 100}
        if status_filter and status_filter != "all":
            params["status"] = status_filter
        if severity_filter and severity_filter != "all":
            params["severity"] = severity_filter
            
        r = requests.get(f"{API_BASE}/alerts", params=params, timeout=3)
        if r.status_code == 200:
            return r.json().get("alerts", [])
    except Exception as e:
        st.error(f"Failed to fetch alerts: {e}")
    return []

def submit_telemetry(payload):
    try:
        r = requests.post(f"{API_BASE}/monitor", json=payload, timeout=10)
        return r.status_code, r.json()
    except Exception as e:
        return 500, {"error": str(e)}

def update_alert_status(alert_id, action):
    try:
        r = requests.patch(f"{API_BASE}/api/alerts/{alert_id}/{action}", timeout=3)
        return r.status_code == 200
    except Exception:
        return False

def send_alert_email(alert_id, recipient):
    try:
        r = requests.post(f"{API_BASE}/api/alerts/{alert_id}/email", json={"recipient": recipient}, timeout=5)
        return r.status_code == 200, r.json()
    except Exception as e:
        return False, {"error": str(e)}

# --- Header & Status ---
health = check_backend_health()

col_title, col_status = st.columns([3, 1])

with col_title:
    st.title("🛡️ Intelligent API Monitoring & Alert System")
    st.caption("Automated API response evaluation, deterministic anomaly detection & AI alerts")

with col_status:
    if health and health.get("status") in ["healthy", "degraded"]:
        db_stat = health.get("services", {}).get("database", {}).get("status", "unknown")
        if db_stat == "connected":
            st.success("🟢 Backend & MongoDB Online")
        else:
            st.warning("🟡 Degraded (In-Memory Fallback)")
    else:
        st.error("🔴 Backend Offline (Start with `npm run dev`)")

st.divider()

# --- Sidebar Controls ---
st.sidebar.header("⚙️ Controls & Navigation")
view_mode = st.sidebar.radio("Navigate View", ["📊 Incident Dashboard", "📡 Ingest Events", "📈 Metrics & Analytics"])

st.sidebar.divider()
st.sidebar.subheader("🔍 Alert Filters")
filter_status = st.sidebar.selectbox("Filter by Status", ["all", "active", "acknowledged", "resolved"])
filter_severity = st.sidebar.selectbox("Filter by Severity", ["all", "critical", "high", "medium", "low"])

# Refresh button
if st.sidebar.button("🔄 Refresh Data", width="stretch"):
    st.rerun()

# Fetch Alerts
alerts = fetch_alerts(filter_status, filter_severity)

# ==========================================
# VIEW 1: Incident Dashboard
# ==========================================
if view_mode == "📊 Incident Dashboard":
    # Metrics KPI cards
    all_alerts = fetch_alerts()
    active_count = sum(1 for a in all_alerts if a.get("status") == "active")
    crit_count = sum(1 for a in all_alerts if a.get("severity") == "critical")
    resolved_count = sum(1 for a in all_alerts if a.get("status") == "resolved")

    kpi1, kpi2, kpi3, kpi4 = st.columns(4)
    kpi1.metric("Total Incidents", len(all_alerts))
    kpi2.metric("Active Anomalies", active_count, delta="Requires Attention" if active_count > 0 else None, delta_color="inverse")
    kpi3.metric("Critical Alerts", crit_count, delta="Severe" if crit_count > 0 else None, delta_color="inverse")
    kpi4.metric("Resolved", resolved_count)

    st.subheader(f"Incidents ({len(alerts)})")

    if not alerts:
        st.info("✨ No anomalies matching current filters. Ingest telemetry events from the sidebar to test.")
    else:
        for alert in alerts:
            alert_id = alert.get("_id") or alert.get("id")
            sev = alert.get("severity", "low").lower()
            status = alert.get("status", "active")
            
            # Color accents
            border_color = "#ef4444" if sev == "critical" else ("#f97316" if sev == "high" else "#eab308")

            with st.container():
                st.markdown(f"""
                <div style="border-left: 5px solid {border_color}; background: rgba(30, 41, 59, 0.4); padding: 14px 18px; border-radius: 8px; margin-bottom: 12px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h4 style="margin: 0; color: #f8fafc;">{alert.get('api_name')} &nbsp;·&nbsp; <span style="font-size: 14px; font-weight: normal; color: #94a3b8;">{alert.get('title')}</span></h4>
                        <div>
                            <span class="badge-{sev}">{sev.upper()}</span> &nbsp;
                            <span style="background: rgba(148, 163, 184, 0.2); padding: 4px 8px; border-radius: 6px; font-size: 12px;">{status.upper()}</span>
                        </div>
                    </div>
                </div>
                """, unsafe_allow_html=True)

                col_details, col_actions = st.columns([3, 1])

                with col_details:
                    st.write(f"**AI Incident Message:** {alert.get('message', 'No message available.')}")
                    
                    with st.expander("🔍 View Root Causes & Diagnostic Steps"):
                        st.write(f"**Recommended Action:** {alert.get('recommendation', 'Inspect server logs.')}")
                        st.write("**Probable Causes:**")
                        for cause in alert.get("possible_causes", []):
                            st.write(f"- {cause}")

                        raw = alert.get("raw_event", {})
                        if raw:
                            st.write("**Raw Telemetry Data:**")
                            st.json(raw)

                with col_actions:
                    if status != "acknowledged":
                        if st.button("Acknowledge", key=f"ack_{alert_id}", width="stretch"):
                            if update_alert_status(alert_id, "acknowledge"):
                                st.success("Acknowledged")
                                st.rerun()

                    if status != "resolved":
                        if st.button("Resolve", key=f"res_{alert_id}", width="stretch"):
                            if update_alert_status(alert_id, "resolve"):
                                st.success("Resolved")
                                st.rerun()

                    with st.popover("✉️ Email Alert", width="stretch"):
                        rec_email = st.text_input("Recipient Email", "oncall-team@example.com", key=f"em_{alert_id}")
                        if st.button("Send Report", key=f"send_em_{alert_id}"):
                            ok, res = send_alert_email(alert_id, rec_email)
                            if ok:
                                st.success(f"Dispatched to {rec_email}")
                            else:
                                st.error("Email dispatch failed")

                st.write("")

# ==========================================
# VIEW 2: Ingest Events
# ==========================================
elif view_mode == "📡 Ingest Events":
    st.subheader("Submit Live Telemetry Events")
    st.write("Upload a static JSON file or paste arbitrary telemetry events to run through the anomaly detection pipeline and store in MongoDB.")

    tab_upload, tab_paste = st.tabs(["📁 Upload JSON File", "✍️ Paste Custom JSON"])

    input_data = None

    with tab_upload:
        uploaded_file = st.file_uploader("Upload .json file containing API telemetry", type=["json"])
        if uploaded_file is not None:
            try:
                input_data = json.load(uploaded_file)
                st.success(f"Loaded JSON file successfully ({len(input_data) if isinstance(input_data, list) else 1} events)")
            except Exception as e:
                st.error(f"Invalid JSON file: {e}")

    with tab_paste:
        default_json = """[
  {
    "api_name": "PatientDataAPI",
    "response_time_ms": 1200,
    "status_code": 200,
    "records_returned": 50
  },
  {
    "api_name": "AppointmentAPI",
    "response_time_ms": 5500,
    "status_code": 500,
    "records_returned": 0
  }
]"""
        pasted_text = st.text_area("JSON Telemetry Payload", value=default_json, height=220)
        if st.button("Parse Pasted JSON"):
            try:
                input_data = json.loads(pasted_text)
                st.success("JSON parsed successfully!")
            except Exception as e:
                st.error(f"JSON Syntax Error: {e}")

    if st.button("🚀 Process & Ingest to Monitoring Engine", type="primary", width="stretch"):
        if input_data is None:
            try:
                input_data = json.loads(pasted_text)
            except Exception:
                st.error("Please provide valid JSON input before submitting.")

        if input_data:
            with st.spinner("Processing telemetry through anomaly detector & AI service..."):
                status_code, res = submit_telemetry(input_data)

            if status_code == 200:
                summary = res.get("summary", {})
                st.success(f"✅ Ingestion Succeeded! Total: {summary.get('total_input')} | Anomalies Detected: {summary.get('alerts_generated')} | Healthy: {summary.get('healthy_responses')}")
                
                alerts_gen = res.get("alerts", [])
                if alerts_gen:
                    st.write("**Generated Alerts:**")
                    for a in alerts_gen:
                        st.warning(f"⚠️ **{a.get('api_name')}** [{a.get('severity', '').upper()}]: {a.get('title')}")
                else:
                    st.info("✨ All endpoints evaluated normal.")
            else:
                st.error(f"❌ Server Error ({status_code}): {res.get('error', res)}")

# ==========================================
# VIEW 3: Metrics & Analytics
# ==========================================
elif view_mode == "📈 Metrics & Analytics":
    st.subheader("Telemetry & Severity Analytics")

    if not alerts:
        st.info("No data available to display charts. Ingest some events first!")
    else:
        df = pd.DataFrame(alerts)

        col_c1, col_c2 = st.columns(2)

        with col_c1:
            st.markdown("#### Severity Distribution")
            sev_counts = df["severity"].value_counts().reset_index()
            sev_counts.columns = ["severity", "count"]
            fig_pie = px.pie(
                sev_counts, 
                values="count", 
                names="severity", 
                hole=0.45,
                color="severity",
                color_discrete_map={"critical": "#ef4444", "high": "#f97316", "medium": "#eab308", "low": "#3b82f6"}
            )
            fig_pie.update_layout(margin=dict(t=10, b=10, l=10, r=10))
            st.plotly_chart(fig_pie, width="stretch")

        with col_c2:
            st.markdown("#### Status Breakdown")
            stat_counts = df["status"].value_counts().reset_index()
            stat_counts.columns = ["status", "count"]
            fig_bar = px.bar(
                stat_counts, 
                x="status", 
                y="count", 
                color="status",
                color_discrete_map={"active": "#ef4444", "acknowledged": "#3b82f6", "resolved": "#10b981"}
            )
            fig_bar.update_layout(margin=dict(t=10, b=10, l=10, r=10))
            st.plotly_chart(fig_bar, width="stretch")

        st.markdown("#### Detailed Incident Telemetry Log")
        display_cols = [c for c in ["api_name", "severity", "status", "occurrence_count", "created_at"] if c in df.columns]
        st.dataframe(df[display_cols], width="stretch")
