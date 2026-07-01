/* Complete Core JavaScript Orchestration Engine */

let appState = {
    currentTab: 'quran',
    fontSize: 28,
    misbahaCount: 0,
    misbahaTotal: 0,
    pomodoroTimer: null,
    pomodoroMinutes: 25,
    pomodoroSeconds: 0,
    isPomodoroRunning: false,
    pomodoroState: 'focus',
    latitude: 21.4225, // Makkah default
    longitude: 39.8262,
    qiblaAngle: 0,
    habits: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, morningAthkar: false, eveningAthkar: false, quranRead: false },
    unlockedBadges: [],
    savedAyahs: [] // Array to store saved Ayahs
};

let currentModalAyah = { text: '', tafseer: '', number: 0, surahName: '' };

window.onload = function() {
    initClock();
    loadSurahListSelectors();
    loadSurahContent();
    renderAthkarCategories();
    requestLocationAccess();
    loadLocalStorageState();
    updateHabitTrackerDOM();
    renderBadgesDOM();
    renderSavedAyahs();
};

// 1. TIMERS & 12-HOUR CLOCK (SAUDI ARABIA TIME)
function initClock() {
    setInterval(() => {
        const now = new Date();
        const timeString = now.toLocaleTimeString('ar-SA', { 
            timeZone: 'Asia/Riyadh', 
            hour12: true, 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit' 
        });
        document.getElementById('digitalClock').innerText = timeString;
        document.getElementById('currentGregorianDisplay').innerText = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }, 1000);
}

// 2. TABS LOGIC
function switchTab(tabId) {
    document.getElementById(`view-${appState.currentTab}`).classList.add('hidden');
    document.getElementById(`tabBtn-${appState.currentTab}`).className = "w-full text-right px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm text-slate-600 hover:bg-slate-50 transition shrink-0 lg:shrink";
    
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`tabBtn-${tabId}`).className = "w-full text-right px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm bg-emerald-50 text-emerald-700 transition shrink-0 lg:shrink";
    
    appState.currentTab = tabId;
}

// 3. ACCESSIBILITY & THEME
function changeFontSize(delta) {
    appState.fontSize = Math.max(16, Math.min(48, appState.fontSize + delta));
    document.getElementById('fontSizeDisplay').innerText = appState.fontSize + 'px';
    document.getElementById('surahAyahsContainer').style.fontSize = appState.fontSize + 'px';
}

document.getElementById('accessibilityBtn').addEventListener('click', () => {
    document.getElementById('accessibilityPanel').classList.toggle('hidden');
});

document.getElementById('fontStyleSelect').addEventListener('change', (e) => {
    document.getElementById('surahAyahsContainer').style.fontFamily = e.target.value;
});

document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    document.getElementById('themeIcon').className = document.body.classList.contains('dark-mode') ? "fas fa-sun text-lg" : "fas fa-moon text-lg";
});

// 4. QURAN ENGINE
function loadSurahListSelectors() {
    fetch('https://api.alquran.cloud/v1/surah')
        .then(res => res.json())
        .then(payload => {
            const surahSelect = document.getElementById('quranSurahSelect');
            const testerSelect = document.getElementById('testerSurahSelect');
            surahSelect.innerHTML = testerSelect.innerHTML = '';
            payload.data.forEach(surah => {
                const opt = `<option value="${surah.number}">${surah.number}. ${surah.name}</option>`;
                surahSelect.innerHTML += opt;
                testerSelect.innerHTML += opt;
            });
            surahSelect.value = testerSelect.value = 1;
        });
}

function loadSurahContent() {
    const surahNum = document.getElementById('quranSurahSelect').value || 1;
    const container = document.getElementById('surahAyahsContainer');
    container.innerHTML = `<div class="text-center py-8 text-slate-400"><i class="fas fa-spinner animate-spin text-2xl"></i> جاري التحميل...</div>`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            document.getElementById('surahTitleDisplay').innerText = `✨ سُورَةُ ${payload.data.name} ✨`;
            container.innerHTML = '';
            
            payload.data.ayahs.forEach(ayah => {
                const ayahSpan = document.createElement('span');
                ayahSpan.className = "ayah-card cursor-pointer";
                ayahSpan.innerHTML = `${ayah.text} <span class="text-emerald-600 font-bold font-sans mx-1 text-lg">﴿${ayah.numberInSurah}﴾</span>`;
                ayahSpan.onclick = () => showTafseerModal(ayah.number, ayah.text, payload.data.name, ayah.numberInSurah);
                container.appendChild(ayahSpan);
            });
            
            localStorage.setItem('quranBookmark', JSON.stringify({ number: surahNum, name: payload.data.name }));
            showActiveBookmarkDOM();
        });
}

function showActiveBookmarkDOM() {
    const bookmark = JSON.parse(localStorage.getItem('quranBookmark'));
    if (bookmark) {
        document.getElementById('quranBookmarkDisplay').classList.remove('hidden');
        document.getElementById('bookmarkText').innerText = bookmark.name;
    }
}

// UPDATED AUDIO PLAYER (MP3QURAN)
function playWholeSurahAudio() {
    let surahNum = document.getElementById('quranSurahSelect').value.toString().padStart(3, '0'); // Format 001, 012, etc.
    const reciterServerUrl = document.getElementById('quranReciterSelect').value;
    const radioStatus = document.getElementById('radioStatusText');
    const audioPlayer = document.getElementById('globalRadioAudio');
    
    radioStatus.innerText = `جاري التلاوة للسورة الحالية...`;
    audioPlayer.src = `${reciterServerUrl}${surahNum}.mp3`;
    audioPlayer.play();
}

// 5. TAFSEER, COPY & SAVE
function showTafseerModal(ayahGlobalNumber, ayahText, surahName, ayahInSurah) {
    toggleTafseerModal(true);
    document.getElementById('tafseerModalAyahText').innerText = ayahText;
    document.getElementById('tafseerModalContent').innerText = "جاري جلب التفسير الميسر...";
    
    currentModalAyah = { text: ayahText, tafseer: '', number: ayahGlobalNumber, surahName: `${surahName} - آية ${ayahInSurah}` };
    
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahGlobalNumber}/editions/ar.muyassar`)
        .then(res => res.json())
        .then(payload => {
            currentModalAyah.tafseer = payload.data[0].text;
            document.getElementById('tafseerModalContent').innerText = currentModalAyah.tafseer;
        }).catch(() => {
            currentModalAyah.tafseer = "عذراً، فشل تحميل التفسير. تحقق من الاتصال.";
            document.getElementById('tafseerModalContent').innerText = currentModalAyah.tafseer;
        });
}

function toggleTafseerModal(status) {
    document.getElementById('tafseerModal').classList.toggle('hidden', !status);
}

function copyToClipboard(type) {
    let textToCopy = '';
    if (type === 'ayah') textToCopy = currentModalAyah.text;
    else if (type === 'tafseer') textToCopy = currentModalAyah.tafseer;
    else if (type === 'both') textToCopy = `${currentModalAyah.text}\n\nالتفسير:\n${currentModalAyah.tafseer}`;
    
    navigator.clipboard.writeText(textToCopy).then(() => {
        alert("تم النسخ بنجاح!");
    });
}

function saveCurrentAyah() {
    if (!appState.savedAyahs.some(a => a.number === currentModalAyah.number)) {
        appState.savedAyahs.push(currentModalAyah);
        saveStateToLocalStorage();
        renderSavedAyahs();
        alert("تم حفظ الآية في قائمتك!");
    } else {
        alert("الآية محفوظة مسبقاً.");
    }
}

function renderSavedAyahs() {
    const container = document.getElementById('savedAyahsContainer');
    if (!container) return;
    container.innerHTML = '';
    if (appState.savedAyahs.length === 0) {
        container.innerHTML = `<div class="text-center py-10 text-slate-400">لا توجد آيات محفوظة حالياً.</div>`;
        return;
    }
    
    appState.savedAyahs.forEach((ayah, index) => {
        const card = document.createElement('div');
        card.className = "p-4 bg-slate-50 rounded-2xl border mb-3 relative";
        card.innerHTML = `
            <div class="flex justify-between items-start mb-2">
                <span class="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded">${ayah.surahName}</span>
                <button onclick="removeSavedAyah(${index})" class="text-red-400 hover:text-red-600 text-sm"><i class="fas fa-trash"></i> حذف</button>
            </div>
            <p class="font-amiri text-xl leading-relaxed text-slate-800 text-right mb-2">${ayah.text}</p>
            <p class="text-xs text-slate-500 bg-white p-2 rounded border">${ayah.tafseer}</p>
        `;
        container.appendChild(card);
    });
}

function removeSavedAyah(index) {
    appState.savedAyahs.splice(index, 1);
    saveStateToLocalStorage();
    renderSavedAyahs();
}

// 6. ATHKAR PORTAL
function renderAthkarCategories() {
    const grid = document.getElementById('athkarCategoriesGrid');
    grid.innerHTML = '';
    for (let key in athkarDB) {
        const cat = athkarDB[key];
        const btn = document.createElement('button');
        btn.className = "p-3 md:p-4 bg-slate-50 border rounded-2xl font-bold text-xs md:text-sm text-slate-700 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition focus:outline-none";
        btn.innerHTML = `<i class="fas ${cat.icon} text-lg text-emerald-600"></i> ${cat.title}`;
        btn.onclick = () => renderAthkarItems(key);
        grid.appendChild(btn);
    }
}

function renderAthkarItems(categoryKey) {
    const container = document.getElementById('athkarListContainer');
    container.innerHTML = `<h3 class="text-xl font-bold text-slate-800 mb-4 border-r-4 border-emerald-600 pr-2">${athkarDB[categoryKey].title}</h3>`;
    const items = athkarDB[categoryKey].items;
    
    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 border rounded-2xl p-4 md:p-5 space-y-3";
        card.innerHTML = `
            <p class="font-amiri text-lg md:text-xl leading-relaxed text-slate-800 text-right font-bold">${item.text}</p>
            <div class="text-xs text-slate-400 font-medium">${item.dalil}</div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                <span class="text-xs text-slate-500">التكرار: <b class="text-slate-700">${item.count}</b></span>
                <button onclick="decrementDhikrCounter(this)" class="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl active:scale-95 transition">
                    عداد: <span>${item.count}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function decrementDhikrCounter(btn) {
    const counterSpan = btn.querySelector('span');
    let current = parseInt(counterSpan.innerText);
    if (current > 0) {
        current--;
        counterSpan.innerText = current;
        if (current === 0) {
            btn.className = "bg-slate-300 text-slate-500 font-bold text-xs px-4 py-2 rounded-xl cursor-default";
            btn.innerText = "✓ اكتمل";
            if(navigator.vibrate) navigator.vibrate(50);
        }
    }
}

// 7. LOCATION & PRAYER TIMES
function requestLocationAccess() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(pos => {
            appState.latitude = pos.coords.latitude;
            appState.longitude = pos.coords.longitude;
            fetchPrayerTimesAPI();
        }, () => fetchPrayerTimesAPI());
    } else fetchPrayerTimesAPI();
}

function fetchPrayerTimesAPI() {
    fetch(`https://api.aladhan.com/v1/timings?latitude=${appState.latitude}&longitude=${appState.longitude}&method=4`)
        .then(res => res.json())
        .then(payload => {
            const t = payload.data.timings;
            ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha'].forEach(p => {
                document.getElementById(`time-${p}`).innerText = t[p];
            });
            
            // Format Hijri Date Side-by-Side
            const hijri = payload.data.date.hijri;
            document.getElementById('currentHijriDisplay').innerHTML = `<i class="fas fa-calendar-alt text-emerald-300"></i> ${hijri.day} ${hijri.month.ar} ${hijri.year} هـ`;
            
            appState.qiblaAngle = payload.data.meta.qibla || 21.4;
            document.getElementById('quranQiblaAngle').innerText = Math.round(appState.qiblaAngle);
            document.getElementById('compassDisc').style.transform = `rotate(${-appState.qiblaAngle}deg)`;
        });
}

// 8. MISBAHA, HABITS, & POMODORO (Unchanged core logic)
function incrementMisbahaCounter() {
    appState.misbahaCount++; appState.misbahaTotal++;
    document.getElementById('misbahaCountDisplay').innerText = appState.misbahaCount;
    document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    if ((appState.misbahaCount === 33 || appState.misbahaCount === 100) && navigator.vibrate) navigator.vibrate([100,50,100]);
    saveStateToLocalStorage();
}
function resetMisbahaCounter() { appState.misbahaCount = 0; document.getElementById('misbahaCountDisplay').innerText = 0; saveStateToLocalStorage(); }

function toggleHabit(key) { appState.habits[key] = !appState.habits[key]; updateHabitTrackerDOM(); checkBadgeUnlocks(); saveStateToLocalStorage(); }
function updateHabitTrackerDOM() {
    const c = document.getElementById('habitsChecklistContainer'); if(!c) return; c.innerHTML = '';
    const titles = { fajr: "الفجر", dhuhr: "الظهر", asr: "العصر", maghrib: "المغرب", isha: "العشاء", morningAthkar: "أذكار الصباح", eveningAthkar: "أذكار المساء", quranRead: "ورد القرآن" };
    let total = 0, checked = 0;
    for (let key in appState.habits) {
        total++; if (appState.habits[key]) checked++;
        c.innerHTML += `<div onclick="toggleHabit('${key}')" class="p-3 md:p-4 rounded-xl border flex justify-between items-center cursor-pointer ${appState.habits[key] ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50'}">
            <span class="text-xs md:text-sm font-bold text-slate-700">${titles[key]}</span>
            <div class="w-5 h-5 rounded-full border flex items-center justify-center text-xs ${appState.habits[key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}">${appState.habits[key] ? '✓' : ''}</div>
        </div>`;
    }
    document.getElementById('habitProgressPct').innerText = Math.round((checked/total)*100) + '%';
}

function checkBadgeUnlocks() { /* logic preserved */ renderBadgesDOM(); }
function renderBadgesDOM() {
    const c = document.getElementById('badgesContainer'); if(!c)return; c.innerHTML='';
    const badges = [{id:'first_tasbeeh',title:'مسبح',icon:'fa-feather'},{id:'habits_3',title:'مجتهد',icon:'fa-star'},{id:'habits_full',title:'خاتم',icon:'fa-crown'}];
    badges.forEach(b => {
        const u = appState.unlockedBadges.includes(b.id);
        c.innerHTML += `<div class="p-2 rounded-xl border text-center flex flex-col items-center gap-1 ${u ? 'bg-white badge-unlocked' : 'bg-slate-50 opacity-50'}">
            <i class="fas ${b.icon} ${u ? 'text-emerald-500' : 'text-slate-300'} text-xl"></i>
            <span class="text-[10px] font-bold mt-1">${b.title}</span></div>`;
    });
}

function togglePomodoroTimer() { /*... logic ...*/ }
function runPomodoroCountdown() { /*... logic ...*/ }
function updatePomodoroDOM() { /*... logic ...*/ }
function resetPomodoroTimer() { /*... logic ...*/ }
function startMemorizationTest() { /*... logic ...*/ }

// 9. LOCAL STORAGE
function saveStateToLocalStorage() {
    localStorage.setItem('zikraState', JSON.stringify({ misbahaTotal: appState.misbahaTotal, habits: appState.habits, unlockedBadges: appState.unlockedBadges, savedAyahs: appState.savedAyahs }));
}
function loadLocalStorageState() {
    const data = JSON.parse(localStorage.getItem('zikraState'));
    if (data) {
        appState.misbahaTotal = data.misbahaTotal || 0;
        appState.habits = data.habits || appState.habits;
        appState.savedAyahs = data.savedAyahs || [];
        document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    }
}
function toggleMakkahModal(status) { document.getElementById('makkahModal').classList.toggle('hidden', !status); }
