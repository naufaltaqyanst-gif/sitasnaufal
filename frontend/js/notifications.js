// ============================================================================
// notifications.js — Panel notifikasi & kalender mini turnamen
// (Data notifikasi bersifat contoh/statis di frontend; di produksi sebaiknya
// dipindah ke endpoint /api/notifications tersendiri di backend.)
// ============================================================================

import { getState } from './state.js';

const notifications = [
  { icon: 'emoji_events', color: 'bg-secondary', title: 'Talenta Baru Grade A+', body: 'Ada atlet baru mencapai skor talenta tertinggi minggu ini.', time: '10 menit lalu', unread: true },
  { icon: 'event_available', color: 'bg-primary', title: 'Turnamen Mendatang', body: 'Periksa jadwal turnamen terbaru di kalender.', time: '2 jam lalu', unread: true },
  { icon: 'person_add', color: 'bg-accent', title: 'Scout Baru Bergabung', body: 'Seorang scout lapangan baru telah mendaftar ke sistem.', time: 'Kemarin', unread: true },
  { icon: 'medical_information', color: 'bg-error', title: 'Catatan Medis Diperbarui', body: 'Status pemulihan cedera salah satu atlet diperbarui.', time: '2 hari lalu', unread: false },
  { icon: 'analytics', color: 'bg-secondary-light', title: 'Laporan Bulanan Siap', body: 'Laporan statistik scouting bulan ini telah tersedia.', time: '3 hari lalu', unread: false }
];

export function renderNotifList() {
  const el = document.getElementById('notif-list');
  if (!el) return;
  el.innerHTML = notifications
    .map(
      (n) => `
    <div class="flex items-start gap-3 px-5 py-3.5 hover:bg-background transition-colors ${n.unread ? 'bg-secondary/5' : ''}">
      <div class="w-9 h-9 rounded-lg ${n.color} flex items-center justify-center shrink-0" aria-hidden="true"><span class="material-symbols-outlined text-white text-lg">${n.icon}</span></div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-primary text-xs">${n.title}</p>
        <p class="text-[11px] text-outline mt-0.5 leading-snug">${n.body}</p>
        <p class="text-[10px] text-outline/70 mt-1 font-semibold">${n.time}</p>
      </div>
      ${n.unread ? '<span class="w-2 h-2 rounded-full bg-error mt-1.5 shrink-0" aria-label="Belum dibaca"></span>' : ''}
    </div>`
    )
    .join('');
}

export function toggleNotifPanel(evt) {
  if (evt) evt.stopPropagation();
  document.getElementById('calendar-panel')?.classList.add('hidden');
  const panel = document.getElementById('notif-panel');
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  if (willOpen) renderNotifList();
}

export function markAllNotifRead() {
  notifications.forEach((n) => (n.unread = false));
  renderNotifList();
  document.getElementById('notif-dot')?.classList.add('hidden-page');
}

let calendarViewDate = new Date();
const CAL_MONTHS_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function toggleCalendarPanel(evt) {
  if (evt) evt.stopPropagation();
  document.getElementById('notif-panel')?.classList.add('hidden');
  const panel = document.getElementById('calendar-panel');
  if (!panel) return;
  const willOpen = panel.classList.contains('hidden');
  panel.classList.toggle('hidden');
  panel.setAttribute('aria-hidden', willOpen ? 'false' : 'true');
  if (willOpen) {
    calendarViewDate = new Date();
    renderCalendarPanel();
  }
}

export function shiftCalendarMonth(delta) {
  calendarViewDate = new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth() + delta, 1);
  renderCalendarPanel();
}

export function renderCalendarPanel() {
  const year = calendarViewDate.getFullYear();
  const month = calendarViewDate.getMonth();
  const labelEl = document.getElementById('cal-month-label');
  if (labelEl) labelEl.innerText = `${CAL_MONTHS_ID[month]} ${year}`;

  const today = new Date();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const tournaments = getState().tournaments || [];
  const tourDays = tournaments
    .filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    })
    .map((t) => new Date(t.date).getDate());

  let cells = '';
  for (let i = 0; i < firstDay; i++) cells += '<span></span>';
  for (let d = 1; d <= daysInMonth; d++) {
    const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
    const hasEvent = tourDays.includes(d);
    cells += `<span class="relative h-7 w-7 mx-auto flex items-center justify-center rounded-full text-[11px] font-semibold ${isToday ? 'bg-primary text-white' : hasEvent ? 'bg-secondary/15 text-secondary' : 'text-primary hover:bg-background'}">
      ${d}${hasEvent && !isToday ? '<span class="absolute bottom-0.5 w-1 h-1 rounded-full bg-secondary" aria-hidden="true"></span>' : ''}
    </span>`;
  }
  const gridEl = document.getElementById('cal-grid');
  if (gridEl) gridEl.innerHTML = cells;

  const listEl = document.getElementById('cal-tournament-list');
  if (listEl) {
    const monthTournaments = tournaments.filter((t) => {
      const d = new Date(t.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });
    listEl.innerHTML = monthTournaments.length
      ? monthTournaments
          .map(
            (t) => `
      <div class="flex items-center gap-2 text-xs">
        <span class="w-1.5 h-1.5 rounded-full bg-secondary shrink-0" aria-hidden="true"></span>
        <span class="font-semibold text-primary truncate">${t.name}</span>
        <span class="text-outline ml-auto shrink-0">${new Date(t.date).getDate()} ${CAL_MONTHS_ID[month].slice(0, 3)}</span>
      </div>`
          )
          .join('')
      : `<p class="text-[11px] text-outline italic">Tidak ada turnamen bulan ini.</p>`;
  }
}

document.addEventListener('click', (e) => {
  const notifPanel = document.getElementById('notif-panel');
  const calPanel = document.getElementById('calendar-panel');
  if (notifPanel && !notifPanel.classList.contains('hidden') && !notifPanel.parentElement.contains(e.target)) {
    notifPanel.classList.add('hidden');
  }
  if (calPanel && !calPanel.classList.contains('hidden') && !calPanel.parentElement.contains(e.target)) {
    calPanel.classList.add('hidden');
  }
});
