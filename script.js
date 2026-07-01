/* Complete Core JavaScript Orchestration Engine */

// State Management App Variables
let appState = {
    currentTab: 'quran',
    fontSize: 34, // الحجم الافتراضي للقرآن أصبح أكبر وأوضح
    misbahaCount: 0,
    misbahaTotal: 0,
    pomodoroTimer: null,
    pomodoroMinutes: 25,
    pomodoroSeconds: 0,
    isPomodoroRunning: false,
    pomodoroState: 'focus', // focus or break
    latitude: 21.4225, // default Makkah lat
    longitude: 39.8262, // default Makkah long
    qiblaAngle: 0,
    habits: {
        fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false,
        morningAthkar: false, eveningAthkar: false, quranRead: false
    },
    unlockedBadges: [],
    savedAyahs: [] // قائمة الآيات المحفوظة
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
    
    // ربط تغيير الإذاعة بتشغيل الصوت فوراً
    document.getElementById('radioSourceSelect').addEventListener('change', (e) => {
        const audioPlayer = document.getElementById('globalRadioAudio');
        audioPlayer.src = e.target.value;
        audioPlayer.play().catch(() => console.log('Autoplay blocked'));
    });
};

// 2. TIMERS & DIGITAL CLOCK SYSTEM (تم التحويل إلى توقيت السعودية نظام 12 ساعة مع التاريخين)
function initClock() {
    setInterval(() => {
        const now = new Date();
        
        // الوقت بنظام 12 ساعة (السعودية)
        const optionsTime = { 
            timeZone: 'Asia/Riyadh', 
            hour: 'numeric', 
            minute: '2-digit', 
            second: '2-digit', 
            hour12: true 
        };
        document.getElementById('digitalClock').innerText = now.toLocaleTimeString('ar-SA', optionsTime);
        
        // التاريخ الميلادي
        const optionsGregorian = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentGregorianDisplay').innerText = now.toLocaleDateString('ar-SA', optionsGregorian);
        
        // التاريخ الهجري
        const optionsHijri = { year: 'numeric', month: 'long', day: 'numeric' };
        const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', optionsHijri).format(now);
        
        // إذا لم يكن هناك تحديث من واجهة الأذان، نعتمد التاريخ الهجري الداخلي
        if(!document.getElementById('currentHijriDisplay').dataset.apiUpdated) {
            document.getElementById('currentHijriDisplay').innerText = hijriDate;
        }
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
    appState.fontSize = Math.max(16, Math.min(60, appState.fontSize + delta));
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
                // إضافة الكلاسات لتكون الآيات فخمة وواضحة جداً بخط القرآن ومتباعدة بشكل مناسب
                ayahSpan.className = "ayah-card cursor-pointer hover:bg-emerald-50 rounded px-2 transition text-stone-900 dark:text-stone-100 inline-block font-quran leading-[3.5rem]";
                ayahSpan.innerHTML = `${ayah.text} <span class="text-emerald-600 font-bold font-sans mx-2 text-xl">﴿${ayah.numberInSurah}﴾</span>`;
                // فتح نافذة الخيارات عند الضغط
                ayahSpan.onclick = () => onAyahClick(ayah.number, ayah.text, payload.data.name);
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

// معالجة تشغيل الصوت لجميع القراء بما فيهم عبدالله القرني
function playWholeSurahAudio() {
    const surahNum = document.getElementById('quranSurahSelect').value;
    const reciter = document.getElementById('quranReciterSelect').value;
    const radioStatus = document.getElementById('radioStatusText');
    const audioPlayer = document.getElementById('globalRadioAudio');
    
    radioStatus.innerText = `جاري تشغيل السورة رقم ${surahNum} بصوت القارئ المختار...`;
    
    // بناء الرابط للقارئ عبدالله القرني (استخدام خوادم mp3quran المعتمدة)
    if (reciter === 'custom_qarni') {
        let formattedSurah = surahNum.toString().padStart(3, '0');
        audioPlayer.src = `https://server6.mp3quran.net/qarni/${formattedSurah}.mp3`;
    } else {
        audioPlayer.src = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${surahNum}.mp3`;
    }
    
    audioPlayer.play().catch(err => {
        alert('يرجى الضغط على زر التشغيل (Play) في المشغل السفلي لبدء الصوت.');
    });
}

// معالجة خطأ تحميل الصوت
function handleAudioError() {
    const audioPlayer = document.getElementById('globalRadioAudio');
    if(audioPlayer.src.includes('qarni')) {
        alert('نعتذر، تلاوة الشيخ عبدالله القرني غير متوفرة حالياً في الخادم لهذه السورة، سيتم التبديل للقارئ عبدالرحمن السديس تلقائياً.');
        document.getElementById('quranReciterSelect').value = 'ar.abdurrahansudais';
        playWholeSurahAudio();
    }
}

// --- نظام الآيات المحفوظة ونافذة الخيارات (نسخ، حفظ، تفسير) --- //
let currentSelectedAyah = { text: '', number: 0, surahName: '' };

function onAyahClick(number, text, surahName) {
    currentSelectedAyah = { number, text, surahName };
    toggleAyahActionModal(true);
}

function toggleAyahActionModal(status) {
    document.getElementById('ayahActionModal').classList.toggle('hidden', !status);
}

function actionCopyAyah() {
    navigator.clipboard.writeText(currentSelectedAyah.text).then(() => {
        alert('تم نسخ الآية بنجاح!');
        toggleAyahActionModal(false);
    });
}

function actionSaveAyah() {
    const isExists = appState.savedAyahs.find(a => a.number === currentSelectedAyah.number);
    if(!isExists) {
        appState.savedAyahs.push(currentSelectedAyah);
        saveStateToLocalStorage();
        alert('تم الحفظ في قائمتك بنجاح!');
    } else {
        alert('هذه الآية محفوظة مسبقاً في قائمتك.');
    }
    toggleAyahActionModal(false);
    renderSavedAyahs();
}

function actionTafseerAyah() {
    toggleAyahActionModal(false);
    showTafseerModal(currentSelectedAyah.number, currentSelectedAyah.text);
}

function renderSavedAyahs() {
    const container = document.getElementById('savedAyahsContainer');
    if(!container) return;
    container.innerHTML = '';
    
    if(appState.savedAyahs.length === 0) {
        container.innerHTML = '<p class="text-sm font-bold text-slate-500 text-center py-4">لا توجد آيات محفوظة بعد في قائمتك.</p>';
        return;
    }
    
    appState.savedAyahs.forEach(ayah => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-xl border border-slate-100 flex justify-between items-start gap-4 shadow-sm";
        div.innerHTML = `
            <div class="flex-1 font-quran text-2xl leading-loose text-stone-800 text-right">
                ${ayah.text} <span class="text-emerald-600 text-sm font-sans font-bold block mt-1">سورة ${ayah.surahName}</span>
            </div>
            <button onclick="removeSavedAyah(${ayah.number})" class="text-red-400 hover:text-red-600 p-2 transition bg-red-50 rounded-lg"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

function removeSavedAyah(number) {
    appState.savedAyahs = appState.savedAyahs.filter(a => a.number !== number);
    saveStateToLocalStorage();
    renderSavedAyahs();
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
            <p class="font-amiri text-2xl leading-relaxed text-slate-800 text-right font-bold">${item.text}</p>
            <div class="text-xs text-slate-400 font-bold">${item.dalil}</div>
            <div class="flex justify-between items-center pt-2 border-t border-slate-200">
                <span class="text-xs font-bold text-slate-500">التكرار المطلوب: <b class="text-slate-700">${item.count}</b></span>
                <button onclick="decrementDhikrCounter(this, ${item.count})" class="bg-emerald-600 text-white font-bold text-sm px-5 py-2 rounded-xl hover:bg-emerald-700 active:scale-95 transition select-none shadow-md">
                    العداد: <span class="font-mono bg-white/20 px-2 py-0.5 rounded">${item.count}</span>
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
            btn.className = "bg-slate-300 text-slate-500 font-bold text-sm px-5 py-2 rounded-xl cursor-default select-none border";
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
            
            document.getElementById('time-Fajr').innerText = timings.Fajr;
            document.getElementById('time-Sunrise').innerText = timings.Sunrise;
            document.getElementById('time-Dhuhr').innerText = timings.Dhuhr;
            document.getElementById('time-Asr').innerText = timings.Asr;
            document.getElementById('time-Maghrib').innerText = timings.Maghrib;
            document.getElementById('time-Isha').innerText = timings.Isha;
            
            // Set Hijri Date from API for accuracy
            const hijriDisplay = document.getElementById('currentHijriDisplay');
            hijriDisplay.innerText = `${dates.hijri.day} ${dates.hijri.month.ar} ${dates.hijri.year} هـ`;
            hijriDisplay.dataset.apiUpdated = "true";
            
            // Set Compass Angle
            appState.qiblaAngle = payload.data.meta.qibla || 21.4;
            document.getElementById('quranQiblaAngle').innerText = Math.round(appState.qiblaAngle);
            document.getElementById('compassDisc').style.transform = `rotate(${-appState.qiblaAngle}deg)`;
            
            calculateNextPrayerCountdown(timings);
        });
}

function calculateNextPrayerCountdown(timings) {
    document.getElementById('nextPrayerCountdown').innerText = "تم حساب وعرض مواقيت الصلاة بنجاح";
}

// 8. ELECTRONIC MISBAHA ENGINE
function incrementMisbahaCounter() {
    appState.misbahaCount++;
    appState.misbahaTotal++;
    document.getElementById('misbahaCountDisplay').innerText = appState.misbahaCount;
    document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    
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
            <p class="text-[10px] text-slate-400 leading-tight font-bold">${badge.desc}</p>
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
                workspace.innerHTML += `<p class="mb-3 leading-loose font-quran">${processedWords.join(' ')} <b class="text-emerald-600 font-sans">[${ayah.numberInSurah}]</b></p>`;
            });
        });
}

// 12. DATA LOCALSTORAGE PERSIStence
function saveStateToLocalStorage() {
    localStorage.setItem('islamicPlatformState', JSON.stringify({
        misbahaTotal: appState.misbahaTotal,
        habits: appState.habits,
        unlockedBadges: appState.unlockedBadges,
        savedAyahs: appState.savedAyahs
    }));
}

function loadLocalStorageState() {
    const data = JSON.parse(localStorage.getItem('islamicPlatformState'));
    if (data) {
        appState.misbahaTotal = data.misbahaTotal || 0;
        appState.habits = data.habits || appState.habits;
        appState.unlockedBadges = data.unlockedBadges || [];
        appState.savedAyahs = data.savedAyahs || [];
        document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    }
    renderSavedAyahs();
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
