// HomePlus Enterprise Dashboard Logic
let lastStates = { fan: 'OFF', lights: 'OFF', alarm: 'OFF' };
let currentMode = 'auto';
let currentView = 'dash';
let neuralChart = null;
let simChart = null;
let shownWarnings = new Set(); // Track which warnings we've already shown

function initSimChart() {
    const canvas = document.getElementById('simChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    simChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: Array(20).fill(''),
            datasets: [
                { label: 'Temp', data: Array(20).fill(0), borderColor: '#EF4444', borderWidth: 2, tension: 0.4, pointRadius: 0, fill: true, backgroundColor: 'rgba(239, 68, 68, 0.05)' },
                { label: 'Light', data: Array(20).fill(0), borderColor: '#F59E0B', borderWidth: 1, tension: 0.4, pointRadius: 0 },
                { label: 'Gas', data: Array(20).fill(0), borderColor: '#10B981', borderWidth: 1, tension: 0.4, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                x: { display: false },
                y: { display: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { display: false } }
            }
        }
    });
}

function initChart() {
    const canvas = document.getElementById('neuralChart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Professional Gradient Generators
    const createGradient = (color1, color2) => {
        const g = ctx.createLinearGradient(0, 0, 0, 400);
        g.addColorStop(0, color1);
        g.addColorStop(1, color2);
        return g;
    };

    Chart.defaults.font.family = "'Outfit', sans-serif";
    Chart.defaults.color = '#64748b';

    neuralChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Climate Node (°C)',
                    data: [],
                    borderColor: '#EF4444', // Red for Temp
                    backgroundColor: createGradient('rgba(239, 68, 68, 0.1)', 'rgba(239, 68, 68, 0)'),
                    borderWidth: 3,
                    pointBackgroundColor: '#EF4444',
                    pointBorderColor: 'white',
                    pointHoverRadius: 6,
                    tension: 0.4,
                    fill: true,
                    yAxisID: 'y'
                },
                {
                    label: 'Ambient Flux (lx)',
                    data: [],
                    borderColor: '#F59E0B', // Amber
                    backgroundColor: createGradient('rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0)'),
                    borderWidth: 2,
                    borderDash: [5, 5],
                    pointRadius: 0,
                    tension: 0.4,
                    yAxisID: 'y1'
                },
                {
                    label: 'Atmosphere Purity (PPM)',
                    data: [],
                    borderColor: '#10B981', // Emerald
                    borderWidth: 2,
                    pointRadius: 0,
                    tension: 0.4,
                    yAxisID: 'y2'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    position: 'top',
                    align: 'end',
                    labels: {
                        color: '#475569',
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20,
                        font: { size: 12, weight: '600' }
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(255, 255, 255, 0.95)',
                    titleColor: '#1e293b',
                    bodyColor: '#475569',
                    borderColor: 'rgba(0, 0, 0, 0.05)',
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
                    callbacks: {
                        labelColor: (context) => ({
                            borderColor: context.dataset.borderColor,
                            backgroundColor: context.dataset.borderColor
                        })
                    }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(0,0,0,0.03)', drawBorder: false },
                    ticks: { color: '#64748b', maxTicksLimit: 8 }
                },
                y: {
                    position: 'left',
                    grid: { color: 'rgba(0,0,0,0.05)', drawBorder: false },
                    ticks: { color: '#8b5cf6', font: { weight: 'bold' } },
                    title: { display: true, text: 'VOLTS / °C', color: '#8b5cf6', font: { weight: '800', size: 10 } }
                },
                y1: {
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#f59e0b' },
                    title: { display: true, text: 'LUX FLUX', color: '#f59e0b', font: { weight: '800', size: 10 } }
                },
                y2: {
                    position: 'right',
                    grid: { display: false },
                    ticks: { color: '#10b981' },
                    title: { display: true, text: 'PPM PURITY', color: '#10b981', font: { weight: '800', size: 10 } }
                }
            }
        }
    });
}

function showNotification(title, msg, type = 'primary') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'modern-toast';

    const colors = {
        primary: '#4F46E5', // Indigo
        warning: '#F59E0B', // Amber
        danger: '#EF4444'   // Red
    };

    toast.style.borderColor = colors[type];

    toast.innerHTML = `
        <div style="background: ${colors[type]}22; padding: 0.8rem; border-radius: 12px; color: ${colors[type]};">
            <i data-lucide="bell-ring" size="20"></i>
        </div>
        <div style="flex: 1;">
            <div style="font-weight: 800; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 1px; color: ${colors[type]};">${title}</div>
            <div style="font-size: 0.9rem; opacity: 0.8; font-weight: 500;">${msg}</div>
        </div>
    `;

    container.prepend(toast);
    lucide.createIcons();

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        setTimeout(() => toast.remove(), 400);
    }, 5000);
}

function switchView(view) {
    currentView = view;
    document.getElementById('view-dash').style.display = view === 'dash' ? 'block' : 'none';
    document.getElementById('view-history').style.display = view === 'history' ? 'block' : 'none';
    document.getElementById('view-analytics').style.display = view === 'analytics' ? 'block' : 'none';

    document.getElementById('nav-dash').classList.toggle('active', view === 'dash');
    document.getElementById('nav-history').classList.toggle('active', view === 'history');
    document.getElementById('nav-analytics').classList.toggle('active', view === 'analytics');

    showNotification('Neural Stream', `Switched to ${view.toUpperCase()} matrix.`);
    if (view === 'analytics' && neuralChart) neuralChart.update();
}

async function setMode(mode) {
    currentMode = mode;
    document.getElementById('mode-auto').classList.toggle('active', mode === 'auto');
    document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');

    const overlays = document.querySelectorAll('.sim-overlay');
    overlays.forEach(el => el.classList.toggle('disabled', mode === 'auto'));

    if (mode === 'auto') {
        showNotification('System Update', 'Automatic Neural Mode Engaged.');
    } else {
        showNotification('Simulation Hub', 'Manual Control Engaged.');
    }

    await updateDashboard({ mode: mode });
}

async function updateDashboard(payload = null) {
    try {
        const config = payload ? {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        } : { method: 'GET' };

        const response = await fetch('/api/data', config);
        const data = await response.json();
        const { sensor_data, mode, history } = data;

        // Sync local metadata
        if (!payload && mode !== currentMode) {
            currentMode = mode;
            document.getElementById('mode-auto').classList.toggle('active', mode === 'auto');
            document.getElementById('mode-manual').classList.toggle('active', mode === 'manual');
            document.querySelectorAll('.sim-overlay').forEach(el => el.classList.toggle('disabled', mode === 'auto'));
        }

        // --- Global Safety Alerts (Only show new warnings) ---
        if (sensor_data.current_warnings && sensor_data.current_warnings.length > 0) {
            sensor_data.current_warnings.forEach(warn => {
                // Only show if we haven't shown this warning yet
                if (!shownWarnings.has(warn)) {
                    showNotification('SAFETY ALERT', warn, 'danger');
                    shownWarnings.add(warn);
                }
            });
        } else {
            // Clear shown warnings when conditions are safe
            shownWarnings.clear();
        }

        // --- History View Status Sync ---
        const climateStat = document.getElementById('stat-val-climate');
        if (climateStat) {
            const isDanger = sensor_data.temperature > 35;
            climateStat.textContent = isDanger ? 'HAZARD' : 'STABLE';
            climateStat.style.color = isDanger ? 'var(--danger)' : 'var(--primary)';
        }
        const atmosStat = document.getElementById('stat-val-atmosphere');
        if (atmosStat) {
            const isDanger = sensor_data.gas > 200;
            atmosStat.textContent = isDanger ? 'TOXIC' : 'STABLE';
            atmosStat.style.color = isDanger ? 'var(--danger)' : 'var(--success)';
        }
        const sentStat = document.getElementById('stat-val-sentinel');
        if (sentStat) {
            const isDanger = sensor_data.motion === 1;
            sentStat.textContent = isDanger ? 'BREACH' : 'CLEAR';
            sentStat.style.color = isDanger ? 'var(--danger)' : 'var(--warning)';
        }

        // --- View-Specific Updates ---
        if (currentView === 'dash') {
            document.getElementById('val-temp').textContent = sensor_data.temperature;
            const motionEl = document.getElementById('val-motion');
            motionEl.textContent = sensor_data.motion === 1 ? 'DETECTED' : 'CLEAR';
            motionEl.style.color = sensor_data.motion === 1 ? 'var(--secondary)' : 'var(--text)';
            document.getElementById('val-light').textContent = Math.round(sensor_data.light);
            document.getElementById('val-gas').textContent = Math.round(sensor_data.gas);

            // Device Matrix
            const devices = ['fan', 'lights', 'alarm'];
            devices.forEach(dev => {
                const state = sensor_data.devices[dev];
                const pill = document.getElementById(`pill-${dev}`);
                const stateLabel = document.getElementById(`state-${dev}`);

                if (state === 'ON') {
                    pill.classList.add('active');
                    stateLabel.textContent = 'ACTIVE';
                } else {
                    pill.classList.remove('active');
                    stateLabel.textContent = 'OFFLINE';
                }

                if (state !== lastStates[dev]) {
                    if (state === 'ON') {
                        if (dev === 'fan') showNotification('Climate Sync', 'High temperature detected. Fan initiated.');
                        if (dev === 'lights') showNotification('Ambient Flow', sensor_data.motion === 1 ? 'Motion detected. Lights engaged.' : 'Night sequence active.');
                        if (dev === 'alarm') showNotification('SECURITY BREACH', 'Hazardous gas detected!', 'danger');
                    }
                    lastStates[dev] = state;
                }
            });
        }

        // --- History Matrix Rendering ---
        if (history && history.length > 0) {
            const historyBody = document.getElementById('history-body');
            if (historyBody) {
                historyBody.innerHTML = history.slice().reverse().map(entry => {
                    const d = entry.data;
                    const devSummary = `F:${d.devices.fan} | L:${d.devices.lights} | A:${d.devices.alarm}`;
                    const motionStatus = d.motion === 1 ? '<span style="color:var(--secondary)">DETECTED</span>' : 'STATIC';

                    const warningsMarkup = entry.warnings && entry.warnings.length > 0
                        ? entry.warnings.map(w => `<span style="color:var(--danger); font-size:0.7rem; border:1px solid var(--danger); padding:2px 5px; border-radius:4px; margin-right:4px;">${w}</span>`).join('')
                        : '<span style="opacity:0.3">—</span>';

                    const eventLabel = entry.event || 'AUTO DRIFT';
                    const isManual = eventLabel.includes('MANUAL') || eventLabel.includes('MODE');
                    const isSafety = eventLabel === 'SAFETY ALERT';

                    const eventStyle = isSafety ? `color: var(--danger); font-weight: 800;` :
                        (isManual ? `color: var(--warning); font-weight: 800;` : `opacity: 0.6;`);

                    const tStyle = d.temperature > 35 ? 'color: var(--danger); font-weight: 800;' : '';
                    const lStyle = d.light > 800 ? 'color: var(--danger); font-weight: 800;' : '';
                    const gStyle = d.gas > 200 ? 'color: var(--danger); font-weight: 800;' : '';
                    const mStyle = d.motion === 1 ? 'color: var(--danger); font-weight: 800;' : '';

                    return `
                        <tr style="border-bottom: 1px solid rgba(0,0,0,0.05); transition: background 0.3s;" onmouseover="this.style.background='rgba(0,0,0,0.02)'" onmouseout="this.style.background='transparent'">
                            <td style="padding: 1rem; color: var(--primary); font-family: monospace; font-weight: 500;">[${entry.timestamp}]</td>
                            <td style="padding: 1rem; font-size: 0.75rem; ${eventStyle}">${eventLabel}</td>
                            <td style="padding: 1rem; ${tStyle}">${d.temperature.toFixed(1)}°</td>
                            <td style="padding: 1rem; ${lStyle}">${Math.round(d.light)} lx</td>
                            <td style="padding: 1rem; ${gStyle}">${Math.round(d.gas)} PPM</td>
                            <td style="padding: 1rem; ${mStyle}">${motionStatus}</td>
                            <td style="padding: 1rem;">
                                <span style="font-size: 0.75rem; background: rgba(0,0,0,0.03); padding: 0.3rem 0.6rem; border-radius: 4px; border: 1px solid rgba(0,0,0,0.05);">
                                    ${devSummary}
                                </span>
                            </td>
                            <td style="padding: 1rem;">${warningsMarkup}</td>
                        </tr>
                    `;
                }).join('');
            }

            // --- Update Simulation Stream (Dashboard) ---
            if (simChart) {
                const recent = history.slice(-20);
                simChart.data.labels = recent.map(h => h.timestamp);
                simChart.data.datasets[0].data = recent.map(h => h.data.temperature);
                simChart.data.datasets[1].data = recent.map(h => (h.data.light / 20)); // Normalized for view
                simChart.data.datasets[2].data = recent.map(h => (h.data.gas / 10));   // Normalized for view
                simChart.update('none');

                const indicator = document.getElementById('sim-indicator');
                if (indicator) {
                    indicator.textContent = currentMode === 'manual' ? 'SIMULATION ACTIVE' : 'AUTO MONITOR';
                    indicator.style.borderColor = currentMode === 'manual' ? 'var(--warning)' : 'var(--primary)';
                    indicator.style.color = currentMode === 'manual' ? 'var(--warning)' : 'var(--primary)';
                    indicator.style.background = currentMode === 'manual' ? 'rgba(245, 158, 11, 0.1)' : 'transparent';
                }
            }
        }

        // --- Analytics Chart Update ---
        if (history && neuralChart) {
            const labels = history.map(h => h.timestamp);
            const temps = history.map(h => h.data.temperature);
            const lights = history.map(h => h.data.light);
            const gas = history.map(h => h.data.gas);

            neuralChart.data.labels = labels;
            neuralChart.data.datasets[0].data = temps;
            neuralChart.data.datasets[1].data = lights;
            neuralChart.data.datasets[2].data = gas;
            neuralChart.update(currentView === 'analytics' ? 'default' : 'none');
        }

    } catch (e) {
        console.error("Neural Node Sync Failure", e);
    }
}

// --- Sim Controls ---
function sendOverride(key, val) {
    if (currentMode === 'manual') {
        const overrides = {};
        overrides[key] = parseFloat(val);
        updateDashboard({ overrides: overrides });
    }
}

const simTemp = document.getElementById('sim-temp');
if (simTemp) {
    simTemp.addEventListener('input', (e) => {
        const val = e.target.value;
        const valLabel = document.getElementById('sim-temp-val');
        if (valLabel) valLabel.textContent = val + "°C";
        sendOverride('temperature', val);
    });
}

const simLight = document.getElementById('sim-light');
if (simLight) {
    simLight.addEventListener('input', (e) => {
        const val = e.target.value;
        const valLabel = document.getElementById('sim-light-val');
        if (valLabel) valLabel.textContent = val + " lx";
        sendOverride('light', val);
    });
}

const simGas = document.getElementById('sim-gas');
if (simGas) {
    simGas.addEventListener('input', (e) => {
        const val = e.target.value;
        const valLabel = document.getElementById('sim-gas-val');
        if (valLabel) valLabel.textContent = val + " PPM";
        sendOverride('gas', val);
    });
}

document.querySelectorAll('.sim-motion').forEach(btn => {
    btn.addEventListener('click', () => {
        if (currentMode === 'manual') {
            updateDashboard({ overrides: { motion: parseInt(btn.getAttribute('data-state')) } });
        }
    });
});

setInterval(() => updateDashboard(), 3000);
document.addEventListener('DOMContentLoaded', () => {
    initChart();
    initSimChart();
    updateDashboard();
});

window.setMode = setMode;
window.switchView = switchView;
