/* Complete Core JavaScript Orchestration Engine */

let appState = {
    currentTab: 'quran',
    fontSize: 38,
    misbahaCount: 0,
    misbahaTotal: 0,
    pomodoroTimer: null,
    pomodoroMinutes: 25,
    pomodoroSeconds: 0,
    isPomodoroRunning: false,
    pomodoroState: 'focus',
    latitude: 21.4225, 
    longitude: 39.8262, 
    qiblaAngle: 0,
    habits: { fajr: false, dhuhr: false, asr: false, maghrib: false, isha: false, morningAthkar: false, eveningAthkar: false, quranRead: false },
    unlockedBadges: [],
    savedAyahs: [] 
};

// خريطة قراء القرآن لدعم السورة الكاملة والآيات المحددة بقوة وموثوقية
const reciterMap = {
    'sudais': { surah: 'https://server11.mp3quran.net/sds/', ayah: 'ar.abdurrahansudais' },
    'yasser': { surah: 'https://server11.mp3quran.net/yasser/', ayah: 'ar.yasseraddussari' },
    'maher':  { surah: 'https://server12.mp3quran.net/maher/', ayah: 'ar.mahermuaiqly' },
    'alafasy':{ surah: 'https://server8.mp3quran.net/afs/', ayah: 'ar.alafasy' },
    'qarni':  { surah: 'https://server6.mp3quran.net/qarni/', ayah: null } // سورة كاملة فقط للقرني
};

let currentSurahAyahsData = [];

window.onload = function() {
    initClock();
    loadSurahListSelectors();
    loadSurahContent();
    renderAthkarCategories();
    requestLocationAccess();
    loadLocalStorageState();
    updateHabitTrackerDOM();
    renderBadgesDOM();
    
    document.getElementById('radioSourceSelect').addEventListener('change', (e) => {
        const audioPlayer = document.getElementById('globalRadioAudio');
        audioPlayer.src = e.target.value;
        audioPlayer.play().catch(() => {});
    });
    
    document.getElementById('quranDedicatedAudio').addEventListener('ended', handleQuranAudioEnded);
};

// 2. TIMERS & DIGITAL CLOCK SYSTEM (السعودية)
function initClock() {
    setInterval(() => {
        const now = new Date();
        
        // الوقت بتوقيت السعودية ونظام 12 ساعة (ص/م)
        const optionsTime = { timeZone: 'Asia/Riyadh', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true };
        document.getElementById('digitalClock').innerText = now.toLocaleTimeString('ar-SA', optionsTime);
        
        // التاريخ الميلادي بتوقيت السعودية
        const optionsGregorian = { timeZone: 'Asia/Riyadh', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('currentGregorianDisplay').innerText = now.toLocaleDateString('ar-SA', optionsGregorian);
        
        // التاريخ الهجري
        const optionsHijri = { year: 'numeric', month: 'long', day: 'numeric' };
        const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', optionsHijri).format(now);
        
        if(!document.getElementById('currentHijriDisplay').dataset.apiUpdated) {
            document.getElementById('currentHijriDisplay').innerText = hijriDate;
        }
    }, 1000);
}

// 3. CORE TABS SWITCH LOGIC (يدعم الجوال والكمبيوتر)
function switchTab(tabId) {
    // Hide all views
    document.querySelectorAll('main > div').forEach(div => div.classList.add('hidden'));
    
    // Show selected view
    const view = document.getElementById(`view-${tabId}`);
    if(view) view.classList.remove('hidden');
    
    // Update Desktop Tabs
    document.querySelectorAll('[id^="tabBtn-"]').forEach(btn => {
        btn.className = "w-full text-right px-4 py-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm text-slate-600 hover:bg-slate-50 transition border border-transparent";
    });
    const activeDesktopBtn = document.getElementById(`tabBtn-${tabId}`);
    if(activeDesktopBtn) activeDesktopBtn.className = "w-full text-right px-4 py-3.5 rounded-2xl flex items-center gap-3 font-bold text-sm bg-emerald-50 text-emerald-700 transition shadow-sm border border-emerald-100";
    
    // Update Mobile Tabs
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
        btn.className = "mobile-nav-btn text-slate-400 hover:text-emerald-500 flex flex-col items-center p-1 w-16 transition-transform active:scale-95";
    });
    const activeMobileBtn = document.getElementById(`mobileTab-${tabId}`);
    if(activeMobileBtn) {
        activeMobileBtn.className = "mobile-nav-btn text-emerald-600 flex flex-col items-center p-1 w-16 transition-transform active:scale-95";
        activeMobileBtn.querySelector('i').classList.add('drop-shadow-sm');
    }
    
    appState.currentTab = tabId;
}

// 4. ACCESSIBILITY ENGINE
function changeFontSize(delta) {
    appState.fontSize = Math.max(20, Math.min(60, appState.fontSize + delta));
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
            surahSelect.innerHTML = ''; testerSelect.innerHTML = '';
            payload.data.forEach(surah => {
                const opt = `<option value="${surah.number}">${surah.number}. ${surah.name}</option>`;
                surahSelect.innerHTML += opt; testerSelect.innerHTML += opt;
            });
            surahSelect.value = 1; testerSelect.value = 1;
        });
}

function loadSurahContent(scrollToAyahNumber = null) {
    const surahNum = document.getElementById('quranSurahSelect').value || 1;
    const container = document.getElementById('surahAyahsContainer');
    const ayahSelect = document.getElementById('quranAyahSelect');
    
    container.innerHTML = `<div class="text-center text-sm py-12 text-slate-400 font-sans"><i class="fas fa-spinner animate-spin text-3xl mb-4"></i><br>جاري التحميل...</div>`;
    
    fetch(`https://api.alquran.cloud/v1/surah/${surahNum}`)
        .then(res => res.json())
        .then(payload => {
            document.getElementById('surahTitleDisplay').innerText = `✨ سُورَةُ ${payload.data.name} ✨`;
            container.innerHTML = '';
            
            currentSurahAyahsData = payload.data.ayahs;
            ayahSelect.innerHTML = '<option value="all">تشغيل السورة كاملة</option>';
            
            payload.data.ayahs.forEach(ayah => {
                ayahSelect.innerHTML += `<option value="${ayah.number}">الآية رقم ${ayah.numberInSurah}</option>`;
                
                const ayahSpan = document.createElement('span');
                ayahSpan.className = "ayah-card font-quran inline-block";
                ayahSpan.id = `ayah-node-${ayah.number}`;
                ayahSpan.innerHTML = `${ayah.text} <span class="text-emerald-700 font-bold font-sans mx-1.5 text-xl opacity-90">﴿${ayah.numberInSurah}﴾</span>`;
                ayahSpan.onclick = () => onAyahClick(ayah.number, ayah.text, payload.data.name);
                container.appendChild(ayahSpan);
            });
            
            localStorage.setItem('quranBookmark', JSON.stringify({ number: surahNum, name: payload.data.name }));
            showActiveBookmarkDOM();
            
            if(scrollToAyahNumber) {
                setTimeout(() => {
                    const targetSpan = document.getElementById(`ayah-node-${scrollToAyahNumber}`);
                    if(targetSpan) {
                        targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        targetSpan.classList.add('highlight-ayah');
                        setTimeout(() => targetSpan.classList.remove('highlight-ayah'), 3000);
                    }
                }, 500);
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

// -- نظام الصوت الذكي المربوط بـ mp3quran للضمان 100% --
function playQuranAudio() {
    const surahNum = document.getElementById('quranSurahSelect').value;
    const ayahVal = document.getElementById('quranAyahSelect').value;
    const reciterKey = document.getElementById('quranReciterSelect').value;
    const audioPlayer = document.getElementById('quranDedicatedAudio');
    
    const reciterConfig = reciterMap[reciterKey];
    
    if(ayahVal === 'all') {
        // تشغيل سورة كاملة من خوادم mp3quran الممتازة
        const formattedSurah = surahNum.toString().padStart(3, '0');
        audioPlayer.src = `${reciterConfig.surah}${formattedSurah}.mp3`;
    } else {
        // تشغيل آية محددة
        if(!reciterConfig.ayah) {
            alert('الشيخ عبدالله القرني متوفر لتشغيل (السورة كاملة) فقط. سيتم تشغيل السورة كاملة.');
            document.getElementById('quranAyahSelect').value = 'all';
            const formattedSurah = surahNum.toString().padStart(3, '0');
            audioPlayer.src = `${reciterConfig.surah}${formattedSurah}.mp3`;
        } else {
            audioPlayer.src = `https://cdn.islamic.network/quran/audio/128/${reciterConfig.ayah}/${ayahVal}.mp3`;
        }
    }
    
    audioPlayer.play().catch(err => {
        alert('اضغط على زر التشغيل (Play) في المشغل أدناه لبدء الصوت.');
    });
}

function handleQuranAudioEnded() {
    const repeatMode = document.getElementById('quranRepeatMode').value;
    const audioPlayer = document.getElementById('quranDedicatedAudio');
    if (repeatMode === 'repeat') {
        audioPlayer.currentTime = 0;
        audioPlayer.play();
    }
}

// --- نظام الآيات المحفوظة --- //
let currentSelectedAyah = { text: '', number: 0, surahName: '', surahNumber: 1 };

function onAyahClick(number, text, surahName) {
    const surahNumber = document.getElementById('quranSurahSelect').value;
    currentSelectedAyah = { number, text, surahName, surahNumber };
    
    const previewText = text.length > 50 ? text.substring(0, 50) + "..." : text;
    document.getElementById('ayahModalPreviewText').innerText = `﴿ ${previewText} ﴾`;
    toggleAyahActionModal(true);
}

function toggleAyahActionModal(status) {
    document.getElementById('ayahActionModal').classList.toggle('hidden', !status);
}

function actionCopyAyah() {
    navigator.clipboard.writeText(currentSelectedAyah.text).then(() => {
        alert('تم النسخ بنجاح!'); toggleAyahActionModal(false);
    });
}

function actionSaveAyah() {
    const isExists = appState.savedAyahs.find(a => a.number === currentSelectedAyah.number);
    if(!isExists) {
        appState.savedAyahs.push(currentSelectedAyah);
        saveStateToLocalStorage(); alert('تم الحفظ!');
    } else { alert('موجودة مسبقاً.'); }
    toggleAyahActionModal(false); renderSavedAyahs();
}

function actionTafseerAyah() {
    toggleAyahActionModal(false);
    showTafseerModal(currentSelectedAyah.number, currentSelectedAyah.text);
}

function renderSavedAyahs() {
    const container = document.getElementById('savedAyahsContainer');
    if(!container) return; container.innerHTML = '';
    
    if(appState.savedAyahs.length === 0) {
        container.innerHTML = '<p class="text-sm font-bold text-slate-500 text-center py-3 bg-white rounded-lg border">لا توجد آيات محفوظة.</p>';
        return;
    }
    appState.savedAyahs.forEach(ayah => {
        const div = document.createElement('div');
        div.className = "bg-white p-3 md:p-4 rounded-xl border border-slate-200 flex justify-between items-center gap-3 shadow-sm cursor-pointer";
        div.innerHTML = `
            <div class="flex-1 font-quran text-xl md:text-2xl leading-relaxed text-stone-800 text-right truncate" onclick="goToAyah(${ayah.surahNumber}, ${ayah.number})">
                ${ayah.text} <span class="text-emerald-600 text-[10px] md:text-xs font-sans font-black block mt-1">سورة ${ayah.surahName}</span>
            </div>
            <button onclick="removeSavedAyah(${ayah.number}); event.stopPropagation();" class="text-red-400 hover:bg-red-50 p-3 rounded-xl"><i class="fas fa-trash"></i></button>
        `;
        container.appendChild(div);
    });
}

function goToAyah(surahNumber, ayahGlobalNumber) {
    document.getElementById('savedAyahsContainer').classList.add('hidden');
    switchTab('quran');
    const surahSelect = document.getElementById('quranSurahSelect');
    if(surahSelect.value == surahNumber) {
        const targetSpan = document.getElementById(`ayah-node-${ayahGlobalNumber}`);
        if(targetSpan) {
            targetSpan.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetSpan.classList.add('highlight-ayah');
            setTimeout(() => targetSpan.classList.remove('highlight-ayah'), 3000);
        } else loadSurahContent(ayahGlobalNumber);
    } else {
        surahSelect.value = surahNumber;
        loadSurahContent(ayahGlobalNumber);
    }
}

function removeSavedAyah(number) {
    appState.savedAyahs = appState.savedAyahs.filter(a => a.number !== number);
    saveStateToLocalStorage(); renderSavedAyahs();
}

function showTafseerModal(ayahGlobalNumber, ayahText) {
    toggleTafseerModal(true);
    document.getElementById('tafseerModalAyahText').innerText = ayahText;
    document.getElementById('tafseerModalContent').innerHTML = '<i class="fas fa-spinner animate-spin"></i> جاري جلب التفسير...';
    
    fetch(`https://api.alquran.cloud/v1/ayah/${ayahGlobalNumber}/editions/ar.jalalayn`)
        .then(res => res.json())
        .then(payload => { document.getElementById('tafseerModalContent').innerText = payload.data[0].text; })
        .catch(() => { document.getElementById('tafseerModalContent').innerText = "فشل تحميل التفسير."; });
}

function toggleTafseerModal(status) { document.getElementById('tafseerModal').classList.toggle('hidden', !status); }

// 6. ATHKAR PORTAL MODULES
function renderAthkarCategories() {
    const grid = document.getElementById('athkarCategoriesGrid'); grid.innerHTML = '';
    for (let key in athkarDB) {
        const cat = athkarDB[key]; const btn = document.createElement('button');
        btn.className = "p-4 bg-white border border-slate-200 shadow-sm rounded-2xl font-black text-xs md:text-sm text-slate-700 flex flex-col items-center gap-2 hover:bg-emerald-50 transition active:scale-95";
        btn.innerHTML = `<i class="fas ${cat.icon} text-2xl text-emerald-600"></i> ${cat.title}`;
        btn.onclick = () => renderAthkarItems(key); grid.appendChild(btn);
    }
}

function renderAthkarItems(categoryKey) {
    const container = document.getElementById('athkarListContainer');
    container.innerHTML = `<h3 class="text-xl font-extrabold text-slate-800 mb-4 border-r-4 border-emerald-600 pr-3">${athkarDB[categoryKey].title}</h3>`;
    const items = athkarDB[categoryKey].items;
    if (items.length === 0) return;

    items.forEach((item) => {
        const card = document.createElement('div');
        card.className = "bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm";
        card.innerHTML = `
            <p class="font-amiri text-2xl md:text-3xl leading-loose text-slate-800 text-right font-bold">${item.text}</p>
            <div class="text-xs md:text-sm text-slate-500 font-bold bg-slate-50 p-3 rounded-xl border border-slate-100"><i class="fas fa-book-medical ml-1 text-amber-500"></i> ${item.dalil}</div>
            <div class="flex justify-between items-center pt-3 border-t border-slate-100">
                <span class="text-xs font-black text-slate-500">مطلوب: <b class="text-emerald-700 text-base mx-1">${item.count}</b></span>
                <button onclick="decrementDhikrCounter(this, ${item.count})" class="bg-emerald-600 text-white font-bold text-sm px-6 py-2.5 rounded-xl active:scale-95 transition shadow-md">
                    <i class="fas fa-fingerprint"></i> عداد: <span class="font-mono bg-white/20 px-2 py-0.5 rounded shadow-inner">${item.count}</span>
                </button>
            </div>
        `;
        container.appendChild(card);
    });
}

function decrementDhikrCounter(btn, maxCount) {
    const counterSpan = btn.querySelector('span'); let current = parseInt(counterSpan.innerText);
    if (current > 0) {
        current--; counterSpan.innerText = current;
        if (current === 0) {
            btn.className = "bg-slate-200 text-slate-500 font-bold text-sm px-6 py-2.5 rounded-xl cursor-default select-none border border-slate-300 flex items-center gap-2";
            btn.innerHTML = "<i class='fas fa-check-circle text-emerald-500 text-lg'></i> تم";
            triggerHapticFeedback();
        }
    }
}

// 7. LOCATION & PRAYER TIMES
function requestLocationAccess() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(position => {
            appState.latitude = position.coords.latitude; appState.longitude = position.coords.longitude;
            fetchPrayerTimesAPI();
        }, () => fetchPrayerTimesAPI());
    } else fetchPrayerTimesAPI();
}

// دالة لتحويل الوقت من 24 ساعة إلى 12 ساعة
function formatTime12Hour(time24) {
    let timeStr = time24.substring(0, 5); // نأخذ الساعات والدقائق بس
    let [hours, minutes] = timeStr.split(':');
    hours = parseInt(hours, 10);
    let ampm = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12;
    hours = hours ? hours : 12; // عشان الصفر يصير 12
    let strHours = hours < 10 ? '0' + hours : hours; // نضيف صفر لو الرقم فردي عشان الترتيب
    return `${strHours}:${minutes} ${ampm}`;
}

function fetchPrayerTimesAPI() {
    fetch(`https://api.aladhan.com/v1/timings?latitude=${appState.latitude}&longitude=${appState.longitude}&method=4`)
        .then(res => res.json())
        .then(payload => {
            const timings = payload.data.timings; const dates = payload.data.date;
            
            // إضافة الأوقات بعد تحويلها لـ 12 ساعة
            document.getElementById('time-Fajr').innerText = formatTime12Hour(timings.Fajr);
            document.getElementById('time-Sunrise').innerText = formatTime12Hour(timings.Sunrise);
            document.getElementById('time-Dhuhr').innerText = formatTime12Hour(timings.Dhuhr);
            document.getElementById('time-Asr').innerText = formatTime12Hour(timings.Asr);
            document.getElementById('time-Maghrib').innerText = formatTime12Hour(timings.Maghrib);
            document.getElementById('time-Isha').innerText = formatTime12Hour(timings.Isha);
            
            const hijriDisplay = document.getElementById('currentHijriDisplay');
            hijriDisplay.innerText = `${dates.hijri.day} ${dates.hijri.month.ar} ${dates.hijri.year} هـ`;
            hijriDisplay.dataset.apiUpdated = "true";
            
            document.getElementById('nextPrayerCountdown').innerText = "تم عرض مواقيت الصلاة للموقع المحدد بنجاح";
        });
}

// 8. MISBAHA
function incrementMisbahaCounter() {
    appState.misbahaCount++; appState.misbahaTotal++;
    document.getElementById('misbahaCountDisplay').innerText = appState.misbahaCount;
    document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal;
    if (appState.misbahaCount === 33 || appState.misbahaCount === 100) triggerHapticFeedback();
    saveStateToLocalStorage();
}
function resetMisbahaCounter() { appState.misbahaCount = 0; document.getElementById('misbahaCountDisplay').innerText = 0; saveStateToLocalStorage(); }

// 9. HABIT TRACKER
function toggleHabit(key) { appState.habits[key] = !appState.habits[key]; updateHabitTrackerDOM(); checkBadgeUnlocks(); saveStateToLocalStorage(); }
function updateHabitTrackerDOM() {
    const c = document.getElementById('habitsChecklistContainer'); if (!c) return; c.innerHTML = '';
    const titles = { fajr: "صلاة الفجر", dhuhr: "صلاة الظهر", asr: "صلاة العصر", maghrib: "صلاة المغرب", isha: "صلاة العشاء", morningAthkar: "أذكار الصباح", eveningAthkar: "أذكار المساء", quranRead: "ورد القرآن" };
    let total = 0, checked = 0;
    for (let key in appState.habits) {
        total++; if (appState.habits[key]) checked++;
        const div = document.createElement('div');
        div.className = `p-4 rounded-xl border flex justify-between items-center cursor-pointer transition shadow-sm ${appState.habits[key] ? 'bg-emerald-50 border-emerald-300' : 'bg-white hover:bg-slate-50'}`;
        div.onclick = () => toggleHabit(key);
        div.innerHTML = `<span class="text-sm font-black text-slate-700">${titles[key]}</span>
            <div class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition ${appState.habits[key] ? 'bg-emerald-600 border-emerald-600 text-white' : 'border-slate-300'}">${appState.habits[key] ? '<i class="fas fa-check text-xs"></i>' : ''}</div>`;
        c.appendChild(div);
    }
    document.getElementById('habitProgressPct').innerText = Math.round((checked / total) * 100) + '%';
}
function renderBadgesDOM() {
    const c = document.getElementById('badgesContainer'); if (!c) return; c.innerHTML = '';
    const badges = [{ id: 'first_tasbeeh', title: 'المسبّح المبتدئ', desc: 'تجاوز 33 تسبيحة', icon: 'fa-feather' }, { id: 'habits_3', title: 'المجتهد الصالح', desc: 'إتمام 3 عبادات', icon: 'fa-star' }, { id: 'habits_full', title: 'خادم السنن', desc: 'إنجاز جميع العبادات', icon: 'fa-crown' }];
    badges.forEach(b => {
        const u = appState.unlockedBadges.includes(b.id);
        const div = document.createElement('div');
        div.className = `p-3 rounded-2xl border text-center transition flex flex-col items-center gap-2 shadow-sm ${u ? 'bg-white badge-unlocked' : 'bg-slate-50 border-slate-200 opacity-60 grayscale'}`;
        div.innerHTML = `<div class="w-12 h-12 rounded-full ${u ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-400'} flex items-center justify-center text-xl"><i class="fas ${b.icon}"></i></div>
            <h4 class="font-black text-xs text-slate-800">${b.title}</h4>`;
        c.appendChild(div);
    });
}
function checkBadgeUnlocks() {
    if (appState.misbahaTotal >= 33 && !appState.unlockedBadges.includes('first_tasbeeh')) appState.unlockedBadges.push('first_tasbeeh');
    let c = Object.values(appState.habits).filter(Boolean).length;
    if (c >= 3 && !appState.unlockedBadges.includes('habits_3')) appState.unlockedBadges.push('habits_3');
    if (c === 8 && !appState.unlockedBadges.includes('habits_full')) appState.unlockedBadges.push('habits_full');
    renderBadgesDOM();
}

// 10. POMODORO
function togglePomodoroTimer() {
    const btn = document.getElementById('pomoStartBtn');
    if (appState.isPomodoroRunning) { clearInterval(appState.pomodoroTimer); appState.isPomodoroRunning = false; btn.innerHTML = `<i class="fas fa-play"></i> استئناف`; } 
    else { appState.isPomodoroRunning = true; btn.innerHTML = `<i class="fas fa-pause"></i> إيقاف`; appState.pomodoroTimer = setInterval(runPomodoroCountdown, 1000); }
}
function runPomodoroCountdown() {
    if (appState.pomodoroSeconds === 0) {
        if (appState.pomodoroMinutes === 0) {
            triggerHapticFeedback();
            if (appState.pomodoroState === 'focus') { appState.pomodoroState = 'break'; appState.pomodoroMinutes = 5; document.getElementById('pomoStateText').innerText = "الاستراحة (5 دقائق)"; } 
            else { appState.pomodoroState = 'focus'; appState.pomodoroMinutes = 25; document.getElementById('pomoStateText').innerText = "التركيز والإنتاجية"; }
            togglePomodoroTimer(); return;
        }
        appState.pomodoroMinutes--; appState.pomodoroSeconds = 59;
    } else appState.pomodoroSeconds--;
    document.getElementById('pomoTimeDisplay').innerText = `${appState.pomodoroMinutes.toString().padStart(2, '0')}:${appState.pomodoroSeconds.toString().padStart(2, '0')}`;
}
function resetPomodoroTimer() { clearInterval(appState.pomodoroTimer); appState.isPomodoroRunning = false; appState.pomodoroState = 'focus'; appState.pomodoroMinutes = 25; appState.pomodoroSeconds = 0; document.getElementById('pomoStartBtn').innerHTML = `<i class="fas fa-play"></i> بدء المؤقت`; document.getElementById('pomoStateText').innerText = "التركيز والإنتاجية"; document.getElementById('pomoTimeDisplay').innerText = "25:00"; }

// 11. MEMORIZATION
function startMemorizationTest() {
    const s = document.getElementById('testerSurahSelect').value; const w = document.getElementById('testerWorkspace'); w.classList.remove('hidden');
    w.innerHTML = `<div class="text-center font-sans"><i class="fas fa-spinner animate-spin text-slate-400"></i> جاري التوليد...</div>`;
    fetch(`https://api.alquran.cloud/v1/surah/${s}`).then(r => r.json()).then(p => {
        w.innerHTML = '';
        p.data.ayahs.slice(0, 5).forEach(a => {
            let words = a.text.split(' ').map(wd => Math.random() < 0.3 ? `<span class="bg-amber-100 px-3 py-1 mx-1 border-b-2 border-amber-400 text-transparent hover:text-slate-800 transition rounded inline-block" title="اضغط">${wd}</span>` : wd);
            w.innerHTML += `<p class="mb-4 leading-loose font-quran">${words.join(' ')} <b class="text-emerald-600 font-sans text-lg opacity-90 mx-1">﴿${a.numberInSurah}﴾</b></p>`;
        });
    });
}

// LOCALSTORAGE & HELPERS
function saveStateToLocalStorage() { localStorage.setItem('islamicPlatformState', JSON.stringify({ misbahaTotal: appState.misbahaTotal, habits: appState.habits, unlockedBadges: appState.unlockedBadges, savedAyahs: appState.savedAyahs })); }
function loadLocalStorageState() { const d = JSON.parse(localStorage.getItem('islamicPlatformState')); if (d) { appState.misbahaTotal = d.misbahaTotal || 0; appState.habits = d.habits || appState.habits; appState.unlockedBadges = d.unlockedBadges || []; appState.savedAyahs = d.savedAyahs || []; document.getElementById('misbahaTotalDisplay').innerText = appState.misbahaTotal; } renderSavedAyahs(); }
function triggerHapticFeedback() { if (navigator.vibrate) navigator.vibrate([100, 50, 100]); }

// MAKKAH STREAM CONTROLS
function toggleMakkahModal(status) {
    const modal = document.getElementById('makkahModal'); modal.classList.toggle('hidden', !status);
    const iframe = document.getElementById('makkahIframe');
    if (status && !iframe.src.includes('5Mii2-g60p4')) iframe.src = "https://www.youtube.com/embed/5Mii2-g60p4?rel=0&autoplay=1";
}
function stopMakkahStream() { document.getElementById('makkahIframe').src = ""; toggleMakkahModal(false); alert('تم إيقاف البث.'); }
document.getElementById('dashboardModeBtn').addEventListener('click', () => { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(err => {}); else document.exitFullscreen(); }); 

// دالة فتح وإغلاق مشغل الصوت في الجوال بذكاء وسرعة
function toggleMobileAudioBar() {
    const container = document.getElementById('audioBarContainer');
    const arrow = document.getElementById('mobileAudioBarArrow');
    
    // تبديل الكلاس المسؤول عن الإخفاء والظهور تلقائياً
    container.classList.toggle('-translate-y-full');
    
    // تغيير اتجاه السهم بناءً على حالة القائمة
    if (container.classList.contains('-translate-y-full')) {
        arrow.classList.replace('fa-chevron-up', 'fa-chevron-down');
    } else {
        arrow.classList.replace('fa-chevron-down', 'fa-chevron-up');
    }
}

// ==========================================
// نظام سلايدر الفيديوهات (القائمة الرئيسية)
// ==========================================

const videoList = [
    "5Mii2-g6Op4", // مثال 1
    "dQw4w9WgXcQ", // مثال 2
    "tPEE9ZwTmy0"  // مثال 3
];

let currentVideoIndex = 0;

function updateVideoPlayer() {
    const player = document.getElementById('mainVideoPlayer');
    const counter = document.getElementById('videoCounter');
    
    if (player && counter) {
        player.src = `https://www.youtube.com/embed/${videoList[currentVideoIndex]}?rel=0`;
        counter.innerText = `${currentVideoIndex + 1} / ${videoList.length}`;
    }
}

function nextVideo() {
    if (currentVideoIndex < videoList.length - 1) {
        currentVideoIndex++;
    } else {
        currentVideoIndex = 0; 
    }
    updateVideoPlayer();
}

function prevVideo() {
    if (currentVideoIndex > 0) {
        currentVideoIndex--;
    } else {
        currentVideoIndex = videoList.length - 1; 
    }
    updateVideoPlayer();
}

function sendFeedback() {
    const text = document.getElementById('feedbackText');
    if(text && text.value.trim() === "") {
        alert("الرجاء كتابة اقتراحك أولاً!");
        return;
    }
    alert("تم استلام رسالتك بنجاح! سيتم ربطها قريباً.");
    if(text) text.value = ""; 
}

window.addEventListener('DOMContentLoaded', () => {
    updateVideoPlayer();
});

// ==========================================
// ساعة وتاريخ القائمة الرئيسية
// ==========================================

function updateMainClock() {
    const clockEl = document.getElementById('mainDigitalClock');
    if (clockEl) {
        const now = new Date();
        let hours = now.getHours();
        let minutes = now.getMinutes();
        let seconds = now.getSeconds();
        
        // ضبط التنسيق (صباحاً/مساءً)
        let ampm = hours >= 12 ? 'م' : 'ص';
        hours = hours % 12;
        hours = hours ? hours : 12; 
        
        // إضافة صفر لو الرقم أقل من 10 (عشان يطلع شكلها 09:05 مو 9:5)
        minutes = minutes < 10 ? '0' + minutes : minutes;
        seconds = seconds < 10 ? '0' + seconds : seconds;
        
        clockEl.innerText = `${hours}:${minutes}:${seconds} ${ampm}`;
    }
}
// تحديث الساعة كل ثانية
setInterval(updateMainClock, 1000);
updateMainClock();

// دالة جلب التاريخ الهجري
function setMainHijriDate() {
    const dateEl = document.getElementById('mainHijriDate');
    if(dateEl) {
        const options = { numberingSystem: 'arab', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const hijriDate = new Intl.DateTimeFormat('ar-SA-u-ca-islamic', options).format(new Date());
        dateEl.innerText = hijriDate;
    }
}
setMainHijriDate();
