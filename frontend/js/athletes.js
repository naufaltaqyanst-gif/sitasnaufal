// ============================================================================
// athletes.js — Modul fitur data atlet: tabel, detail, form input/edit, hapus
// ============================================================================

import { getState, getAthleteById, loadAthletes, createAthlete, updateAthlete, deleteAthleteById } from './state.js';
import { calculateScore, getGrade } from './score.js';
import { GRADE_CLASS_MAP, STATUS_COLOR_MAP } from './constants.js';
import { safeCreateChart } from './charts.js';
import { showToast, setButtonLoading, setPageLoading, confirmDialog, announce } from './ui.js';
import { validateForm, rules, bindRealtimeValidation } from './validation.js';
import { toUserMessage } from './errors.js';

function medalEmoji(type) {
  if (type.includes('Emas')) return '🥇';
  if (type.includes('Perak')) return '🥈';
  if (type.includes('Perunggu')) return '🥉';
  return '🎖️';
}
function initials(name) {
  return name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
}
function formatDate(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

let currentEval = { discipline: 8, mental: 8, leadership: 8, focus: 8, adaptability: 8 };
let evalListenersBound = false;

/** ---------- TABEL ATLET ---------- */
export async function renderAthleteTable() {
  const tbody = document.getElementById('athlete-table-body');
  if (!tbody) return;
  setPageLoading(true, 'Memuat data atlet dari server...');
  try {
    const search = document.getElementById('f-search')?.value || '';
    const region = document.getElementById('f-region')?.value || '';
    const sport = document.getElementById('f-sport')?.value || '';
    const minScore = document.getElementById('f-minscore')?.value || '';

    const list = await loadAthletes({ search, region, sport, minScore });

    const countEl = document.getElementById('athlete-count');
    if (countEl) countEl.innerText = list.length;

    tbody.innerHTML =
      list
        .map((a, i) => {
          const bestAchv = a.achievements && a.achievements[0] ? a.achievements[0] : null;
          return `<tr class="row-stagger hover:bg-background transition-colors" style="animation-delay:${i * 0.03}s">
        <td class="px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary text-sm avatar-pulse" aria-hidden="true">${initials(a.name)}</div>
            <div>
              <p class="font-bold text-primary text-sm">${a.name} ${bestAchv ? medalEmoji(bestAchv.type) : ''}</p>
              <p class="text-[11px] text-outline">${a.gender} · ${a.age} thn</p>
            </div>
          </div>
        </td>
        <td class="px-5 py-3 text-sm text-outline">${a.sport}</td>
        <td class="px-5 py-3 text-sm text-outline">${a.region}</td>
        <td class="px-5 py-3"><span class="px-2.5 py-1 rounded-full text-[10px] font-bold ${STATUS_COLOR_MAP[a.status] || 'bg-background text-outline'}">${a.status}</span></td>
        <td class="px-5 py-3 text-center">
          <span class="inline-block min-w-[40px] px-2.5 py-1 rounded-full font-bold text-xs ${GRADE_CLASS_MAP[a.grade]}">${a.grade}</span>
          <p class="text-[10px] text-outline mt-0.5 font-bold">${a.score} pts</p>
        </td>
        <td class="px-5 py-3 text-right">
          <button class="p-1.5 hover:bg-secondary/10 hover:text-secondary rounded-lg transition-all" aria-label="Lihat detail ${a.name}" title="Detail" onclick="SITAS.openDetail(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">visibility</span></button>
          <button class="p-1.5 hover:bg-background rounded-lg transition-all" aria-label="Edit data ${a.name}" title="Edit" onclick="SITAS.editAthlete(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">edit</span></button>
          <button class="p-1.5 hover:bg-error-container hover:text-error rounded-lg transition-all" aria-label="Hapus data ${a.name}" title="Hapus" onclick="SITAS.deleteAthlete(${a.id})"><span class="material-symbols-outlined text-lg" aria-hidden="true">delete</span></button>
        </td>
      </tr>`;
        })
        .join('') ||
      `<tr><td colspan="6" class="px-5 py-10 text-center text-outline">Tidak ada atlet yang cocok dengan filter.</td></tr>`;
  } catch (err) {
    showToast('Gagal Memuat Data', toUserMessage(err), 'error');
  } finally {
    setPageLoading(false);
  }
}

export function globalSearch(val, showPage) {
  showPage('athletes');
  const f = document.getElementById('f-search');
  if (f) f.value = val;
  renderAthleteTable();
}

/** ---------- HAPUS ATLET (dengan dialog konfirmasi) ---------- */
export async function deleteAthlete(id) {
  const athlete = getAthleteById(id);
  const confirmed = await confirmDialog({
    title: 'Hapus Data Atlet?',
    message: `Data "${athlete ? athlete.name : 'atlet ini'}" akan dihapus permanen dan tidak dapat dikembalikan.`,
    confirmText: 'Ya, Hapus',
    danger: true
  });
  if (!confirmed) return;

  try {
    await deleteAthleteById(id);
    showToast('Data Dihapus', 'Data atlet telah dihapus dari sistem.', 'error');
    renderAthleteTable();
  } catch (err) {
    showToast('Gagal Menghapus', toUserMessage(err), 'error');
  }
}

/** ---------- DETAIL ATLET ---------- */
export function openDetail(id, showPage) {
  const a = getAthleteById(id);
  if (!a) {
    showToast('Data Tidak Ditemukan', 'Atlet tidak ditemukan di data yang dimuat.', 'error');
    return;
  }
  const sc = a.scoreBreakdown || calculateScore(a);
  const grade = a.grade || getGrade(sc.total);

  document.getElementById('detail-content').innerHTML = `
    <aside class="col-span-12 lg:col-span-4 space-y-5">
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
        <span class="absolute top-4 right-4 px-3 py-1 rounded-full text-[10px] font-black uppercase ${a.status === 'Elite' ? 'bg-secondary text-white' : 'bg-background text-outline'}">${a.status}</span>
        <div class="w-32 h-32 mx-auto rounded-full bg-primary/10 flex items-center justify-center text-3xl font-bold text-primary mb-4 avatar-pulse">${a.photo ? `<img src="${a.photo}" class="w-full h-full object-cover rounded-full" alt="Foto ${a.name}"/>` : initials(a.name)}</div>
        <h1 class="text-xl font-bold text-primary">${a.name}</h1>
        <p class="text-outline text-sm mb-4">${a.sport} · ${a.region}</p>
        <div class="grid grid-cols-2 gap-3 pt-4 border-t border-outline-variant">
          <div class="p-3 bg-background rounded-lg"><p class="text-[10px] font-bold uppercase text-outline mb-1">Grade</p><span class="inline-block px-4 py-1.5 rounded-lg font-bold text-lg ${GRADE_CLASS_MAP[grade]}">${grade}</span></div>
          <div class="p-3 bg-background rounded-lg flex flex-col items-center justify-center"><p class="text-[10px] font-bold uppercase text-outline mb-1">Skor</p><span class="text-2xl font-extrabold text-secondary">${sc.total}</span></div>
        </div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">info</span> Informasi Umum</h3>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Jenis Kelamin</span><span class="font-semibold">${a.gender}</span></div>
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Usia</span><span class="font-semibold">${a.age} tahun</span></div>
          <div class="flex justify-between py-2 border-b border-outline-variant"><span class="text-outline">Tinggi / Berat</span><span class="font-semibold">${a.height || '-'} cm / ${a.weight || '-'} kg</span></div>
          <div class="flex justify-between py-2"><span class="text-outline">Frekuensi Latihan</span><span class="font-semibold">${a.training.sessions}x/minggu, ${a.training.duration} mnt</span></div>
        </div>
        ${a.medicalNotes ? `<div class="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg"><p class="text-[10px] font-bold uppercase text-amber-700 mb-1">Catatan Medis</p><p class="text-xs text-amber-800">${a.medicalNotes}</p></div>` : ''}
      </div>
    </aside>
    <div class="col-span-12 lg:col-span-8 space-y-5">
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-5 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">analytics</span> Kompetensi Atlet</h3>
        <div class="h-72"><canvas id="chart-detail-radar" role="img" aria-label="Grafik radar kompetensi ${a.name}"></canvas></div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl p-6 shadow-sm">
        <h3 class="font-bold text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-secondary" aria-hidden="true">emoji_events</span> Riwayat Prestasi</h3>
        <div class="space-y-3">
          ${
            a.achievements && a.achievements.length
              ? a.achievements
                  .map(
                    (ach) => `
            <div class="flex items-center gap-4 p-4 bg-background rounded-xl">
              <div class="text-3xl" aria-hidden="true">${medalEmoji(ach.type)}</div>
              <div class="flex-1"><p class="font-bold text-primary">${ach.title}</p><p class="text-xs text-outline">${ach.type}</p></div>
              <p class="font-bold text-secondary">${ach.year}</p>
            </div>`
                  )
                  .join('')
              : `<p class="text-outline text-sm italic">Belum ada prestasi tercatat.</p>`
          }
        </div>
      </div>
      <div class="anim-card bg-white border border-outline-variant rounded-2xl overflow-hidden shadow-sm">
        <div class="bg-primary text-white p-5"><h3 class="font-bold flex items-center gap-2"><span class="material-symbols-outlined text-accent" aria-hidden="true">fitness_center</span> Data Fisik &amp; Latihan</h3></div>
        <table class="w-full text-left">
          <caption class="sr-only">Data fisik dan latihan ${a.name}</caption>
          <thead class="bg-background text-[10px] font-bold uppercase text-outline"><tr><th scope="col" class="px-5 py-3">Parameter</th><th scope="col" class="px-5 py-3">Hasil</th><th scope="col" class="px-5 py-3">Kontribusi Skor</th></tr></thead>
          <tbody class="divide-y divide-outline-variant text-sm">
            <tr><td class="px-5 py-3 font-bold">VO2 Max</td><td class="px-5 py-3">${a.physical.vo2max} ml/kg/min</td><td class="px-5 py-3 text-secondary font-bold">Fisik ${sc.physScore}%</td></tr>
            <tr><td class="px-5 py-3 font-bold">Lari 30m</td><td class="px-5 py-3">${a.physical.run30m} detik</td><td class="px-5 py-3">-</td></tr>
            <tr><td class="px-5 py-3 font-bold">Vertical Jump</td><td class="px-5 py-3">${a.physical.verticalJump} cm</td><td class="px-5 py-3">-</td></tr>
            <tr><td class="px-5 py-3 font-bold">Evaluasi Pelatih</td><td class="px-5 py-3">Rata-rata ${(Object.values(a.evaluation).reduce((s, v) => s + v, 0) / 5).toFixed(1)}/10</td><td class="px-5 py-3 text-secondary font-bold">Evaluasi ${sc.evalScore}%</td></tr>
          </tbody>
        </table>
      </div>
    </div>`;

  showPage('detail');
  safeCreateChart('detailRadar', 'chart-detail-radar', {
    type: 'radar',
    data: {
      labels: ['Disiplin', 'Mental', 'Kepemimpinan', 'Fokus', 'Adaptabilitas'],
      datasets: [
        {
          label: 'Evaluasi (skala 10)',
          data: [
            a.evaluation.discipline,
            a.evaluation.mental,
            a.evaluation.leadership,
            a.evaluation.focus,
            a.evaluation.adaptability
          ],
          backgroundColor: 'rgba(0,108,73,0.2)',
          borderColor: '#006c49',
          pointBackgroundColor: '#006c49'
        }
      ]
    },
    options: { maintainAspectRatio: false, scales: { r: { min: 0, max: 10, ticks: { stepSize: 2 }, grid: { color: '#eef1f3' } } } }
  });
}

/** ---------- FORM INPUT / EDIT ---------- */
function resetEvalSliders() {
  currentEval = { discipline: 8, mental: 8, leadership: 8, focus: 8, adaptability: 8 };
  document.querySelectorAll('.eval-slider input').forEach((inp) => (inp.value = 8));
  document.querySelectorAll('.eval-slider span').forEach((s) => (s.innerText = 8));
}

export function onEvalInput(key, val) {
  currentEval[key] = parseInt(val, 10);
  const lbl = document.getElementById('lbl-' + key);
  if (lbl) lbl.innerText = val;
  updateLivePreview();
}

export function previewImage(event) {
  const file = event.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    showToast('Validasi Gagal', 'File harus berupa gambar.', 'error');
    return;
  }
  if (file.size > 2 * 1024 * 1024) {
    showToast('Validasi Gagal', 'Ukuran foto maksimal 2MB.', 'error');
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const preview = document.getElementById('photo-preview');
    preview.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover" alt="Pratinjau foto atlet"/>`;
    preview.dataset.photo = e.target.result;
  };
  reader.readAsDataURL(file);
}

function bindFormValidation() {
  const nameInput = document.getElementById('fld-name');
  const ageInput = document.getElementById('fld-age');
  if (nameInput) bindRealtimeValidation(nameInput, [rules.required('Nama atlet')]);
  if (ageInput) bindRealtimeValidation(ageInput, [rules.required('Usia'), rules.range('Usia', 10, 40)]);

  if (!evalListenersBound) {
    document.querySelectorAll('.eval-slider input').forEach((inp) => {
      inp.addEventListener('input', () => onEvalInput(inp.closest('.eval-slider').dataset.eval, inp.value));
    });
    ['fld-age', 'fld-run30m', 'fld-jump', 'fld-vo2', 'fld-sessions', 'fld-duration'].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('input', updateLivePreview);
    });
    evalListenersBound = true;
  }
}

export function openInputForm(isEdit, showPage) {
  if (!isEdit) {
    document.getElementById('athlete-form').reset();
    document.getElementById('fld-id').value = '';
    document.getElementById('input-title').innerText = 'Input Data Atlet';
    document.getElementById('photo-preview').innerHTML =
      '<span class="material-symbols-outlined text-outline text-3xl" aria-hidden="true">no_photography</span>';
    document.getElementById('photo-preview').dataset.photo = '';
    resetEvalSliders();
    document.getElementById('fld-medical').value = '';
  }
  bindFormValidation();
  showPage('input');
  updateLivePreview();
}

export function editAthlete(id, showPage) {
  const a = getAthleteById(id);
  if (!a) return;
  document.getElementById('input-title').innerText = 'Edit Data Atlet: ' + a.name;
  document.getElementById('fld-id').value = a.id;
  document.getElementById('fld-name').value = a.name;
  document.getElementById('fld-gender').value = a.gender;
  document.getElementById('fld-age').value = a.age;
  document.getElementById('fld-sport').value = a.sport;
  document.getElementById('fld-region').value = a.region;
  document.getElementById('fld-status').value = a.status;
  document.getElementById('fld-height').value = a.height || '';
  document.getElementById('fld-weight').value = a.weight || '';
  document.getElementById('fld-run30m').value = a.physical.run30m;
  document.getElementById('fld-jump').value = a.physical.verticalJump;
  document.getElementById('fld-vo2').value = a.physical.vo2max;
  document.getElementById('fld-sessions').value = a.training.sessions;
  document.getElementById('fld-duration').value = a.training.duration;
  document.getElementById('fld-medical').value = a.medicalNotes || '';
  currentEval = { ...a.evaluation };
  Object.keys(currentEval).forEach((k) => {
    const input = document.querySelector(`.eval-slider[data-eval="${k}"] input`);
    if (input) input.value = currentEval[k];
    const lbl = document.getElementById('lbl-' + k);
    if (lbl) lbl.innerText = currentEval[k];
  });
  const preview = document.getElementById('photo-preview');
  if (a.photo) {
    preview.innerHTML = `<img src="${a.photo}" class="w-full h-full object-cover" alt="Foto ${a.name}"/>`;
    preview.dataset.photo = a.photo;
  } else {
    preview.innerHTML = '<span class="material-symbols-outlined text-outline text-3xl" aria-hidden="true">no_photography</span>';
    preview.dataset.photo = '';
  }
  openInputForm(true, showPage);
}

function readAthleteFormValues() {
  return {
    id: document.getElementById('fld-id').value,
    name: document.getElementById('fld-name').value.trim(),
    age: parseInt(document.getElementById('fld-age').value, 10) || 0,
    gender: document.getElementById('fld-gender').value,
    sport: document.getElementById('fld-sport').value,
    region: document.getElementById('fld-region').value,
    status: document.getElementById('fld-status').value,
    height: parseInt(document.getElementById('fld-height').value, 10) || null,
    weight: parseInt(document.getElementById('fld-weight').value, 10) || null,
    photo: document.getElementById('photo-preview').dataset.photo || '',
    medicalNotes: document.getElementById('fld-medical').value.trim(),
    physical: {
      run30m: parseFloat(document.getElementById('fld-run30m').value) || 5,
      verticalJump: parseInt(document.getElementById('fld-jump').value, 10) || 40,
      vo2max: parseInt(document.getElementById('fld-vo2').value, 10) || 40
    },
    training: {
      sessions: parseInt(document.getElementById('fld-sessions').value, 10) || 5,
      duration: parseInt(document.getElementById('fld-duration').value, 10) || 100
    },
    evaluation: { ...currentEval }
  };
}

export function updateLivePreview() {
  const values = readAthleteFormValues();
  const existing = values.id ? getAthleteById(parseInt(values.id, 10)) : null;
  const tempAthlete = { ...values, achievements: existing ? existing.achievements : [] };

  const sc = calculateScore(tempAthlete);
  const previewScoreEl = document.getElementById('preview-score');
  if (!previewScoreEl) return;
  previewScoreEl.innerText = sc.total;
  document.getElementById('preview-bar').style.width = sc.total + '%';
  const grade = getGrade(sc.total);
  const gEl = document.getElementById('preview-grade');
  gEl.innerText = grade;
  gEl.className = 'inline-block px-8 py-3 rounded-full font-black text-3xl ' + GRADE_CLASS_MAP[grade];
  const notes = {
    'A+': 'Talenta Luar Biasa (High Potential)',
    A: 'Potensial Nasional',
    B: 'Potensial Daerah',
    C: 'Pembinaan Berkelanjutan',
    D: 'Perlu Evaluasi Lanjutan'
  };
  document.getElementById('preview-note').innerText = notes[grade];
  document.getElementById('pv-age').innerText = sc.ageScore + '%';
  document.getElementById('pv-achv').innerText = sc.achvScore + '%';
  document.getElementById('pv-phys').innerText = sc.physScore + '%';
  document.getElementById('pv-train').innerText = sc.trainScore + '%';
  document.getElementById('pv-eval').innerText = sc.evalScore + '%';

  safeCreateChart('previewRadar', 'chart-preview-radar', {
    type: 'radar',
    data: {
      labels: ['Usia', 'Prestasi', 'Fisik', 'Latihan', 'Evaluasi'],
      datasets: [
        {
          label: 'Skor Talenta',
          data: [sc.ageScore, sc.achvScore, sc.physScore, sc.trainScore, sc.evalScore],
          backgroundColor: 'rgba(0,108,73,0.18)',
          borderColor: '#006c49',
          borderWidth: 2,
          pointBackgroundColor: '#006c49',
          pointRadius: 3
        }
      ]
    },
    options: {
      maintainAspectRatio: false,
      scales: {
        r: {
          min: 0,
          max: 100,
          ticks: { stepSize: 25, backdropColor: 'transparent', font: { size: 9 } },
          grid: { color: '#eef1f3' },
          pointLabels: { font: { size: 10, weight: 'bold' } }
        }
      },
      plugins: { legend: { display: false } }
    }
  });
}

export async function submitAthleteForm(showPage) {
  const values = readAthleteFormValues();
  const submitBtn = document.getElementById('athlete-submit-btn');

  const { valid, errors } = validateForm(values, {
    name: [rules.required('Nama atlet')],
    age: [rules.required('Usia'), rules.range('Usia', 10, 40)]
  });
  if (!valid) {
    showToast('Validasi Gagal', Object.values(errors)[0], 'error');
    return;
  }

  const payload = {
    name: values.name,
    gender: values.gender,
    age: values.age,
    sport: values.sport,
    region: values.region,
    status: values.status,
    height: values.height,
    weight: values.weight,
    photo: values.photo,
    medicalNotes: values.medicalNotes,
    physical: values.physical,
    training: values.training,
    evaluation: values.evaluation
  };

  setButtonLoading(submitBtn, true, values.id ? 'Menyimpan Perubahan...' : 'Menyimpan...');
  try {
    if (values.id) {
      const existing = getAthleteById(parseInt(values.id, 10));
      payload.achievements = existing ? existing.achievements : [];
      await updateAthlete(parseInt(values.id, 10), payload);
      showToast('Berhasil Diperbarui', `Data ${values.name} telah diperbarui.`);
    } else {
      payload.achievements = [{ title: 'Baru Terdaftar', type: 'Partisipasi', year: new Date().getFullYear() }];
      await createAthlete(payload);
      showToast('Berhasil Disimpan', `Atlet ${values.name} telah didaftarkan.`);
    }
    announce('Data atlet berhasil disimpan.');
    showPage('athletes', false);
    renderAthleteTable();
  } catch (err) {
    showToast('Gagal Menyimpan', toUserMessage(err), 'error');
  } finally {
    setButtonLoading(submitBtn, false);
  }
}

export { initials, formatDate, medalEmoji };
