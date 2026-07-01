/* Complete Core JavaScript Orchestration Engine */

// State Management App Variables
let appState = {
    currentTab: 'quran',
    fontSize: 38, // حجم المصحف الواضح جداً كافتراضي
    misbahaCount: 0,
    misbahaTotal: 0,
    pomodoroTimer: null,
    pomodoroMinutes: 25,
    pomodoroSeconds: 0,
    isPomodoroRunning: false,
    pomodoroState: 'focus',
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

// متغير للاحتفاظ ببيانات الآيات الحالية للتحكم بالصوت
let currentSurahAyahsData = [];

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
    
    // ربط تغيير إذاعة الشريط السفلي بتشغيل الصوت فوراً
    document.getElementById('radioSourceSelect').addEventListener('change', (e) => {
        const audioPlayer = document.getElementById('globalRadioAudio');
        audioPlayer.src = e.target.value;
        // سيتم التشغيل مباشرة إذا كان المستخدم قد تفاعل مسبقاً
        audioPlayer.play().catch(() => console.log('Autoplay blocked pending user interaction'));
    });
    
    // إعدادات تكرار مشغل القرآن
    document.getElementById('quranDedicatedAudio').addEventListener('ended', handleQuranAudioEnded);
};

// 2. TIMERS & DIGITAL CLOCK SYSTEM (توقيت السعودية 12 ساعة)
function initClock() {
    setInterval(() => {
        const now = new Date();
        const optionsTime = { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
        document.getElementById('digitalClock').innerText = now.toLocaleTimeString('ar-SA', optionsTime);
        
        const optionsGregorian = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentGregorianDisplay').innerText = now.toLocaleDateString('ar-SA', optionsGregorian);
        
        const optionsHijri = { year: 'numeric', month: 'long', day: 'numeric' };
        const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', optionsHijri).format(now);
        
        if(!document.getElementById('currentHijriDisplay').dataset.apiUpdated) {
            document.getElementById('currentHijriDisplay').innerText = hijriDate;
        }
    }, 1000);
}

// 3. CORE TABS SWITCH PANEL LOGIC
function switchTab(tabId) {
    document.getElementById(`view-${appState.currentTab}`).classList.add('hidden');
    document.getElementById(`tabBtn-${appState.currentTab}`).className = "w-full text-right px-4 py-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm text-slate-600 hover:bg-slate-50 transition shrink-0 lg:shrink";
    
    document.getElementById(`view-${tabId}`).classList.remove('hidden');
    document.getElementById(`tabBtn-${tabId}`).className = "w-full text-right px-4 py-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm bg-emerald-50 text-emerald-700 transition shrink-0 lg:shrink shadow-sm border border-emerald-100";
    
    appState.currentTab = tabId;
}

// 4. ACCESSIBILITY ENGINE & FONTS
function changeFontSize(delta) {
    appState.fontSize = Math.max(18, Math.min(60, appState.fontSize + delta));
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
            surahSelect.value = 1;
            testerSelect.value = 1;
        }).catch(err => console.error("Error fetching surah list", err));
}

// يتم استدعائها عند تغيير السورة أو للذهاب لآية معينة
function loadSurahContent(scrollToAyahNumber = null) {
    const surahNum = document.getElementById('quranSurahSelect').value || 1;
    const container = document.getElementById('surahAyahsContainer');
    const ayahSelect = document.getElementById('quranAyahSelect');
    
    container.innerHTML = `<div class="text-center text-sm py-12 text-slate-400 font-sans"><i class="fas fa-spinner animate-spin text-3xl mb-4"></i><br>جاري تحميل السورة الكريمة...</div>`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            document.getElementById('surahTitleDisplay').innerText = `✨ سُورَةُ ${payload.data.name} ✨`;
            container.innerHTML = '';
            
            // تهيئة قائمة اختيار الآيات للصوت
            currentSurahAyahsData = payload.data.ayahs;
            ayahSelect.innerHTML = '<option value="all">تشغيل السورة كاملة</option>';
            
            payload.data.ayahs.forEach(ayah => {
                // تعبئة قائمة الآيات
                ayahSelect.innerHTML += `<option value="${ayah.number}">الآية رقم ${ayah.numberInSurah}</option>`;
                
                // رسم الآية في المصحف
                const ayahSpan = document.createElement('span');
                ayahSpan.className = "ayah-card font-quran text-stone-800 dark:text-stone-100 inline-block";
                ayahSpan.id = `ayah-node-${ayah.number}`; // ID للذهاب للآية
                // استخدام رقم الآية بالزخرفة الإسلامية 
                ayahSpan.innerHTML = `${ayah.text} <span class="text-emerald-700 font-bold font-sans mx-1.5 text-xl opacity-90">﴿${ayah.numberInSurah}﴾</span>`;
                
                ayahSpan.onclick = () => onAyahClick(ayah.number, ayah.text, payload.data.name);
                container.appendChild(ayahSpan);
            });
            
            localStorage.setItem('quranBookmark', JSON.stringify({ number: surahNum, name: payload.data.name }));
            showActiveBookmarkDOM();
            
            // إذا كان هناك طلب للذهاب لآية محددة (من قائمة الحفظ)
            if(scrollToAyahNumber) {
                setTimeout(() => {
                    const targetSpan = document.getElementById(`ayah-node-${scrollToAyahNumber}`);
                    if(targetSpan) {
                        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        // إضافة تأثير الإضاءة
                        targetSpan.classList.add('highlight-ayah');
                        setTimeout(() => targetSpan.classList.remove('highlight-ayah'), 3000);
                    }
                }, 500); // مهلة بسيطة لضمان اكتمال الرسم
            }
        });
}

function showActiveBookmarkDOM() {
    const bookmark = JSON.parse(localStorage.getItem('quranBookmark'));
    if (bookmark) {
        document.getElementById('quranBookmarkDisplay').classList.remove('hidden');
        document.getElementById('bookmarkText').innerText = bookmark.name;
    }
}

// -- نظام الصوت الذكي للقرآن (يحل مشكلة التوقف ويجبر على الاختيار) --
function playQuranAudio() {
    const surahNum = document.getElementById('quranSurahSelect').value;
    const ayahVal = document.getElementById('quranAyahSelect').value;
    const reciter = document.getElementById('quranReciterSelect').value;
    const audioPlayer = document.getElementById('quranDedicatedAudio');
    
    // إذا اختار عبدالله القرني، لا يتوفر إلا سورة كاملة حالياً
    if(reciter === 'custom_qarni') {
        if(ayahVal !== 'all') {
            alert('تنبيه: القارئ الشيخ عبدالله القرني متوفر لـ "تشغيل السورة كاملة" فقط في الخادم الحالي. سيتم تشغيل السورة كاملة.');
            document.getElementById('quranAyahSelect').value = 'all';
        }
        let formattedSurah = surahNum.toString().padStart(3, '0');
        audioPlayer.src = `https://server6.mp3quran.net/qarni/${formattedSurah}.mp3`;
    } else {
        // قراء آخرين يدعمون سورة أو آية
        if (ayahVal === 'all') {
            // سورة كاملة
            audioPlayer.src = `https://cdn.islamic.network/quran/audio-surah/128/${reciter}/${surahNum}.mp3`;
        } else {
            // آية محددة (ayahVal يحمل الـ global number)
            audioPlayer.src = `https://cdn.islamic.network/quran/audio/128/${reciter}/${ayahVal}.mp3`;
        }
    }
    
    // تشغيل وإظهار خطأ لو منع المتصفح
    audioPlayer.play().catch(err => {
        alert('يرجى التأكد من الضغط على زر التشغيل بالمشغل الصوتي. سياسة المتصفح تمنع التشغيل التلقائي.');
    });
}

// معالجة التكرار
function handleQuranAudioEnded() {
    const repeatMode = document.getElementById('quranRepeatMode').value;
    const audioPlayer = document.getElementById('quranDedicatedAudio');
    if (repeatMode === 'repeat') {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    }
}


// --- نظام الآيات المحفوظة ونافذة الخيارات (نسخ، حفظ، تفسير) --- //
let currentSelectedAyah = { text: '', number: 0, surahName: '', surahNumber: 1 };

function onAyahClick(number, text, surahName) {
    const surahNumber = document.getElementById('quranSurahSelect').value;
    currentSelectedAyah = { number, text, surahName, surahNumber };
    
    // اقتطاع الآية للعرض في النافذة
    const previewText = text.length > 50 ? text.substring(0, 50) + "..." : text;
    document.getElementById('ayahModalPreviewText').innerText = `﴿ ${previewText} ﴾`;
    
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

// عرض الآيات المحفوظة وتفعيل الذهاب إليها
function renderSavedAyahs() {
    const container = document.getElementById('savedAyahsContainer');
    if(!container) return;
    container.innerHTML = '';
    
    if(appState.savedAyahs.length === 0) {
        container.innerHTML = '<p class="text-sm font-bold text-slate-500 text-center py-4 bg-white rounded-xl border">لا توجد آيات محفوظة بعد في قائمتك.</p>';
        return;
    }
    
    appState.savedAyahs.forEach(ayah => {
        const div = document.createElement('div');
        div.className = "bg-white p-4 rounded-xl border border-slate-200 flex justify-between items-center gap-4 shadow-sm hover:border-emerald-300 transition cursor-pointer";
        
        // عند الضغط على النص ينتقل للآية
        div.innerHTML = `
            <div class="flex-1 font-quran text-2xl md:text-3xl leading-relaxed text-stone-800 text-right truncate" onclick="goToAyah(${ayah.surahNumber}, ${ayah.number})" title="انقر للذهاب إلى الآية">
                ${ayah.text} <span class="text-emerald-600 text-xs font-sans font-black block mt-2 tracking-wide">سورة ${ayah.surahName}</span>
            </div>
            <button onclick="removeSavedAyah(${ayah.number}); event.stopPropagation();" class="text-red-400 hover:text-white hover:bg-red-500 p-3 transition bg-red-50 rounded-xl shadow-sm"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

// دالة الانتقال للآية
function goToAyah(surahNumber, ayahGlobalNumber) {
    // إغلاق قائمة الحفظ
    document.getElementById('savedAyahsContainer').classList.add('hidden');
    // تبديل النافذة إلى القرآن إذا كان في مكان آخر
    switchTab('quran');
    
    const surahSelect = document.getElementById('quranSurahSelect');
    
    // إذا كانت السورة الحالية هي المطلوبة
    if(surahSelect.value == surahNumber) {
        const targetSpan = document.getElementById(`ayah-node-${ayahGlobalNumber}`);
        if(targetSpan) {
            targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetSpan.classList.add('highlight-ayah');
            setTimeout(() => targetSpan.classList.remove('highlight-ayah'), 3000);
        } else {
             // في حال لم تجدها لأي سبب أعد التحميل
             loadSurahContent(ayahGlobalNumber);
        }
    } else {
        // تغيير السورة بالسيليكت وتحميلها وتمرير رقم الآية لعمل السكرول
        surahSelect.value = surahNumber;
        loadSurahContent(ayahGlobalNumber);
    }
}

function removeSavedAyah(number) {
    appState.savedAyahs = appState.savedAyahs.filter(a => a.number !== number);
    saveStateToLocalStorage();
    renderSavedAyahs();
}

function showTafseerModal(ayahGlobalNumber, ayahText) {
    toggleTafseerModal(true);
    document.getElementById('tafseerModalAyahText').innerText = ayahText;
    document.getElementById('tafseerModalContent').innerHTML = '<i class="fas fa-spinner animate-spin"></i> جاري جلب التفسير...';
    
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
        btn.className = "p-5 bg-white border border-slate-200 shadow-sm rounded-2xl font-black text-sm text-slate-700 flex flex-col items-center gap-3 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-800 transition focus:outline-none active:scale-95";
        btn.innerHTML = `<i class="fas ${cat.icon} text-2xl text-emerald-600"></i> ${cat.title}`;
        btn.onclick = () => renderAthkarItems(key);
        grid.appendChild(btn);
    }
}

function renderAthkarItems(categoryKey) {
    const container = document.getElementById('athkarListContainer');
    container.innerHTML = `<h3 class="text-xl md:text-2xl font-extrabold text-slate-800 mb-6 border-r-4 border-emerald-600 pr-3">${athkarDB[categoryKey].title}</h3>`;
    
    const items = athkarDB[categoryKey].items;
    if (items.length === 0) {
        container.innerHTML += `<div class="p-6 text-center text-slate-400 font-bold bg-slate-50 rounded-2xl border">سيتم إضافة المزيد من الأدعية قريباً.</div>`;
        return;
    }

    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-2xl p-5 md:p-8 space-y-4 shadow-sm hover:shadow-md transition";
        card.innerHTML = `
            <p class="font-amiri text-2xl md:text-3xl leading-loose text-slate-800 text-right font-bold">${item.text}</p>
            <div class="text-sm text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100"><i class="fas fa-book-medical ml-1 text-amber-500"></i> ${item.dalil}</div>
            <div class="flex flex-col md:flex-row justify-between items-center pt-4 mt-2 border-t border-slate-100 gap-4">
                <span class="text-sm font-black text-slate-500">التكرار المطلوب: <b class="text-emerald-700 text-lg mx-1">${item.count}</b> مرات</span>
                <button onclick="decrementDhikrCounter(this, ${item.count})" class="w-full md:w-auto bg-emerald-600 text-white font-bold text-base px-8 py-3.5 rounded-xl hover:bg-emerald-700 active:scale-95 transition shadow-md shadow-emerald-600/30 flex justify-center items-center gap-3">
                    <i class="fas fa-fingerprint text-xl"></i> العداد: <span class="font-mono bg-white/20 px-3 py-1 rounded-lg shadow-inner text-lg">${item.count}</span>
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
            btn.className = "w-full md:w-auto bg-slate-200 text-slate-500 font-bold text-base px-8 py-3.5 rounded-xl cursor-default select-none border border-slate-300 flex justify-center items-center gap-2";
            btn.innerHTML = "<i class="fas fa-check-circle text-emerald-500 text-xl"></i> تم بالكامل";
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
            
            const hijriDisplay = document.getElementById('currentHijriDisplay');
            hijriDisplay.innerText = `${dates.hijri.day} ${dates.hijri.month.ar} ${dates.hijri.year} هـ`;
            hijriDisplay.dataset.apiUpdated = "true";
            
            appState.qiblaAngle = payload.data.meta.qibla || 21.4;
            document.getElementById('quranQiblaAngle').innerText = Math.round(appState.qiblaAngle);
            document.getElementById('compassDisc').style.transform = `rotate(${-appState.qiblaAngle}deg)`;
            
            document.getElementById('nextPrayerCountdown').innerText = "تم عرض مواقيت الصلاة للموقع المحدد بنجاح";
        });
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
        card.className = `p-5 rounded-2xl border flex justify-between items-center cursor-pointer transition shadow-sm ${appState.habits[key] ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:bg-slate-50'}`;
        card.onclick = () => toggleHabit(key);
        card.innerHTML = `
            <span class="text-sm md:text-base font-black text-slate-700">${habitTitles[key]}</span>
            <div class="w-8 h-8 rounded-xl border-2 flex items-center justify-center transition ${appState.habits[key] ? 'bg-emerald-600 border-emerald-600 text-white shadow-md' : 'border-slate-300'}">
                ${appState.habits[key] ? '<i class="fas fa-check"></i>' : ''}
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
        { id: 'habits_full', title: 'خادم السنن والنور', desc: 'إنجاز عبادات اليوم كاملة', icon: 'fa-crown' }
    ];

    badges.forEach(badge => {
        const isUnlocked = appState.unlockedBadges.includes(badge.id);
        const card = document.createElement('div');
        card.className = `p-4 rounded-2xl border text-center transition flex flex-col items-center gap-3 shadow-sm ${isUnlocked ? 'bg-white badge-unlocked' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`;
        card.innerHTML = `
            <div class="w-14 h-14 rounded-full ${isUnlocked ? 'bg-emerald-100 text-emerald-600 shadow-inner' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-2xl"><i class="fas ${badge.icon}"></i></div>
            <h4 class="font-black text-xs md:text-sm text-slate-800">${badge.title}</h4>
            <p class="text-[11px] text-slate-500 leading-tight font-bold">${badge.desc}</p>
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
        btn.innerHTML = `<i class="fas fa-play ml-2"></i> استئناف المؤقت`;
    } else {
        appState.isPomodoroRunning = true;
        btn.innerHTML = `<i class="fas fa-pause ml-2"></i> إيقاف مؤقت`;
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
    document.getElementById('pomoStartBtn').innerHTML = `<i class="fas fa-play ml-2"></i> بدء المؤقت`;
    document.getElementById('pomoStateText').innerText = "وقت التركيز والإنتاجية";
    updatePomodoroDOM();
}

// 11. MEMORIZATION TESTING TOOL
function startMemorizationTest() {
    const surahNum = document.getElementById('testerSurahSelect').value;
    const workspace = document.getElementById('testerWorkspace');
    workspace.classList.remove('hidden');
    workspace.innerHTML = `<div class="text-center w-full font-sans text-lg"><i class="fas fa-spinner animate-spin text-slate-400 mb-3"></i><br>جاري توليد مراجعة عشوائية...</div>`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            workspace.innerHTML = '';
            payload.data.ayahs.slice(0, 5).forEach(ayah => {
                let words = ayah.text.split(' ');
                let processedWords = words.map(w => {
                    if (Math.random() < 0.3) {
                        return `<span class="bg-amber-100 px-4 py-1 mx-1 border-b-2 border-amber-400 text-transparent hover:text-slate-800 transition-colors rounded select-none cursor-pointer inline-block" title="انقر لعرض الكلمة المخفية">${w}</span>`;
                    }
                    return w;
                });
                workspace.innerHTML += `<p class="mb-5 leading-loose font-quran text-4xl">${processedWords.join(' ')} <b class="text-emerald-600 font-sans text-xl opacity-90 mx-2">﴿${ayah.numberInSurah}﴾</b></p>`;
            });
        });
}

// 12. DATA LOCALSTORAGE PERSISTENCE
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

// -- التحكم بنافذة بث الحرم وتشغيل/إيقاف الفيديو --
function toggleMakkahModal(status) {
    const modal = document.getElementById('makkahModal');
    modal.classList.toggle('hidden', !status);
    
    // تأكد من أن السورس موجود عند فتح النافذة
    const iframe = document.getElementById('makkahIframe');
    if (status && !iframe.src.includes('5Mii2-g60p4')) {
        iframe.src = "https://www.youtube.com/embed/5Mii2-g60p4?rel=0";
    }
    // ملاحظة: النافذة عند إغلاقها ستصبح hidden فقط والفيديو يستمر بالعمل بالخلفية كما طلبت.
}

function stopMakkahStream() {
    const iframe = document.getElementById('makkahIframe');
    iframe.src = ""; // حذف المصدر يوقف الصوت تماماً
    toggleMakkahModal(false); // إغلاق النافذة
    alert('تم إيقاف بث الحرم المكي بنجاح.');
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
