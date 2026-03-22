const bookingOnline = {
    init: () => {
        // Sửa tên biến đồng nhất để không bị lỗi "not defined"
        const checkFirebaseReady = setInterval(() => {
            if (window.db && window.onValue) {
                clearInterval(checkFirebaseReady); // Dòng này đã khớp tên với biến ở trên
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
        // Lắng nghe sự kiện đổi ngày
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

    // Lắng nghe từ gốc "/" để lấy được cả nhánh 'courts' và nhánh cấu hình giá
    const rootRef = window.ref(window.db, "/");
    window.onValue(rootRef, (snapshot) => {
        const data = snapshot.val() || {};
        
        // DÒNG NÀY ĐỂ KIỂM TRA: Hãy mở Console (F12) để xem cấu trúc thực tế
        console.log("Dữ liệu từ Firebase:", data);
        
        bookingOnline.renderAll(data.courts || {}, data.bookings || {}, date, data);
    });
},

renderAll: (courts, bookings, date, allData) => {
    const namesCol = document.getElementById('court-names-col');
    const rowsContainer = document.getElementById('timeline-rows');
    if (!namesCol || !rowsContainer) return;

    let namesHtml = '';
    let rowsHtml = '';
    const today = new Date().toISOString().split('T')[0];

    // TRUY XUẤT ĐÚNG NHÁNH THEO ẢNH: config -> priceList
    const priceTable = allData.config?.priceList || {};

    Object.entries(courts).forEach(([id, c]) => {
        // Lấy loại sân từ dữ liệu sân (ví dụ: Standard, VIP1, VIP2...)
        const type = c.Loai_San || 'Standard';
        
        // Tìm giá tương ứng trong priceList (dùng đúng tên key như trong ảnh)
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

        // Phần render timeline bên phải (giữ nguyên)
        const courtBks = Object.entries(bookings).filter(([bid, b]) => b.Court_ID === id && b.Ngay === date);
        rowsHtml += `
            <div class="h-16 flex border-b border-slate-50 relative w-max" style="min-width: calc(17 * 60px);" onclick="bookingOnline.handleTimelineClick(event, '${id}', '${date}')">
                ${Array.from({length: 17}).map(() => `<div class="hour-cell border-l border-slate-50 flex-shrink-0" style="width: 60px;"></div>`).join('')}
                ${bookingOnline.renderSlots(courtBks)}
                ${(date === today && c.Trang_Thai === "Đang chơi") ? bookingOnline.renderLiveStatus(c.Gio_Vao) : ''}
            </div>`;
    });

    namesCol.innerHTML = namesHtml;
    rowsContainer.innerHTML = rowsHtml;
},
closeForm: () => {
    const form = document.getElementById('quick-booking-form');
    const overlay = document.getElementById('form-overlay');

    if (form && overlay) {
        // 1. Chạy hiệu ứng ẩn (trượt xuống và mờ đi)
        overlay.classList.remove('opacity-100');
        form.classList.remove('active');

        // 2. Đợi hiệu ứng kết thúc (300ms) rồi mới ẩn hoàn toàn khỏi màn hình
        setTimeout(() => {
            overlay.classList.add('hidden');
        }, 300);
    }
},
    renderSlots: (bookings) => {
        if (!bookings || bookings.length === 0) return ''; // Fix lỗi undefined
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
        if (!gioVao) return ''; // Fix lỗi undefined
        const [hS, mS] = gioVao.split(':').map(Number);
        const now = new Date();
        const hNow = now.getHours();
        const mNow = now.getMinutes();
        
        const left = (hS - 6 + mS/60) * 60;
        let width = (hNow - hS + (mNow - mS)/60) * 60;
        if (width < 20) width = 20;

        return `
            <div class="absolute rounded-lg h-8 top-4 z-10 bg-orange-500/10 border-l-4 border-orange-500 flex items-center px-2 pointer-events-none"
                 style="left: ${left}px; width: ${width}px;">
                <span class="text-[7px] font-black uppercase text-orange-600 animate-pulse whitespace-nowrap italic">Đang có khách</span>
            </div>`;
    },

    handleTimelineClick: (event, courtId, date) => {
        // Ngăn chặn nếu bấm trúng ô đã đặt
        if (event.target.closest('.online-booking-slot')) return;

        const rect = event.currentTarget.getBoundingClientRect();
        const offsetX = event.clientX - rect.left;
        let hourDecimal = (offsetX / 60) + 6;
        hourDecimal = Math.round(hourDecimal * 2) / 2; 
        
        const hour = Math.floor(hourDecimal);
        const minute = (hourDecimal % 1) * 60;
        const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        const endTime = `${String(hour + 1).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

        document.getElementById('book-court-id').value = courtId;
        document.getElementById('book-date').value = date;
        document.getElementById('book-start').value = startTime;
        document.getElementById('book-end').value = endTime;

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
        document.getElementById('form-overlay').classList.remove('opacity-100');
        document.getElementById('quick-booking-form').classList.remove('active');
        setTimeout(() => document.getElementById('form-overlay').classList.add('hidden'), 300);
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
            const today = new Date().toISOString().split('T')[0];
            const now = new Date();
            const nowStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

            if (date === today) {
                const courtSnap = await window.get(window.ref(window.db, `courts/${courtId}`));
                if (courtSnap.val()?.Trang_Thai === "Đang chơi" && start < nowStr) {
                    return alert("❌ Sân đang bận chơi trực tiếp. Vui lòng đặt sau " + nowStr);
                }
            }

            const snap = await window.get(window.ref(window.db, 'bookings'));
            const bks = snap.val() || {};
            const toMin = t => t.split(':').reduce((h, m) => h * 60 + +m);
            const isOver = Object.values(bks).some(b => 
                b.Court_ID === courtId && b.Ngay === date && 
                toMin(start) < toMin(b.Ket_Thuc) && toMin(end) > toMin(b.Bat_Dau)
            );

            if (isOver) return alert("❌ Khung giờ này đã bị trùng lịch!");

            const newId = "BK-ON-" + Date.now();
            await window.set(window.ref(window.db, `bookings/${newId}`), {
                Court_ID: courtId, Ngay: date, Bat_Dau: start, Ket_Thuc: end,
                Ten_Khach: name + " (Web)", SDT: phone, Trang_Thai: "Chờ xác nhận",
                Tien_Coc: 0, Note: "Đặt từ Mobile"
            });

            alert("✅ Đặt sân thành công! Chúng tôi sẽ liên hệ sớm.");
            bookingOnline.closeForm();
        } catch (e) { alert("Lỗi: " + e.message); }
    }
};

window.bookingOnline = bookingOnline;
