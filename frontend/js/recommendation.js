// ============================================================================
// recommendation.js — Halaman rekomendasi & peringkat talenta
// ============================================================================

import { getState, loadAthletes, loadTournaments } from './state.js';
import { GRADE_CLASS_MAP } from './constants.js';
import { showToast, setPageLoading } from './ui.js';
import { toUserMessage } from './errors.js';
import { initials, formatDate } from './athletes.js';

export async function renderRecommendationPage() {
  setPageLoading(true, 'Menyusun rekomendasi...');
  try {
    await Promise.all([loadAthletes(), loadTournaments()]);
    const { athletes, tournaments } = getState();

    const algoBarsEl = document.getElementById('algo-bars');
    if (algoBarsEl) {
      algoBarsEl.innerHTML = [
        ['Prestasi (Nasional/Provinsi)', 30],
        ['Fisik & Biometrik', 25],
        ['Evaluasi Pelatih', 20],
        ['Usia & Proyeksi', 15],
        ['Frekuensi Latihan', 10]
      ]
        .map(
          ([label, pct]) => `
      <div>
        <div class="flex justify-between mb-1"><span class="text-xs text-outline font-semibold">${label}</span><span class="text-xs font-bold text-secondary">${pct}%</span></div>
        <div class="w-full h-1.5 bg-background rounded-full overflow-hidden"><div class="h-full bg-secondary score-bar-fill" style="width:${pct}%"></div></div>
      </div>`
        )
        .join('');
    }

    const ranked = [...athletes].sort((a, b) => b.score - a.score);
    const medalBg = ['#D4AF37', '#C0C0C0', '#CD7F32'];
    const rankingBody = document.getElementById('rec-ranking-body');
    if (rankingBody) {
      rankingBody.innerHTML = ranked
        .map(
          (a, i) => `
      <tr class="row-stagger hover:bg-background transition-colors cursor-pointer" style="animation-delay:${i * 0.02}s" onclick="SITAS.openDetail(${a.id})">
        <td class="px-5 py-3">${i < 3 ? `<div class="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold" style="background:${medalBg[i]}" aria-hidden="true">${i + 1}</div>` : `<span class="text-outline font-bold text-sm pl-2">${i + 1}</span>`}</td>
        <td class="px-5 py-3 font-semibold text-sm">${a.name}</td>
        <td class="px-5 py-3 text-xs text-outline">${a.sport}</td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${GRADE_CLASS_MAP[a.grade]}">${a.grade}</span></td>
        <td class="px-5 py-3 text-right font-bold text-secondary">${a.score.toFixed(0)}</td>
      </tr>`
        )
        .join('');
    }

    const gridEl = document.getElementById('rec-tournament-grid');
    if (gridEl) {
      gridEl.innerHTML = tournaments
        .map((t, i) => {
          const rec = athletes.filter((a) => a.sport === t.sport).sort((a, b) => b.score - a.score).slice(0, 2);
          return `<div class="anim-card hover-lift bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm" style="animation-delay:${i * 0.05}s">
        <div class="h-24 bg-primary relative p-4 flex justify-between items-start">
          <span class="bg-secondary text-white px-2.5 py-1 rounded text-[10px] font-bold">${t.level}</span>
          <span class="text-white text-[11px]">${formatDate(t.date)}</span>
        </div>
        <div class="p-5">
          <h5 class="font-bold text-primary mb-1">${t.name}</h5>
          <p class="text-xs text-outline mb-4">${t.location}</p>
          <p class="text-[10px] font-bold uppercase text-outline mb-2">Rekomendasi Atlet</p>
          ${rec.length ? rec.map((r) => `<div class="flex items-center gap-2 mb-1.5"><div class="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary" aria-hidden="true">${initials(r.name)}</div><span class="text-sm font-semibold">${r.name}</span></div>`).join('') : '<p class="text-xs italic text-outline">Belum ada atlet yang cocok.</p>'}
        </div>
      </div>`;
        })
        .join('');
    }
  } catch (err) {
    showToast('Gagal Memuat Rekomendasi', toUserMessage(err), 'error');
  } finally {
    setPageLoading(false);
  }
}
