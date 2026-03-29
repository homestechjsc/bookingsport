export const bookingOnline = {
    init: () => {
        const checkFirebaseReady = setInterval(() => {
            if (window.db && window.onValue) {
                clearInterval(checkFirebaseReady);
                console.log("🚀 Firebase kết nối thành công!");
                bookingOnline.startApp();
            }
        }, 100);
    },

    startApp: () => {
        const dateInput = document.getElementById('view-date');
        if (dateInput && !dateInput.value) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
        dateInput.addEventListener('change', () => bookingOnline.loadData());
        bookingOnline.loadHoursHeader();
        bookingOnline.loadData();
    },

    loadHoursHeader: () => {
        const header = document.getElementById('timeline-hours-header');
        if (!header) return;
        let html = '';
        for (let i = 6; i <= 22; i++) {
            html += `<div class="hour-cell text-[9px] font-black text-slate-400 text-center border-l border-slate-100 flex-shrink-0 leading-10" style="width: 60px;">${i}:00</div>`;
        }
        header.innerHTML = html;
    },

    loadData: () => {
        const date = document.getElementById('view-date').value;
        if (!window.db || !window.onValue) return;

        const rootRef = window.ref(window.db, "/");
        window.onValue(rootRef, (snapshot) => {
            const data = snapshot.val() || {};
            console.log("Dữ liệu từ Firebase:", data);
            bookingOnline.renderAll(data.courts || {}, data.bookings || {}, date, data);
        });
    },

    renderAll: (courts, bookings, date, allData) => {
        const namesCol = document.getElementById('court-names-col');
        const rowsContainer = document.getElementById('timeline-rows');
        if (!namesCol || !rowsContainer) return;

        // Xóa nội dung cũ (icon loading) trước khi vẽ
        namesCol.innerHTML = '';
        rowsContainer.innerHTML = '';

        let namesHtml = '';
        let rowsHtml = '';
        const today = new Date().toISOString().split('T')[0];
        const priceTable = allData.config?.priceList || {};

        // Khai báo lại courtEntries để vòng lặp hoạt động
        const courtEntries = Object.entries(courts);

        courtEntries.forEach(([id, c]) => {
            const type = c.Loai_San || 'Standard';
            const price = priceTable[type] || 0;

            namesHtml += `
                <div class="h-16 flex flex-col justify-center px-2 border-b border-slate-50 bg-white">
                    <span class="text-[10px] font-black uppercase text-slate-700 truncate leading-tight">
                        ${c.Ten_San || id}
                    </span>
                    <div class="flex flex-col mt-0.5">
                        <span class="text-[8px] font-bold text-blue-500 italic uppercase leading-none">
                            ${type}
                        </span>
                        <span class="text-[9px] font-black text-rose-600 mt-1">
                            ${price > 0 ? (price / 1000).toLocaleString() + 'K' : '---'}
                        </span>
                    </div>
                </div>`;

            // Lọc chính xác các lịch đặt của sân này trong ngày chọn
            const courtBks = Object.entries(bookings).filter(([bid, b]) => b && b.Court_ID === id && b.Ngay === date);

            rowsHtml += `
                <div class="h-16 flex border-b border-slate-50 relative w-max" 
                     style="min-width: calc(17 * 60px);" 
                     onclick="bookingOnline.handleTimelineClick(event, '${id}', '${date}', '${c.Ten_San || id}')">
                    ${Array.from({length: 17}).map(() => `<div class="hour-cell border-l border-slate-50 flex-shrink-0" style="width: 60px; height: 64px;"></div>`).join('')}
                    ${bookingOnline.renderSlots(courtBks)}
                    ${(date === today && c.Trang_Thai === "Đang chơi") ? bookingOnline.renderLiveStatus(c.Gio_Vao) : ''}
                </div>`;
        });

        namesCol.innerHTML = namesHtml;
        rowsContainer.innerHTML = rowsHtml;
        console.log("🎨 Đã vẽ xong " + courtEntries.length + " sân!");
    },

    renderSlots: (bookings) => {
        if (!bookings || bookings.length === 0) return '';
        return bookings.map(([id, b]) => {
            if (!b.Bat_Dau || !b.Ket_Thuc) return '';
            const [hS, mS] = b.Bat_Dau.split(':').map(Number);
            const [hE, mE] = b.Ket_Thuc.split(':').map(Number);
            const left = (hS - 6 + mS/60) * 60;
            const width = (hE - hS + (mE - mS)/60) * 60;
            return `
                <div class="absolute rounded-lg h-12 top-2 z-20 flex items-center justify-center shadow-sm bg-slate-200 border border-slate-300 text-slate-500 pointer-events-none online-booking-slot"
                     style="left: ${left}px; width: ${width}px;">
                    <span class="text-[8px] font-black uppercase text-center leading-tight">Đã đặt</span>
                </div>`;
        }).join('');
    },

    renderLiveStatus: (gioVao) => {
        if (!gioVao) return '';
        const [hS, mS] = gioVao.split(':').map(Number);
        const now = new Date();
        const left = (hS - 6 + mS/60) * 60;
        let width = (now.getHours() - hS + (now.getMinutes() - mS)/60) * 60;
        if (width < 20) width = 20;

        return `
            <div class="absolute rounded-lg h-8 top-4 z-10 bg-orange-500/10 border-l-4 border-orange-500 flex items-center px-2 pointer-events-none"
                 style="left: ${left}px; width: ${width}px;">
                <span class="text-[7px] font-black uppercase text-orange-600 animate-pulse whitespace-nowrap italic">Đang có khách</span>
            </div>`;
    },

    handleTimelineClick: (event, courtId, date, courtName) => {
        if (event.target.closest('.online-booking-slot')) return;
        const rect = event.currentTarget.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        let hourDecimal = (offsetX / 60) + 6;
        hourDecimal = Math.round(hourDecimal * 2) / 2; 
        const hour = Math.floor(hourDecimal);
        const minute = (hourDecimal % 1) * 60;

        const elId = document.getElementById('book-court-id');
        const elDate = document.getElementById('book-date');
        const elStart = document.getElementById('book-start');
        const elEnd = document.getElementById('book-end');
        
        if (elId) elId.value = courtId;
        if (elDate) elDate.value = date;
        if (elStart) elStart.value = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        if (elEnd) elEnd.value = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        document.getElementById('display-court-name').innerText = courtName;
        const [y, m, d] = date.split('-');
        document.getElementById('display-booking-date').innerText = `${d}/${m}/${y}`;

        const form = document.getElementById('quick-booking-form');
        const overlay = document.getElementById('form-overlay');
        if(overlay && form) {
            overlay.classList.remove('hidden');
            setTimeout(() => {
                overlay.classList.add('opacity-100');
                form.classList.add('active');
            }, 10);
        }
    },

    closeForm: () => {
        const form = document.getElementById('quick-booking-form');
        const overlay = document.getElementById('form-overlay');
        if(form && overlay) {
            overlay.classList.remove('opacity-100');
            form.classList.remove('active');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }
    },

    confirm: async () => {
        const name = document.getElementById('book-name').value.trim();
        const phone = document.getElementById('book-phone').value.trim();
        const courtId = document.getElementById('book-court-id').value;
        const date = document.getElementById('book-date').value;
        const start = document.getElementById('book-start').value;
        const end = document.getElementById('book-end').value;

        if (!name || !phone) return alert("Vui lòng nhập tên và số điện thoại!");

        try {
            const newId = "BK-ON-" + Date.now();
            await window.set(window.ref(window.db, `bookings/${newId}`), {
                Court_ID: courtId, Ngay: date, Bat_Dau: start, Ket_Thuc: end,
                Ten_Khach: name + " (Web)", SDT: phone, Trang_Thai: "Chờ xác nhận",
                Tien_Coc: 0, Note: "Đặt từ Website Online"
            });
            alert("✅ Đặt sân thành công! Chúng tôi sẽ liên hệ sớm.");
            bookingOnline.closeForm();
        } catch (e) { alert("Lỗi: " + e.message); }
    }
};

window.bookingOnline = bookingOnline;
