// ============================================================================
// dashboard.js — KPI ringkas, grafik distribusi, dan sorotan atlet terbaik
// ============================================================================

import { getState, loadAthletes, loadTournaments } from './state.js';
import { safeCreateChart } from './charts.js';
import { showToast, setPageLoading } from './ui.js';
import { toUserMessage } from './errors.js';
import { initials, formatDate } from './athletes.js';

function bestAthleteForSport(sport) {
  const list = getState().athletes.filter((a) => a.sport === sport);
  if (!list.length) return null;
  return [...list].sort((a, b) => b.score - a.score)[0];
}

export function updateKPIs() {
  const { athletes, users } = getState();
  const totalEl = document.getElementById('kpi-total-athletes');
  const usersEl = document.getElementById('kpi-total-users');
  const eliteEl = document.getElementById('kpi-elite-athletes');
  if (totalEl) totalEl.innerText = athletes.length;
  if (usersEl) usersEl.innerText = users.filter((u) => u.status === 'Aktif').length;
  if (eliteEl) eliteEl.innerText = athletes.filter((a) => ['A+', 'A'].includes(a.grade)).length;
}

export async function initDashboardCharts() {
  setPageLoading(true, 'Memuat dasbor...');
  try {
    await Promise.all([loadAthletes(), loadTournaments()]);
    const { athletes, tournaments } = getState();
    updateKPIs();

    const regions = [...new Set(athletes.map((a) => a.region))];
    const regionCounts = regions.map((r) => athletes.filter((a) => a.region === r).length);
    safeCreateChart('regionBar', 'chart-region-bar', {
      type: 'bar',
      data: { labels: regions, datasets: [{ label: 'Jumlah Atlet', data: regionCounts, backgroundColor: '#006c49', borderRadius: 10, maxBarThickness: 56 }] },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#eef1f3' } }, x: { grid: { display: false } } } }
    });

    const sports = [...new Set(athletes.map((a) => a.sport))];
    const sportCounts = sports.map((s) => athletes.filter((a) => a.sport === s).length);
    safeCreateChart('sportDoughnut', 'chart-sport-doughnut', {
      type: 'doughnut',
      data: { labels: sports, datasets: [{ data: sportCounts, backgroundColor: ['#091426', '#006c49', '#6ffbbe', '#75777d', '#00875c'], borderWidth: 2, borderColor: '#fff' }] },
      options: { cutout: '68%', maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });

    const dashBody = document.getElementById('dash-tournament-body');
    if (dashBody) {
      dashBody.innerHTML = tournaments
        .slice(0, 4)
        .map((t, i) => {
          const rec = bestAthleteForSport(t.sport);
          return `<tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.05}s">
        <td class="px-5 py-3"><p class="font-bold text-primary text-sm">${t.name}</p><p class="text-xs text-outline">${t.location}</p></td>
        <td class="px-5 py-3 text-xs text-outline">${formatDate(t.date)}</td>
        <td class="px-5 py-3 text-sm font-semibold">${rec ? rec.name : '-'}</td>
      </tr>`;
        })
        .join('');
    }

    const top3 = [...athletes].sort((a, b) => b.score - a.score).slice(0, 3);
    const medalColors = ['#D4AF37', '#C0C0C0', '#CD7F32'];
    const top3El = document.getElementById('dash-top3');
    if (top3El) {
      top3El.innerHTML = top3
        .map(
          (a, i) => `
      <div class="flex items-center gap-3 p-3 rounded-xl ${i === 0 ? 'bg-secondary/5 border border-secondary/15' : 'hover:bg-background'} transition-all cursor-pointer" onclick="SITAS.openDetail(${a.id})">
        <div class="relative">
          <div class="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary" aria-hidden="true">${initials(a.name)}</div>
          <div class="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold border-2 border-white" style="background:${medalColors[i]}" aria-hidden="true">${i + 1}</div>
        </div>
        <div class="flex-1">
          <p class="font-bold text-primary text-sm">${a.name}</p>
          <p class="text-[11px] text-outline">${a.sport}</p>
          <div class="w-full bg-background h-1.5 rounded-full mt-1 overflow-hidden"><div class="bg-secondary h-full score-bar-fill" style="width:${a.score}%"></div></div>
        </div>
        <div class="text-right"><p class="font-bold text-secondary">${a.score}</p></div>
      </div>`
        )
        .join('');
    }
  } catch (err) {
    showToast('Gagal Memuat Dasbor', toUserMessage(err), 'error');
  } finally {
    setPageLoading(false);
  }
}
