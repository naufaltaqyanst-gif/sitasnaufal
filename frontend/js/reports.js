// ============================================================================
// reports.js — Laporan agregat, grafik, dan ekspor CSV
// ============================================================================

import { getState, loadAthletes, loadTournaments } from './state.js';
import { safeCreateChart } from './charts.js';
import { showToast, confirmDialog, setPageLoading } from './ui.js';
import { toUserMessage } from './errors.js';

export async function initReportCharts() {
  setPageLoading(true, 'Menyusun laporan...');
  try {
    await Promise.all([loadAthletes(), loadTournaments()]);
    const { athletes } = getState();

    const totalEl = document.getElementById('r-total-athletes');
    const goldEl = document.getElementById('r-total-gold');
    if (totalEl) totalEl.innerText = athletes.length;
    if (goldEl) {
      goldEl.innerText = athletes.reduce(
        (s, a) => s + a.achievements.filter((x) => x.type.includes('Emas')).length,
        0
      );
    }

    const regions = [...new Set(athletes.map((a) => a.region))];
    const regionAvg = regions
      .map((r) => {
        const list = athletes.filter((a) => a.region === r);
        return { region: r, avg: list.reduce((s, a) => s + a.score, 0) / list.length };
      })
      .sort((a, b) => b.avg - a.avg);

    const topRegionEl = document.getElementById('r-top-region');
    const effEl = document.getElementById('r-efficiency');
    if (topRegionEl) topRegionEl.innerText = regionAvg[0] ? regionAvg[0].region : '-';
    if (effEl) {
      effEl.innerText = regionAvg.length
        ? Math.round(regionAvg.reduce((s, r) => s + r.avg, 0) / regionAvg.length) + '%'
        : '0%';
    }

    const gradeBuckets = { 'A+': 0, A: 0, B: 0, C: 0, D: 0 };
    athletes.forEach((a) => gradeBuckets[a.grade]++);

    safeCreateChart('gradeBar', 'chart-grade-bar', {
      type: 'bar',
      data: {
        labels: Object.keys(gradeBuckets),
        datasets: [{ data: Object.values(gradeBuckets), backgroundColor: ['#006c49', '#00875c', '#22c55e', '#f59e0b', '#75777d'], borderRadius: 10, maxBarThickness: 48 }]
      },
      options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#eef1f3' } }, x: { grid: { display: false } } } }
    });

    const sports = [...new Set(athletes.map((a) => a.sport))];
    const sportCounts = sports.map((s) => athletes.filter((a) => a.sport === s).length);
    safeCreateChart('sportReport', 'chart-sport-report', {
      type: 'pie',
      data: { labels: sports, datasets: [{ data: sportCounts, backgroundColor: ['#091426', '#006c49', '#6ffbbe', '#75777d', '#00875c'], borderWidth: 2, borderColor: '#fff' }] },
      options: { maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 10 } } } } }
    });

    const regionListEl = document.getElementById('region-efficiency-list');
    if (regionListEl) {
      regionListEl.innerHTML = regionAvg
        .map(
          (r) => `
      <div>
        <div class="flex justify-between mb-1"><span class="font-bold text-primary text-sm">${r.region}</span><span class="font-bold text-secondary">${Math.round(r.avg)}%</span></div>
        <div class="w-full bg-background h-2.5 rounded-full overflow-hidden"><div class="h-full bg-secondary score-bar-fill" style="width:${Math.round(r.avg)}%"></div></div>
      </div>`
        )
        .join('');
    }
  } catch (err) {
    showToast('Gagal Memuat Laporan', toUserMessage(err), 'error');
  } finally {
    setPageLoading(false);
  }
}

/** Ekspor CSV dengan dialog konfirmasi terlebih dahulu (aksi yang menghasilkan file/unduhan). */
export async function exportCSV(type) {
  const confirmed = await confirmDialog({
    title: 'Ekspor Data ke CSV?',
    message:
      type === 'athletes'
        ? 'File CSV berisi seluruh data atlet yang sedang dimuat akan diunduh ke perangkat Anda.'
        : 'File CSV berisi jadwal turnamen beserta rekomendasi atlet akan diunduh ke perangkat Anda.',
    confirmText: 'Ya, Ekspor'
  });
  if (!confirmed) return;

  const { athletes, tournaments } = getState();
  let csv = 'data:text/csv;charset=utf-8,';

  if (type === 'athletes') {
    csv += 'ID,Nama,JenisKelamin,Usia,CabangOlahraga,Wilayah,Status,Skor,Grade\n';
    athletes.forEach((a) => {
      csv += `${a.id},"${a.name}",${a.gender},${a.age},${a.sport},${a.region},${a.status},${a.score},${a.grade}\n`;
    });
  } else {
    csv += 'Turnamen,Tanggal,Lokasi,Cabor,AtletRekomendasi\n';
    tournaments.forEach((t) => {
      const rec = athletes.filter((a) => a.sport === t.sport).sort((a, b) => b.score - a.score)[0];
      csv += `"${t.name}",${t.date},"${t.location}",${t.sport},"${rec ? rec.name : '-'}"\n`;
    });
  }

  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csv));
  link.setAttribute('download', `sitas_sumut_${type}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast('Ekspor Berhasil', 'File CSV telah diunduh.');
}

export function downloadReportPDF() {
  const element = document.getElementById('page-reports');
  if (!element || typeof window.html2pdf === 'undefined') {
    showToast('Gagal', 'Sistem PDF belum dimuat, coba sesaat lagi.', 'error');
    return;
  }
  const opt = {
    margin: 0.5,
    filename: 'Laporan_SITAS_Sumut.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'a4', orientation: 'landscape' }
  };
  const originalBtn = document.getElementById('btn-print-report');
  const originalBack = document.getElementById('btn-back-report');
  if (originalBtn) originalBtn.style.display = 'none';
  if (originalBack) originalBack.style.display = 'none';
  showToast('Mencetak', 'Laporan PDF sedang diunduh...', 'info');
  window.html2pdf().set(opt).from(element).save().then(() => {
    if (originalBtn) originalBtn.style.display = '';
    if (originalBack) originalBack.style.display = '';
    showToast('Sukses', 'Laporan PDF berhasil diunduh.', 'success');
  });
}
