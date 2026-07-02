/* Complete Core JavaScript Orchestration Engine */

// State Management App Variables
let appState = {
    currentTab: 'quran',
    fontSize: 24,
    misbahaCount: 0,
    misbahaTotal: 0,
    pomodoroTimer: null,
    pomodoroMinutes: 25,
    pomodoroSeconds: 0,
    isPomodoroRunning: false,
    pomodoroState: 'focus', // focus or break
    latitude: 21.4225, // default Makkah lat
    longitude: 39.8262, // default Makkah long
    habits: {
        fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
        morningAthkar: false, eveningAthkar: false, quranRead: false
    },
    unlockedBadges: []
};

// 1. SYSTEM INITIALIZATION CORES ON WINDOW LOAD
window.onload = function() {
    initClock();
    loadSurahListSelectors();
    loadSurahContent();
    renderAthkarCategories();
    requestLocationAccess();
    loadLocalStorageState();
    updateHabitTrackerDOM();
    renderBadgesDOM();
};

// 2. TIMERS & DIGITAL CLOCK SYSTEM (KSA TIME)
function initClock() {
    setInterval(() => {
        const now = new Date();
        // ضبط التوقيت ليكون توقيت السعودية دائماً
        document.getElementById('digitalClock').innerText = now.toLocaleTimeString('ar-SA', { timeZone: 'Asia/Riyadh', hour12: false });
        
        document.getElementById('currentGregorianDisplay').innerText = now.toLocaleDateString('ar-SA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'Asia/Riyadh' });
    }, 1000);
}

// 3. CORE TABS SWITCH PANEL LOGIC
function switchTab(tabId) {
    // Hide current view
    document.getElementById(`view-${appState.currentTab}`).classList.add('hidden');
    document.getElementById(`tabBtn-${appState.currentTab}`).className = "w-full text-right px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm text-slate-600 hover:bg-slate-50 transition shrink-0 lg:shrink";
    
    // Show new view
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`tabBtn-${tabId}`).className = "w-full text-right px-4 py-3 rounded-2xl flex items-center gap-3 font-bold text-sm bg-emerald-50 text-emerald-700 transition shrink-0 lg:shrink";
    
    appState.currentTab = tabId;
}

// 4. ACCESSIBILITY ENGINE & FONTS
function changeFontSize(delta) {
    appState.fontSize = Math.max(16, Math.min(42, appState.fontSize + delta));
    document.getElementById('fontSizeDisplay').innerText = appState.fontSize + 'px';
    document.getElementById('surahAyahsContainer').style.fontSize = appState.fontSize + 'px';
}

document.getElementById('accessibilityBtn').addEventListener('click', () => {
    const panel = document.getElementById('accessibilityPanel');
    panel.classList.toggle('hidden');
});

document.getElementById('fontStyleSelect').addEventListener('change', (e) => {
    document.getElementById('surahAyahsContainer').style.fontFamily = e.target.value;
});

// Dark/Light Theme Handler
document.getElementById('themeToggleBtn').addEventListener('click', () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    document.getElementById('themeIcon').className = isDark ? "fas fa-sun text-lg" : "fas fa-moon text-lg";
});

// 5. QURAN ENGINE (API CORE INTEGRATIONS)
function loadSurahListSelectors() {
    fetch('https://api.alquran.cloud/v1/surah')
        .then(res => res.json())
        .then(payload => {
            const surahSelect = document.getElementById('quranSurahSelect');
            const testerSelect = document.getElementById('testerSurahSelect');
            surahSelect.innerHTML = '';
            testerSelect.innerHTML = '';
            payload.data.forEach(surah => {
                const opt = `<option value="${surah.number}">${surah.number}. ${surah.name} (${surah.englishName})</option>`;
                surahSelect.innerHTML += opt;
                testerSelect.innerHTML += opt;
            });
            // Pre-select first surah
            surahSelect.value = 1;
            testerSelect.value = 1;
        }).catch(err => console.error("Error fetching surah list", err));
}

function loadSurahContent() {
    const surahNum = document.getElementById('quranSurahSelect').value || 1;
    const container = document.getElementById('surahAyahsContainer');
    container.innerHTML = `<div class="text-center text-sm py-8 text-slate-400"><i class="fas fa-spinner animate-spin"></i> جاري تحميل السورة الكريمة...</div>`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            document.getElementById('surahTitleDisplay').innerText = `✨ سُورَةُ ${payload.data.name} ✨`;
            container.innerHTML = '';
            
            payload.data.ayahs.forEach(ayah => {
                const ayahSpan = document.createElement('span');
                ayahSpan.className = "ayah-card cursor-pointer hover:bg-slate-100 rounded px-1 transition text-black inline-block"; // Forced black text
                ayahSpan.innerHTML = `${ayah.text} <span class="text-emerald-600 font-bold font-sans mx-1 text-base">﴿${ayah.numberInSurah}﴾</span>`;
                ayahSpan.onclick = () => showTafseerModal(ayah.number, ayah.text);
                container.appendChild(ayahSpan);
            });
            
            // Auto save bookmark via localStorage
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

// Play complete audio for the selected reciter
function playWholeSurahAudio() {
    const surahNum = document.getElementById('quranSurahSelect').value;
    const reciter = document.getElementById('quranReciterSelect').value;
    const radioStatus = document.getElementById('radioStatusText');
    const audioPlayer = document.getElementById('globalRadioAudio');
    
    radioStatus.innerText = `جاري تشغيل السورة رقم ${surahNum} بصوت القارئ المختار...`;
    audioPlayer.src = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${surahNum}.mp3`;
    audioPlayer.play();
}

function showTafseerModal(ayahGlobalNumber, ayahText) {
    toggleTafseerModal(true);
    document.getElementById('tafseerModalAyahText').innerText = ayahText;
    document.getElementById('tafseerModalContent').innerText = "جاري جلب التفسير الميسر...";
    
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahGlobalNumber}/editions/ar.jalalayn`)
        .then(res => res.json())
        .then(payload => {
            const content = payload.data[0].text;
            document.getElementById('tafseerModalContent').innerText = content;
        }).catch(() => {
            document.getElementById('tafseerModalContent').innerText = "عذراً، فشل تحميل التفسير حالياً. يرجى التحقق من اتصال الإنترنت.";
        });
}

function toggleTafseerModal(status) {
    document.getElementById('tafseerModal').classList.toggle('hidden', !status);
}

// MOBILE UI TOGGLE HELPERS
function toggleMobileAudioBar() {
    const content = document.getElementById('bottomAudioContent');
    const arrow = document.getElementById('mobileAudioBarArrow');
    if (content.classList.contains('hidden')) {
        content.classList.remove('hidden');
        content.classList.add('flex');
        arrow.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
        content.classList.add('hidden');
        content.classList.remove('flex');
        arrow.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

function toggleAudioSettings() {
    const panel = document.getElementById('audioSettingsPanel');
    const arrow = document.getElementById('audioSettingsArrow');
    if (panel.classList.contains('hidden')) {
        panel.classList.remove('hidden', 'md:grid');
        panel.classList.add('grid');
        if(arrow) arrow.classList.replace('fa-chevron-down', 'fa-chevron-up');
    } else {
        panel.classList.add('hidden', 'md:grid');
        panel.classList.remove('grid');
        if(arrow) arrow.classList.replace('fa-chevron-up', 'fa-chevron-down');
    }
}

// 6. ATHKAR PORTAL MODULES
function renderAthkarCategories() {
    const grid = document.getElementById('athkarCategoriesGrid');
    grid.innerHTML = '';
    for (let key in athkarDB) {
        const cat = athkarDB[key];
        const btn = document.createElement('button');
        btn.className = "p-4 bg-slate-50 border rounded-2xl font-bold text-sm text-slate-700 flex flex-col items-center gap-2 hover:bg-emerald-50 hover:text-emerald-700 transition focus:outline-none";
        btn.innerHTML = `<i class="fas ${cat.icon} text-lg text-emerald-600"></i> ${cat.title}`;
        btn.onclick = () => renderAthkarItems(key);
        grid.appendChild(btn);
    }
}

function renderAthkarItems(categoryKey) {
    const container = document.getElementById('athkarListContainer');
    container.innerHTML = `<h3 class="text-xl font-bold text-slate-800 mb-4 border-r-4 border-emerald-600 pr-2">${athkarDB[categoryKey].title}</h3>`;
    
    const items = athkarDB[categoryKey].items;
    if (items.length === 0) {
        container.innerHTML += `<div class="p-6 text-center text-slate-400">سيتم إضافة المزيد من الأدعية قريباً لهذا القسم.</div>`;
        return;
    }

    items.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = "bg-slate-50 border rounded-2xl p-5 space-y-3 transition relative group";
        card.innerHTML = `
            <p class="font-amiri text-xl leading-relaxed text-slate-800 text-right font-bold">${item.text}</p>
            <div class="text-xs text-slate-400 font-medium">${item.dalil}</div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-100">
                <span class="text-xs text-slate-400">التكرار المطلوب: <b class="text-slate-600">${item.count}</b></span>
                <button onclick="decrementDhikrCounter(this, ${item.count})" class="bg-emerald-600 text-white font-bold text-xs px-4 py-2 rounded-xl hover:bg-emerald-700 active:scale-95 transition select-none">
                    عداد: <span class="font-mono bg-white/20 px-1.5 py-0.5 rounded">${item.count}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function decrementDhikrCounter(btn, maxCount) {
    const counterSpan = btn.querySelector('span');
    let current = parseInt(counterSpan.innerText);
    if (current > 0) {
        current--;
        counterSpan.innerText = current;
        if (current === 0) {
            btn.className = "bg-slate-300 text-slate-500 font-bold text-xs px-4 py-2 rounded-xl cursor-default select-none";
            btn.innerText = "✓ تم بالكامل";
            triggerHapticFeedback();
        }
    }
}

// 7. LOCATION & PRAYER TIMES ENGINE
function requestLocationAccess() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            appState.latitude = position.coords.latitude;
            appState.longitude = position.coords.longitude;
            fetchPrayerTimesAPI();
        }, () => {
            // Fallback to default Makkah coordinates if user denies permission
            fetchPrayerTimesAPI();
        });
    } else {
        fetchPrayerTimesAPI();
    }
}

function fetchPrayerTimesAPI() {
    const url = `https://api.aladhan.com/v1/timings?latitude=${appState.latitude}&longitude=${appState.longitude}&method=4`;
    fetch(url)
        .then(res => res.json())
        .then(payload => {
            const timings = payload.data.timings;
            const dates = payload.data.date;
            
            // Set values inside cards
            document.getElementById('time-Fajr').innerText = timings.Fajr;
            document.getElementById('time-Sunrise').innerText = timings.Sunrise;
            document.getElementById('time-Dhuhr').innerText = timings.Dhuhr;
            document.getElementById('time-Asr').innerText = timings.Asr;
            document.getElementById('time-Maghrib').innerText = timings.Maghrib;
            document.getElementById('time-Isha').innerText = timings.Isha;
            
            // Set Hijri Date
            document.getElementById('currentHijriDisplay').innerText = `${dates.hijri.day} ${dates.hijri.month.ar} ${dates.hijri.year} هـ`;
            
            calculateNextPrayerCountdown(timings);
        });
}

function calculateNextPrayerCountdown(timings) {
    document.getElementById('nextPrayerCountdown').innerText = "صلواتك نور حياتك";
}

// 8. ELECTRONIC MISBAHA ENGINE
function incrementMisbahaCounter() {
    appState.misbahaCount++;
    appState.misbahaTotal++;
    document.getElementById('misbahaCountDisplay').innerText = appState.misbahaCount;
    document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    
    // Auto feedback targets at 33 or 100
    if (appState.misbahaCount === 33 || appState.misbahaCount === 100) {
        triggerHapticFeedback();
    }
    saveStateToLocalStorage();
}

function resetMisbahaCounter() {
    appState.misbahaCount = 0;
    document.getElementById('misbahaCountDisplay').innerText = 0;
    saveStateToLocalStorage();
}

// 9. DAILY HABITS TRACKER & BADGES GAMIFICATION
function toggleHabit(habitKey) {
    appState.habits[habitKey] = !appState.habits[habitKey];
    updateHabitTrackerDOM();
    checkBadgeUnlocks();
    saveStateToLocalStorage();
}

function updateHabitTrackerDOM() {
    const habitsContainer = document.getElementById('habitsChecklistContainer');
    if (!habitsContainer) return;
    habitsContainer.innerHTML = '';
    
    const habitTitles = {
        fajr: "صلاة الفجر في وقتها",
        dhuhr: "صلاة الظهر في وقتها",
        asr: "صلاة العصر في وقتها",
        maghrib: "صلاة المغرب في وقتها",
        isha: "صلاة العشاء في وقتها",
        morningAthkar: "قراءة أذكار الصباح كاملة",
        eveningAthkar: "قراءة أذكار المساء كاملة",
        quranRead: "تلاوة الورد اليومي للقرآن"
    };

    let total = 0, checked = 0;
    for (let key in appState.habits) {
        total++;
        if (appState.habits[key]) checked++;
        
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl border flex justify-between items-center cursor-pointer transition ${appState.habits[key] ? 'bg-emerald-50/60 border-emerald-300' : 'bg-slate-50'}`;
        card.onclick = () => toggleHabit(key);
        card.innerHTML = `
            <span class="text-sm font-bold text-slate-700">${habitTitles[key]}</span>
            <div class="w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${appState.habits[key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}">
                ${appState.habits[key] ? '✓' : ''}
            </div>
        `;
        habitsContainer.appendChild(card);
    }
    
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    document.getElementById('habitProgressPct').innerText = pct + '%';
}

function renderBadgesDOM() {
    const container = document.getElementById('badgesContainer');
    if (!container) return;
    container.innerHTML = '';
    
    const badges = [
        { id: 'first_tasbeeh', title: 'المسبّح المبتدئ', desc: 'تجاوز عداد تسبيحك 33 مرة', icon: 'fa-feather' },
        { id: 'habits_3', title: 'المجتهد الصالح', desc: 'إتمام 3 عبادات يومية', icon: 'fa-star' },
        { id: 'habits_full', title: 'خادم السنن والنور', desc: 'إنجاز جميع عبادات اليوم كاملة', icon: 'fa-crown' }
    ];

    badges.forEach(badge => {
        const isUnlocked = appState.unlockedBadges.includes(badge.id);
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl border text-center transition flex flex-col items-center gap-2 ${isUnlocked ? 'bg-white badge-unlocked' : 'bg-slate-100 opacity-50'}`;
        card.innerHTML = `
            <div class="w-12 h-12 rounded-full ${isUnlocked ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-lg"><i class="fas ${badge.icon}"></i></div>
            <h4 class="font-bold text-xs text-slate-800">${badge.title}</h4>
            <p class="text-[10px] text-slate-400 leading-tight">${badge.desc}</p>
        `;
        container.appendChild(card);
    });
}

function checkBadgeUnlocks() {
    if (appState.misbahaTotal >= 33 && !appState.unlockedBadges.includes('first_tasbeeh')) {
        appState.unlockedBadges.push('first_tasbeeh');
    }
    let checkedCount = Object.values(appState.habits).filter(Boolean).length;
    if (checkedCount >= 3 && !appState.unlockedBadges.includes('habits_3')) {
        appState.unlockedBadges.push('habits_3');
    }
    if (checkedCount === 8 && !appState.unlockedBadges.includes('habits_full')) {
        appState.unlockedBadges.push('habits_full');
    }
    renderBadgesDOM();
}

// 10. ISLAMIC POMODORO TIMER CORE
function togglePomodoroTimer() {
    const btn = document.getElementById('pomoStartBtn');
    if (appState.isPomodoroRunning) {
        clearInterval(appState.pomodoroTimer);
        appState.isPomodoroRunning = false;
        btn.innerHTML = `<i class="fas fa-play ml-1"></i> استئناف المؤقت`;
    } else {
        appState.isPomodoroRunning = true;
        btn.innerHTML = `<i class="fas fa-pause ml-1"></i> إيقاف مؤقت`;
        appState.pomodoroTimer = setInterval(runPomodoroCountdown, 1000);
    }
}

function runPomodoroCountdown() {
    if (appState.pomodoroSeconds === 0) {
        if (appState.pomodoroMinutes === 0) {
            triggerHapticFeedback();
            if (appState.pomodoroState === 'focus') {
                appState.pomodoroState = 'break';
                appState.pomodoroMinutes = 5;
                document.getElementById('pomoStateText').innerText = "وقت الاستراحة والذكر القصير (5 دقائق)";
                document.getElementById('globalRadioAudio').src = "https://backup.quraan.us/arabic";
                document.getElementById('globalRadioAudio').play();
            } else {
                appState.pomodoroState = 'focus';
                appState.pomodoroMinutes = 25;
                document.getElementById('pomoStateText').innerText = "وقت التركيز والإنتاجية";
            }
            togglePomodoroTimer(); 
            return;
        }
        appState.pomodoroMinutes--;
        appState.pomodoroSeconds = 59;
    } else {
        appState.pomodoroSeconds--;
    }
    updatePomodoroDOM();
}

function updatePomodoroDOM() {
    const m = appState.pomodoroMinutes.toString().padStart(2, '0');
    const s = appState.pomodoroSeconds.toString().padStart(2, '0');
    document.getElementById('pomoTimeDisplay').innerText = `${m}:${s}`;
}

function resetPomodoroTimer() {
    clearInterval(appState.pomodoroTimer);
    appState.isPomodoroRunning = false;
    appState.pomodoroState = 'focus';
    appState.pomodoroMinutes = 25;
    appState.pomodoroSeconds = 0;
    document.getElementById('pomoStartBtn').innerHTML = `<i class="fas fa-play ml-1"></i> بدء المؤقت`;
    document.getElementById('pomoStateText').innerText = "وقت التركيز والإنتاجية";
    updatePomodoroDOM();
}

// 11. MEMORIZATION TESTING TOOL
function startMemorizationTest() {
    const surahNum = document.getElementById('testerSurahSelect').value;
    const workspace = document.getElementById('testerWorkspace');
    workspace.classList.remove('hidden');
    workspace.innerHTML = `<i class="fas fa-spinner animate-spin text-slate-400"></i> جاري توليد مراجعة عشوائية...`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            workspace.innerHTML = '';
            payload.data.ayahs.slice(0, 5).forEach(ayah => {
                let words = ayah.text.split(' ');
                let processedWords = words.map(w => {
                    if (Math.random() < 0.3) {
                        return `<span class="bg-amber-100 px-3 border-b-2 border-amber-400 text-transparent hover:text-slate-800 transition rounded select-none cursor-pointer" title="انقر لعرض الكلمة المخفية">${w}</span>`;
                    }
                    return w;
                });
                workspace.innerHTML += `<p class="mb-3">${processedWords.join(' ')} <b class="text-emerald-600 font-sans">[${ayah.numberInSurah}]</b></p>`;
            });
        });
}

// 12. DATA LOCALSTORAGE PERSIStence
function saveStateToLocalStorage() {
    localStorage.setItem('islamicPlatformState', JSON.stringify({
        misbahaTotal: appState.misbahaTotal,
        habits: appState.habits,
        unlockedBadges: appState.unlockedBadges
    }));
}

function loadLocalStorageState() {
    const data = JSON.parse(localStorage.getItem('islamicPlatformState'));
    if (data) {
        appState.misbahaTotal = data.misbahaTotal || 0;
        appState.habits = data.habits || appState.habits;
        appState.unlockedBadges = data.unlockedBadges || [];
        document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    }
}

// Utility Helpers
function triggerHapticFeedback() {
    if (navigator.vibrate) {
        navigator.vibrate([100, 50, 100]);
    }
}

function toggleMakkahModal(status) {
    document.getElementById('makkahModal').classList.toggle('hidden', !status);
}

// Dashboard View Toggle Fullscreen Mode Helper
document.getElementById('dashboardModeBtn').addEventListener('click', () => {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            alert(`خطأ أثناء تفعيل الوضع الكامل: ${err.message}`);
        });
    } else {
        document.exitFullscreen();
    }
});
