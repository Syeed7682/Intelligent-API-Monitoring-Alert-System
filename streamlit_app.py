import streamlit as st
import pandas as pd
import plotly.graph_objects as go
import requests
import json
from datetime import datetime

# Page configuration
st.set_page_config(
    page_title="Intelligent API Monitor - Dynamic Telemetry Studio",
    page_icon="⚡",
    layout="wide",
    initial_sidebar_state="expanded",
)

# Custom dark-theme CSS matching the monitoring dashboard aesthetics
st.markdown("""
<style>
    .main {
        background-color: #0b0f19;
        color: #f1f5f9;
    }
    .stMetric {
        background-color: #131b2e;
        padding: 14px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,0.06);
    }
    .metric-card {
        background: #131b2e;
        border: 1px solid #1e293b;
        padding: 16px;
        border-radius: 10px;
        margin-bottom: 12px;
    }
    .badge-critical {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.15);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
    }
    .badge-high {
        color: #f97316;
        background: rgba(249, 115, 22, 0.15);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
    }
    .badge-normal {
        color: #10b981;
        background: rgba(16, 185, 129, 0.15);
        padding: 4px 10px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 12px;
    }
</style>
""", unsafe_allow_html=True)

# Default initial telemetry dataset
DEFAULT_TELEMETRY = [
    {"api_name": "PatientDataAPI", "response_time_ms": 1200, "status_code": 200, "records_returned": 50, "threshold_ms": 3000},
    {"api_name": "AppointmentAPI", "response_time_ms": 5500, "status_code": 500, "records_returned": 0, "threshold_ms": 3000},
    {"api_name": "BillingAPI", "response_time_ms": 2800, "status_code": 200, "records_returned": 120, "threshold_ms": 3000},
    {"api_name": "InventoryAPI", "response_time_ms": 420, "status_code": 200, "records_returned": 85, "threshold_ms": 3000},
    {"api_name": "AuthService", "response_time_ms": 95, "status_code": 200, "records_returned": 1, "threshold_ms": 1500},
]

# Initialize session state for editable telemetry
if "telemetry_data" not in st.session_state:
    st.session_state.telemetry_data = pd.DataFrame(DEFAULT_TELEMETRY)

# Sidebar configuration
st.sidebar.title("⚡ Control Center")
st.sidebar.markdown("Configure threshold policies and backend endpoints.")

backend_url = st.sidebar.text_input("Backend API Endpoint", value="http://localhost:3001/monitor")
global_threshold = st.sidebar.slider("Global Threshold (ms)", min_value=500, max_value=8000, value=3000, step=100)
apply_global_threshold = st.sidebar.checkbox("Override row thresholds with global slider", value=False)
chart_style = st.sidebar.radio("Trend Chart View", ["Line & Points", "Bar Comparison", "Area Graph"])

st.sidebar.markdown("---")
uploaded_file = st.sidebar.file_uploader("Upload Telemetry JSON", type=["json"])
if uploaded_file is not None:
    try:
        content = json.load(uploaded_file)
        if isinstance(content, list):
            new_df = pd.DataFrame(content)
            if "threshold_ms" not in new_df.columns:
                new_df["threshold_ms"] = global_threshold
            st.session_state.telemetry_data = new_df
            st.sidebar.success(f"Loaded {len(new_df)} records from file!")
    except Exception as e:
        st.sidebar.error(f"Error loading JSON: {e}")

if st.sidebar.button("Reset to Default Sample"):
    st.session_state.telemetry_data = pd.DataFrame(DEFAULT_TELEMETRY)
    st.rerun()

# Main Title & Header
st.title("Intelligent API Monitoring — Dynamic Studio")
st.caption("Live editable telemetry playground with dynamic response time trend visualization & real-time anomaly detection.")

# Dynamic Data Editor Section
st.subheader("📝 Edit Telemetry Data (Interactive Table)")
st.write("You can directly click and edit any cell below, add rows, or delete records. The chart updates instantaneously.")

edited_df = st.data_editor(
    st.session_state.telemetry_data,
    num_rows="dynamic",
    use_container_width=True,
    column_config={
        "api_name": st.column_config.TextColumn("API Name", required=True),
        "response_time_ms": st.column_config.NumberColumn("Response Time (ms)", min_value=0, max_value=20000, step=50, required=True),
        "status_code": st.column_config.NumberColumn("HTTP Status Code", min_value=100, max_value=599, step=1, required=True),
        "records_returned": st.column_config.NumberColumn("Records Returned", min_value=0, step=1, required=True),
        "threshold_ms": st.column_config.NumberColumn("Threshold (ms)", min_value=100, max_value=15000, step=100),
    },
    key="telemetry_editor"
)

# Sync edits back to session state
st.session_state.telemetry_data = edited_df

# If override requested, replace threshold column
df = edited_df.copy()
if apply_global_threshold or "threshold_ms" not in df.columns:
    df["threshold_ms"] = global_threshold

# KPI Metric Cards Row
col1, col2, col3, col4 = st.columns(4)
total_apis = len(df)
avg_latency = int(df["response_time_ms"].mean()) if not df.empty else 0
max_latency = int(df["response_time_ms"].max()) if not df.empty else 0
breached_count = len(df[df["response_time_ms"] > df["threshold_ms"]]) if not df.empty else 0

with col1:
    st.metric("Total Endpoints", total_apis)
with col2:
    st.metric("Avg Response Time", f"{avg_latency} ms")
with col3:
    st.metric("Peak Response Time", f"{max_latency} ms")
with col4:
    st.metric("Threshold Breaches", breached_count, delta=f"{breached_count} alerts" if breached_count > 0 else "Normal", delta_color="inverse")

st.markdown("---")

# Dynamic Chart Section
st.subheader("📈 RESPONSE TIME TREND")

if df.empty:
    st.warning("No telemetry records available to display. Add rows in the table above.")
else:
    # Build customized Plotly figure matching user's exact dark aesthetic
    fig = go.Figure()

    # Determine colors for points: blue normal, red/orange if threshold breached
    point_colors = [
        "#3b82f6" if row["response_time_ms"] <= row["threshold_ms"] and row["status_code"] < 400
        else "#ef4444"
        for _, row in df.iterrows()
    ]

    if chart_style == "Line & Points":
        # Response Time Line & Markers
        fig.add_trace(go.Scatter(
            x=df["api_name"],
            y=df["response_time_ms"],
            mode="lines+markers",
            name="Response Time",
            line=dict(color="#3b82f6", width=2.5),
            marker=dict(size=12, color=point_colors, symbol="circle", line=dict(color="#1e293b", width=1.5)),
            hovertemplate="<b>%{x}</b><br>Observed: %{y} ms<extra></extra>"
        ))

        # Threshold Line & Markers
        fig.add_trace(go.Scatter(
            x=df["api_name"],
            y=df["threshold_ms"],
            mode="lines+markers",
            name="Threshold",
            line=dict(color="#ef4444", width=2, dash="dash"),
            marker=dict(size=9, color="#ef4444", symbol="circle-open"),
            hovertemplate="<b>%{x} Threshold</b>: %{y} ms<extra></extra>"
        ))

    elif chart_style == "Bar Comparison":
        fig.add_trace(go.Bar(
            x=df["api_name"],
            y=df["response_time_ms"],
            name="Response Time",
            marker_color=point_colors,
            hovertemplate="<b>%{x}</b><br>Observed: %{y} ms<extra></extra>"
        ))
        fig.add_trace(go.Scatter(
            x=df["api_name"],
            y=df["threshold_ms"],
            mode="markers+lines",
            name="Threshold",
            line=dict(color="#ef4444", width=2, dash="dash"),
            marker=dict(size=10, color="#ffffff"),
            hovertemplate="<b>%{x} Threshold</b>: %{y} ms<extra></extra>"
        ))

    else: # Area Graph
        fig.add_trace(go.Scatter(
            x=df["api_name"],
            y=df["response_time_ms"],
            fill='tozeroy',
            name="Response Time",
            line=dict(color="#3b82f6", width=2),
            fillcolor='rgba(59, 130, 246, 0.15)',
        ))
        fig.add_trace(go.Scatter(
            x=df["api_name"],
            y=df["threshold_ms"],
            mode="lines",
            name="Threshold",
            line=dict(color="#ef4444", width=2, dash="dash"),
        ))

    # Dark background layout styling
    fig.update_layout(
        template="plotly_dark",
        plot_bgcolor="#0d1322",
        paper_bgcolor="#0b0f19",
        margin=dict(l=40, r=40, t=20, b=40),
        height=380,
        legend=dict(
            orientation="h",
            yanchor="bottom",
            y=-0.25,
            xanchor="center",
            x=0.5,
            font=dict(color="#94a3b8")
        ),
        xaxis=dict(
            gridcolor="#1e293b",
            zerolinecolor="#1e293b",
            tickfont=dict(color="#94a3b8", size=12)
        ),
        yaxis=dict(
            title="Latency (ms)",
            gridcolor="#1e293b",
            zerolinecolor="#1e293b",
            tickfont=dict(color="#94a3b8", size=12)
        ),
        hovermode="x unified"
    )

    st.plotly_chart(fig, use_container_width=True)

st.markdown("---")

# Actions & Backend Ingestion Section
col_act1, col_act2 = st.columns([2, 1])

with col_act1:
    st.subheader("🚀 Live Ingestion & AI Alert Pipeline")
    st.write("Submit the active table data directly to the Node.js backend (`POST /monitor`) to trigger AI alert synthesis and store in MongoDB Atlas.")

    if st.button("📡 Send Current Table to Backend (/monitor)", type="primary"):
        records_to_send = []
        for _, row in df.iterrows():
            record = {
                "api_name": str(row["api_name"]),
                "response_time_ms": int(row["response_time_ms"]),
                "status_code": int(row["status_code"]),
                "records_returned": int(row["records_returned"])
            }
            records_to_send.append(record)

        with st.spinner("Submitting to backend and generating AI alerts..."):
            try:
                res = requests.post(
                    backend_url,
                    json=records_to_send,
                    headers={"Content-Type": "application/json"},
                    timeout=10
                )
                if res.status_code == 200:
                    payload = res.json()
                    st.success(f"✅ Ingestion successful! Server processed {payload.get('summary', {}).get('processed', len(records_to_send))} events.")

                    summary = payload.get("summary", {})
                    s_col1, s_col2, s_col3 = st.columns(3)
                    s_col1.metric("Alerts Generated", summary.get("alerts_generated", 0))
                    s_col2.metric("Healthy Endpoints", summary.get("healthy_responses", 0))
                    s_col3.metric("Invalid Inputs", summary.get("invalid_input", 0))

                    alerts = payload.get("alerts", [])
                    if alerts:
                        st.markdown("#### 🚨 Generated Alerts:")
                        for a in alerts:
                            with st.expander(f"⚠️ {a.get('api_name')} — {a.get('severity', '').upper()}: {a.get('title')}"):
                                st.write(f"**Status:** `{a.get('status')}` | **Anomalies Count:** {a.get('anomaly_count')}")
                                st.write(f"**Alert ID:** `{a.get('id')}`")
                    else:
                        st.info("✨ All submitted endpoints were healthy. No alerts triggered.")
                else:
                    st.error(f"Backend returned status {res.status_code}: {res.text}")
            except Exception as err:
                st.error(f"Failed to connect to backend server at `{backend_url}`: {err}")
                st.caption("Ensure `npm run dev` is running the backend on port 3001.")

with col_act2:
    st.subheader("💾 Export & Backup")
    st.write("Export your configured telemetry dataset as JSON.")

    export_json = df[["api_name", "response_time_ms", "status_code", "records_returned"]].to_dict(orient="records")
    st.download_button(
        label="📥 Download Telemetry as JSON",
        data=json.dumps(export_json, indent=2),
        file_name=f"telemetry_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json",
        mime="application/json",
        use_container_width=True
    )
