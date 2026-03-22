import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getDatabase, ref, get, onValue, set } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyBDHLEhcMPuI6CaC9MGrnAJxSnnZdMZwx8",
    databaseURL: "https://pms-pickleball-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "pms-pickleball",
    appId: "1:34607569124:web:85977243452d0549a734f1"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Xuất các biến ra window để booking-logic.js sử dụng
window.db = db;
window.ref = ref;
window.get = get;
window.onValue = onValue;
window.set = set;

console.log("✅ Firebase Config đã sẵn sàng.");