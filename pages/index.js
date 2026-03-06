import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ── Utilities ──────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });
}

function parseTimeStr(str) {
  if (!str) return new Date();
  const parts = str.trim().split(' ');
  const [h, m] = parts[0].split(':').map(Number);
  const period = parts[1];
  let hours = h;
  if (period === 'PM' && h !== 12) hours += 12;
  if (period === 'AM' && h === 12) hours = 0;
  const d = new Date();
  d.setHours(hours, m, 0, 0);
  return d;
}

function msToHMS(ms) {
  if (ms <= 0) return { h: 0, m: 0, s: 0 };
  const total = Math.floor(ms / 1000);
  return {
    h: Math.floor(total / 3600),
    m: Math.floor((total % 3600) / 60),
    s: total % 60,
  };
}

// ── Prayer circle ──────────────────────────────────────────────────────────────
// Blue  = Fardh window
// Red   = Restricted/makruh time
// Green = Nafl/Sunnah opportunity

function getPrayerCircle(prayers, now) {
  if (!prayers || prayers.length < 5)
    return { label: 'Loading', color: '#4a6eb5', progress: 0, msLeft: 0 };

  const fajr    = parseTimeStr(prayers[0].time);
  const dhuhr   = parseTimeStr(prayers[1].time);
  const asr     = parseTimeStr(prayers[2].time);
  const maghrib = parseTimeStr(prayers[3].time);
  const isha    = parseTimeStr(prayers[4].time);

  const sunrise  = new Date(fajr.getTime()    + 80  * 60000);
  const ishraq   = new Date(fajr.getTime()    + 90  * 60000);
  const dhuhaEnd = new Date(dhuhr.getTime()   - 20  * 60000);
  const zawal    = new Date(dhuhr.getTime()   - 10  * 60000);
  const asrRestr = new Date(maghrib.getTime() - 20  * 60000);
  const tahajjud = new Date(isha.getTime()    + 90  * 60000);
  const nextFajr = new Date(fajr.getTime()    + 24  * 3600000);

  const BLUE  = '#4a6eb5';
  const RED   = '#c0392b';
  const GREEN = '#4caf7d';

  let label, color, from, to;

  if      (now >= fajr    && now < sunrise)  { label = 'Fajr';        color = BLUE;  from = fajr;    to = sunrise;  }
  else if (now >= sunrise && now < ishraq)   { label = 'Restriction'; color = RED;   from = sunrise; to = ishraq;   }
  else if (now >= ishraq  && now < dhuhaEnd) { label = 'Dhuha';       color = GREEN; from = ishraq;  to = dhuhaEnd; }
  else if (now >= dhuhaEnd && now < zawal)   { label = 'Restriction'; color = RED;   from = dhuhaEnd;to = zawal;    }
  else if (now >= zawal   && now < dhuhr)    { label = "Jumu'ah";     color = BLUE;  from = zawal;   to = dhuhr;    }
  else if (now >= dhuhr   && now < asr)      { label = 'Dhuhr';       color = BLUE;  from = dhuhr;   to = asr;      }
  else if (now >= asr     && now < asrRestr) { label = 'Asr';         color = BLUE;  from = asr;     to = asrRestr; }
  else if (now >= asrRestr && now < maghrib) { label = 'Restriction'; color = RED;   from = asrRestr;to = maghrib;  }
  else if (now >= maghrib && now < isha)     { label = 'Maghrib';     color = BLUE;  from = maghrib; to = isha;     }
  else if (now >= isha    && now < tahajjud) { label = 'Isha';        color = BLUE;  from = isha;    to = tahajjud; }
  else                                        { label = 'Tahajjud';   color = GREEN; from = tahajjud;to = nextFajr; }

  const total    = to - from;
  const elapsed  = now - from;
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const msLeft   = to - now;

  return { label, color, progress, msLeft };
}

// ── Ayah pool ──────────────────────────────────────────────────────────────────

const AYAH_POOL = [
  { arabic: 'كُلُّ نَفْسٍ ذَآئِقَةُ ٱلْمَوْتِ',                                        translation: 'Every soul shall taste death.',                                              ref: 'Al-Ankabut, 57'   },
  { arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا',                                              translation: 'Indeed, with hardship will be ease.',                                       ref: 'Al-Inshirah, 6'   },
  { arabic: 'وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ',                               translation: 'And seek help through patience and prayer.',                                 ref: 'Al-Baqarah, 45'   },
  { arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ',                                               translation: 'Remember Me and I will remember you.',                                      ref: 'Al-Baqarah, 152'  },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ',                                       translation: 'And He is with you wherever you are.',                                       ref: 'Al-Hadid, 4'      },
  { arabic: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ',                                         translation: 'Indeed, Allah is with the patient.',                                        ref: 'Al-Baqarah, 153'  },
  { arabic: 'وَلَا تَيْأَسُوا۟ مِن رَّوْحِ ٱللَّهِ',                                   translation: 'Do not despair of the mercy of Allah.',                                     ref: 'Yusuf, 87'        },
  { arabic: 'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ',                                   translation: 'Allah is sufficient for us and He is the best Disposer of affairs.',        ref: 'Al-Imran, 173'    },
  { arabic: 'وَمَا تَوْفِيقِىٓ إِلَّا بِٱللَّهِ',                                       translation: 'My success is not but through Allah.',                                      ref: 'Hud, 88'          },
  { arabic: 'شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ',                   translation: 'The month of Ramadan in which the Quran was revealed.',                     ref: 'Al-Baqarah, 185'  },
  { arabic: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ كُتِبَ عَلَيْكُمُ ٱلصِّيَامُ',        translation: 'O you who believe, fasting has been prescribed for you.',                   ref: 'Al-Baqarah, 183'  },
  { arabic: 'رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْءَاخِرَةِ حَسَنَةً', translation: 'Our Lord, give us good in this world and good in the Hereafter.',           ref: 'Al-Baqarah, 201'  },
  { arabic: 'وَٱللَّهُ يَرْزُقُ مَن يَشَآءُ بِغَيْرِ حِسَابٍ',                        translation: 'And Allah provides for whom He wills without account.',                     ref: 'Al-Baqarah, 212'  },
  { arabic: 'إِنَّ ٱللَّهَ لَا يُضِيعُ أَجْرَ ٱلْمُحْسِنِينَ',                        translation: 'Indeed, Allah does not allow the reward of good-doers to be lost.',         ref: 'At-Tawbah, 120'   },
  { arabic: 'وَعَسَىٰٓ أَن تَكْرَهُوا۟ شَيْـًٔا وَهُوَ خَيْرٌ لَّكُمْ',              translation: 'Perhaps you dislike something and it is good for you.',                     ref: 'Al-Baqarah, 216'  },
];

// Rotates daily — re-evaluated each render but stable within a day
function getDailyAyah() {
  const now = new Date();
  // Use a date key so it updates at midnight
  const dateKey = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return AYAH_POOL[dateKey % AYAH_POOL.length];
}

// ── Hijri month names ──────────────────────────────────────────────────────────

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

// ── Main component ─────────────────────────────────────────────────────────────

export default function Home() {
  const [now, setNow]               = useState(new Date());
  const [prayers, setPrayers]       = useState([]);
  const [hijriLabel, setHijriLabel] = useState('');   // e.g. "16 Ramadan 1446 AH"
  const [hijriCal, setHijriCal]     = useState([]);
  const [calMonth, setCalMonth]     = useState(null);
  const [calYear, setCalYear]       = useState(null);
  const [todayHijri, setTodayHijri] = useState(null); // { day, month, year }
  const [messages, setMessages]     = useState([
    { role: 'assistant', content: "As-salamu alaykum! I'm Noor, your Islamic assistant. Ask me anything about Islam, Ramadan, or prayer. 🌙" },
  ]);
  const [input, setInput]           = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef                  = useRef(null);

  // ── Clock: ticks every second, re-fetches prayer times at midnight ──
  const lastFetchedDate = useRef('');

  useEffect(() => {
    function tick() {
      const n = new Date();
      setNow(n);

      // Check if the calendar date changed → refetch everything
      const dateStr = `${n.getFullYear()}-${n.getMonth()}-${n.getDate()}`;
      if (dateStr !== lastFetchedDate.current) {
        lastFetchedDate.current = dateStr;
        fetchPrayerData(n);
      }
    }

    tick(); // run immediately
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  // ── Fetch prayer times + Hijri date from AlAdhan ──
  // method=1  = University of Islamic Sciences, Karachi
  //             used officially by Islamic Foundation Bangladesh
  // school=1  = Hanafi (used in Bangladesh for Asr)
  function fetchPrayerData(date) {
    const d  = date.getDate();
    const mo = date.getMonth() + 1;
    const y  = date.getFullYear();
    fetch(
      `https://api.aladhan.com/v1/timings/${d}-${mo}-${y}` +
      `?latitude=23.8103&longitude=90.4125&method=1&school=1`
    )
      .then(r => r.json())
      .then(data => {
        const t = data.data.timings;

        const fmt = (s) => {
          const [hh, mm] = s.split(':').map(Number);
          const period = hh >= 12 ? 'PM' : 'AM';
          const h12 = hh % 12 || 12;
          return `${h12}:${pad(mm)} ${period}`;
        };

        setPrayers([
          { name: 'Fajr',    time: fmt(t.Fajr)    },
          { name: 'Dhuhr',   time: fmt(t.Dhuhr)   },
          { name: 'Asr',     time: fmt(t.Asr)      },
          { name: 'Maghrib', time: fmt(t.Maghrib)  },
          { name: 'Isha',    time: fmt(t.Isha)     },
        ]);

        const hijri  = data.data.date.hijri;
        const hDay   = parseInt(hijri.day);
        const hMonth = parseInt(hijri.month.number);
        const hYear  = parseInt(hijri.year);

        // AlAdhan returns the calculated Hijri date.
        // Bangladesh Islamic Foundation may differ by ±1 day due to moonsighting.
        // We show the API date and mark the adjacent day uncertain.
        setHijriLabel(`${hijri.day} ${hijri.month.en} ${hijri.year} AH`);
        setTodayHijri({ day: hDay, month: hMonth, year: hYear });
        setCalMonth(hMonth);
        setCalYear(hYear);
      })
      .catch(err => console.error('Prayer fetch error:', err));
  }

  // ── Fetch Hijri calendar when month/year changes ──
  useEffect(() => {
    if (!calMonth || !calYear) return;
    fetch(`https://api.aladhan.com/v1/hToGCalendar/${calMonth}/${calYear}`)
      .then(r => r.json())
      .then(data => { if (data.data) setHijriCal(data.data); })
      .catch(err => console.error('Calendar fetch error:', err));
  }, [calMonth, calYear]);

  // ── Scroll chat ──
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Prayer circle ──
  const circle = getPrayerCircle(prayers, now);
  const { h, m, s } = msToHMS(circle.msLeft);
  const R    = 76;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * (1 - circle.progress);

  // ── Ayah (stable per day) ──
  const ayah = getDailyAyah();

  // ── Chat ──
  const sendMessage = useCallback(async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg    = { role: 'user', content: input.trim() };
    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput('');
    setChatLoading(true);
    try {
      const res  = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });
      const data = await res.json();
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${data.error}` }]);
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ Network error: ${err.message}` }]);
    }
    setChatLoading(false);
  }, [input, messages, chatLoading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // ── Calendar nav ──
  const prevMonth = () => {
    setHijriCal([]);
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    setHijriCal([]);
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const isToday = (dayNum) =>
    todayHijri &&
    todayHijri.day    === dayNum &&
    todayHijri.month  === calMonth &&
    todayHijri.year   === calYear;

  // Mark the day before and after today as uncertain (moonsighting ambiguity)
  // This is especially relevant during Ramadan end / Eid announcement
  const isUncertain = (dayNum) => {
    if (!todayHijri) return false;
    if (todayHijri.month !== calMonth || todayHijri.year !== calYear) return false;
    if (isToday(dayNum)) return false;
    const total = hijriCal.length || 30;
    // Last day of month is always uncertain (could be 29 or 30 days)
    if (dayNum === 30 || dayNum === total) return true;
    // If today is near end of month, also mark adjacent days
    if (todayHijri.month === calMonth && todayHijri.day >= total - 2) {
      return dayNum === todayHijri.day - 1 || dayNum === todayHijri.day + 1;
    }
    return false;
  };

  const daysInMonth = hijriCal.length || 30;
  const calDays     = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <Head>
        <title>Ramadan Dashboard — Muntasir</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400&family=Mirza:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <style jsx global>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --navy:        #0d1428;
          --navy-mid:    #141d3a;
          --navy-card:   #182044;
          --border:      #2a3a6e;
          --border-hi:   #3d5499;
          --text:        #e8eaf6;
          --dim:         #7a8bb5;
          --blue:        #4a6eb5;
          --gold:        #e6c97a;
          --red:         #c0392b;
          --green:       #4caf7d;
        }

        html, body {
          width: 100%; height: 100%;
          background: var(--navy);
          color: var(--text);
          font-family: 'Cormorant Garamond', Georgia, serif;
          overflow: hidden;
        }

        /* ── Two-column layout ── */
        .app {
          display: grid;
          grid-template-columns: 1fr 320px;
          width: 100vw;
          height: 100vh;
        }

        /* ── Left panel: header / middle / ayah ── */
        .left {
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 26px 20px 20px 28px;
          gap: 14px;
          overflow: hidden;
          min-width: 0;
        }

        /* Header */
        .hdr h1      { font-size: 1.85rem; font-weight: 400; letter-spacing: 0.01em; }
        .hdr .clock  { font-size: 1.05rem; font-weight: 700; margin-top: 2px; letter-spacing: 0.06em; }
        .hdr .dline  { font-size: 0.88rem; font-weight: 700; margin-top: 1px; letter-spacing: 0.03em; }
        .hdr .dline em { font-style: normal; color: var(--gold); }

        /* Middle row: calendar + (circle + prayer list) */
        .middle {
          display: grid;
          grid-template-columns: 245px 1fr;
          gap: 14px;
          min-height: 0;
          align-items: stretch;
        }

        /* Card shell */
        .card {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 15px;
        }

        /* Calendar */
        .cal-title {
          font-size: 1.15rem;
          font-weight: 700;
          text-align: center;
          margin-bottom: 10px;
          letter-spacing: 0.02em;
        }
        .cal-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 3px;
        }
        .cday {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          font-size: 0.68rem;
          font-weight: 600;
          background: var(--navy-mid);
          border: 1px solid var(--border);
          color: var(--text);
          user-select: none;
        }
        .cday.today    { background: var(--blue); border-color: var(--border-hi); font-weight: 700; }
        .cday.uncertain{ background: transparent; border: 1.5px solid #9a8430; color: var(--gold); }
        .cal-nav {
          display: flex;
          justify-content: center;
          gap: 6px;
          margin-top: 9px;
        }
        .cal-nav button {
          background: var(--navy-mid);
          border: 1px solid var(--border);
          border-radius: 6px;
          color: var(--text);
          font-size: 0.78rem;
          padding: 2px 10px;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s;
        }
        .cal-nav button:hover { background: var(--border); }

        /* Prayer section: circle | list */
        .psec {
          display: grid;
          grid-template-columns: 195px 1fr;
          gap: 14px;
          align-items: stretch;
        }

        /* Circle */
        .circle-card {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .cwrap {
          position: relative;
          width: 155px;
          height: 155px;
        }
        .cwrap svg { transform: rotate(-90deg); display: block; }
        .cinner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: 0 10px;
        }
        .cinner .small  { font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase; color: var(--dim); }
        .cinner .pname  { font-size: 1.35rem; font-weight: 600; line-height: 1.1; margin-top: 1px; }
        .cinner .pcount { font-size: 0.63rem; color: var(--dim); margin-top: 5px; line-height: 1.6; }

        /* Prayer list */
        .plist {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 12px 18px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .prow {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid var(--border);
        }
        .prow:last-child { border-bottom: none; }
        .prow .pn { font-size: 1.15rem; font-weight: 500; }
        .prow .pt { font-size: 1rem;    font-weight: 600; letter-spacing: 0.03em; }

        /* ── Ayah card — bigger, fills remaining space ── */
        .ayah {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 22px 32px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 0;
        }
        .ayah-lbl {
          font-size: 0.68rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--dim);
          font-weight: 700;
          margin-bottom: 14px;
        }
        .ayah-ar {
          font-family: 'Mirza', serif;
          font-size: clamp(1.6rem, 2.4vw, 2.4rem);
          font-weight: 600;
          direction: rtl;
          line-height: 1.75;
          color: var(--text);
          margin-bottom: 14px;
        }
        .ayah-tr {
          font-style: italic;
          font-size: clamp(0.9rem, 1.2vw, 1.1rem);
          color: var(--dim);
          margin-bottom: 5px;
        }
        .ayah-ref {
          font-size: 0.72rem;
          letter-spacing: 0.05em;
          color: var(--dim);
        }

        /* ── Right panel / chat ── */
        .right {
          border-left: 1.5px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--navy-mid);
        }
        .msgs {
          flex: 1;
          overflow-y: auto;
          padding: 18px 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .msgs::-webkit-scrollbar       { width: 3px; }
        .msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .bubble {
          max-width: 90%;
          padding: 9px 13px;
          border-radius: 13px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.93rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bubble.user      { align-self: flex-end;  background: var(--blue);      color: #fff;       border-bottom-right-radius: 4px; }
        .bubble.assistant { align-self: flex-start; background: var(--navy-card); color: var(--text); border: 1px solid var(--border); border-bottom-left-radius: 4px; }
        .bubble.loading   { opacity: 0.55; }
        .bubble.error     { border-color: var(--red); color: #f4a0a0; }

        .inputrow {
          padding: 10px 12px;
          border-top: 1.5px solid var(--border);
          display: flex;
          align-items: center;
          gap: 7px;
        }
        .cinput {
          flex: 1;
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 9px 15px;
          color: var(--text);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.92rem;
          outline: none;
          resize: none;
          line-height: 1.4;
          transition: border-color 0.2s;
        }
        .cinput::placeholder { color: var(--dim); }
        .cinput:focus        { border-color: var(--blue); }

        .sbtn {
          background: var(--blue);
          border: none;
          border-radius: 50%;
          width: 36px; height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .sbtn:hover    { background: #5a80cc; transform: scale(1.06); }
        .sbtn:active   { transform: scale(0.96); }
        .sbtn:disabled { background: var(--border); cursor: not-allowed; }
        .sbtn svg      { fill: white; }
      `}</style>

      <div className="app">

        {/* ══════════ LEFT ══════════ */}
        <div className="left">

          {/* Header */}
          <div className="hdr">
            <h1>As-salamu alaykum, Muntasir!</h1>
            <div className="clock">{formatTime(now)}</div>
            <div className="dline">
              {formatDate(now)}
              {hijriLabel && <> | <em>{hijriLabel}</em></>}
            </div>
          </div>

          {/* Middle */}
          <div className="middle">

            {/* Hijri calendar */}
            <div className="card">
              <div className="cal-title">
                {calMonth && calYear ? `${HIJRI_MONTHS[calMonth - 1]} ${calYear}` : 'Calendar'}
              </div>
              <div className="cal-grid">
                {calDays.map(day => (
                  <div
                    key={day}
                    className={['cday', isToday(day) && 'today', isUncertain(day) && 'uncertain']
                      .filter(Boolean).join(' ')}
                  >
                    {day}
                  </div>
                ))}
              </div>
              <div className="cal-nav">
                <button onClick={prevMonth}>{'<'}</button>
                <button onClick={nextMonth}>{'>'}</button>
              </div>
            </div>

            {/* Prayer circle + list */}
            <div className="psec">

              <div className="circle-card">
                <div className="cwrap">
                  <svg width="155" height="155" viewBox="0 0 155 155">
                    <circle cx="77.5" cy="77.5" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                    <circle
                      cx="77.5" cy="77.5" r={R}
                      fill="none"
                      stroke={circle.color}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={dash}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                    />
                  </svg>
                  <div className="cinner">
                    <span className="small">Time left for</span>
                    <span className="pname">{circle.label}</span>
                    <span className="pcount">
                      {h > 0
                        ? `${h} hour${h !== 1 ? 's' : ''}\n${pad(m)} minutes`
                        : m > 0
                          ? `${m} minute${m !== 1 ? 's' : ''}\n${pad(s)} seconds`
                          : `${s} seconds`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="plist">
                {(prayers.length
                  ? prayers
                  : ['Fajr','Dhuhr','Asr','Maghrib','Isha'].map(n => ({ name: n, time: '' }))
                ).map(p => (
                  <div key={p.name} className="prow">
                    <span className="pn">{p.name}</span>
                    <span className="pt" style={!p.time ? { color: 'var(--dim)' } : {}}>{p.time || '—'}</span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Ayah */}
          <div className="ayah">
            <div className="ayah-lbl">Daily Ayah</div>
            <div className="ayah-ar">{ayah.arabic}</div>
            <div className="ayah-tr">{ayah.translation}</div>
            <div className="ayah-ref">{ayah.ref}</div>
          </div>

        </div>

        {/* ══════════ RIGHT / CHAT ══════════ */}
        <div className="right">
          <div className="msgs">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={[
                  'bubble',
                  msg.role,
                  msg.content?.startsWith('⚠️') ? 'error' : '',
                ].filter(Boolean).join(' ')}
              >
                {msg.content}
              </div>
            ))}
            {chatLoading && <div className="bubble assistant loading">Noor is typing…</div>}
            <div ref={chatEndRef} />
          </div>

          <div className="inputrow">
            <textarea
              className="cinput"
              rows={1}
              placeholder="Start typing..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="sbtn"
              onClick={sendMessage}
              disabled={chatLoading || !input.trim()}
              aria-label="Send"
            >
              <svg width="15" height="15" viewBox="0 0 24 24">
                <path d="M2 21l21-9L2 3v7l15 2-15 2z" />
              </svg>
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
