import { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';

// ── Utilities ─────────────────────────────────────────────────────────────────

function pad(n) { return String(n).padStart(2, '0'); }

function formatTime(date) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
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
  const totalSec = Math.floor(ms / 1000);
  return {
    h: Math.floor(totalSec / 3600),
    m: Math.floor((totalSec % 3600) / 60),
    s: totalSec % 60,
  };
}

// ── Prayer circle windows ─────────────────────────────────────────────────────
// Blue  = Fardh prayer window
// Red   = Restricted (makruh) time
// Green = Nafl/Sunnah opportunity

function getPrayerCircle(prayers, now) {
  if (!prayers || prayers.length < 5) {
    return { label: 'Loading', sublabel: '', color: '#4a6eb5', progress: 0, msLeft: 0 };
  }

  const fajr    = parseTimeStr(prayers[0].time);
  const dhuhr   = parseTimeStr(prayers[1].time);
  const asr     = parseTimeStr(prayers[2].time);
  const maghrib = parseTimeStr(prayers[3].time);
  const isha    = parseTimeStr(prayers[4].time);

  const sunrise  = new Date(fajr.getTime()    + 80 * 60000);
  const ishraq   = new Date(fajr.getTime()    + 90 * 60000);
  const dhuhaEnd = new Date(dhuhr.getTime()   - 20 * 60000);
  const zawal    = new Date(dhuhr.getTime()   - 10 * 60000);
  const asrRestr = new Date(maghrib.getTime() - 20 * 60000);
  const tahajjud = new Date(isha.getTime()    + 90 * 60000);
  const nextFajr = new Date(fajr.getTime()    + 24 * 3600000);

  const BLUE  = '#4a6eb5';
  const RED   = '#c0392b';
  const GREEN = '#4caf7d';

  let label, sublabel, color, from, to;

  if (now >= fajr && now < sunrise) {
    label = 'Fajr'; sublabel = 'Fardh window'; color = BLUE; from = fajr; to = sunrise;
  } else if (now >= sunrise && now < ishraq) {
    label = 'Restriction'; sublabel = 'After sunrise'; color = RED; from = sunrise; to = ishraq;
  } else if (now >= ishraq && now < dhuhaEnd) {
    label = 'Dhuha'; sublabel = 'Nafl prayer'; color = GREEN; from = ishraq; to = dhuhaEnd;
  } else if (now >= dhuhaEnd && now < zawal) {
    label = 'Restriction'; sublabel = 'Before Dhuhr'; color = RED; from = dhuhaEnd; to = zawal;
  } else if (now >= zawal && now < dhuhr) {
    label = "Jumu'ah"; sublabel = "Time for Jumu'ah"; color = BLUE; from = zawal; to = dhuhr;
  } else if (now >= dhuhr && now < asr) {
    label = 'Dhuhr'; sublabel = 'Fardh window'; color = BLUE; from = dhuhr; to = asr;
  } else if (now >= asr && now < asrRestr) {
    label = 'Asr'; sublabel = 'Fardh window'; color = BLUE; from = asr; to = asrRestr;
  } else if (now >= asrRestr && now < maghrib) {
    label = 'Restriction'; sublabel = 'Before Maghrib'; color = RED; from = asrRestr; to = maghrib;
  } else if (now >= maghrib && now < isha) {
    label = 'Maghrib'; sublabel = 'Fardh window'; color = BLUE; from = maghrib; to = isha;
  } else if (now >= isha && now < tahajjud) {
    label = 'Isha'; sublabel = 'Fardh window'; color = BLUE; from = isha; to = tahajjud;
  } else {
    label = 'Tahajjud'; sublabel = 'Nafl prayer'; color = GREEN; from = tahajjud; to = nextFajr;
  }

  const total    = to - from;
  const elapsed  = now - from;
  const progress = Math.min(Math.max(elapsed / total, 0), 1);
  const msLeft   = to - now;

  return { label, sublabel, color, progress, msLeft };
}

// ── Daily Ayah pool ───────────────────────────────────────────────────────────

const AYAH_POOL = [
  { arabic: 'كُلُّ نَفْسٍ ذَآئِقَةُ ٱلْمَوْتِ', translation: 'Every soul shall taste death.', ref: 'Al-Ankabut, 57' },
  { arabic: 'إِنَّ مَعَ ٱلْعُسْرِ يُسْرًا', translation: 'Indeed, with hardship will be ease.', ref: 'Al-Inshirah, 6' },
  { arabic: 'وَٱسْتَعِينُوا۟ بِٱلصَّبْرِ وَٱلصَّلَوٰةِ', translation: 'And seek help through patience and prayer.', ref: 'Al-Baqarah, 45' },
  { arabic: 'فَٱذْكُرُونِىٓ أَذْكُرْكُمْ', translation: 'Remember Me and I will remember you.', ref: 'Al-Baqarah, 152' },
  { arabic: 'وَهُوَ مَعَكُمْ أَيْنَ مَا كُنتُمْ', translation: 'And He is with you wherever you are.', ref: 'Al-Hadid, 4' },
  { arabic: 'إِنَّ ٱللَّهَ مَعَ ٱلصَّٰبِرِينَ', translation: 'Indeed, Allah is with the patient.', ref: 'Al-Baqarah, 153' },
  { arabic: 'وَلَا تَيْأَسُوا۟ مِن رَّوْحِ ٱللَّهِ', translation: 'Do not despair of the mercy of Allah.', ref: 'Yusuf, 87' },
  { arabic: 'حَسْبُنَا ٱللَّهُ وَنِعْمَ ٱلْوَكِيلُ', translation: 'Allah is sufficient for us and He is the best Disposer of affairs.', ref: 'Al-Imran, 173' },
  { arabic: 'وَمَا تَوْفِيقِىٓ إِلَّا بِٱللَّهِ', translation: 'My success is not but through Allah.', ref: 'Hud, 88' },
  { arabic: 'رَبَّنَآ ءَاتِنَا فِى ٱلدُّنْيَا حَسَنَةً وَفِى ٱلْءَاخِرَةِ حَسَنَةً', translation: 'Our Lord, give us good in this world and good in the Hereafter.', ref: 'Al-Baqarah, 201' },
  { arabic: 'يَٰٓأَيُّهَا ٱلَّذِينَ ءَامَنُوا۟ كُتِبَ عَلَيْكُمُ ٱلصِّيَامُ', translation: 'O you who believe, fasting has been prescribed for you.', ref: 'Al-Baqarah, 183' },
  { arabic: 'شَهْرُ رَمَضَانَ ٱلَّذِىٓ أُنزِلَ فِيهِ ٱلْقُرْءَانُ', translation: 'The month of Ramadan in which the Quran was revealed.', ref: 'Al-Baqarah, 185' },
  { arabic: 'وَٱللَّهُ يَرْزُقُ مَن يَشَآءُ بِغَيْرِ حِسَابٍ', translation: 'And Allah provides for whom He wills without account.', ref: 'Al-Baqarah, 212' },
];

function getDailyAyah() {
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  return AYAH_POOL[dayOfYear % AYAH_POOL.length];
}

// ── Hijri month names ─────────────────────────────────────────────────────────

const HIJRI_MONTHS = [
  'Muharram', 'Safar', "Rabi' al-Awwal", "Rabi' al-Thani",
  'Jumada al-Ula', 'Jumada al-Akhirah', 'Rajab', "Sha'ban",
  'Ramadan', 'Shawwal', "Dhu al-Qi'dah", 'Dhu al-Hijjah',
];

// ── Main Component ────────────────────────────────────────────────────────────

export default function Home() {
  const [now, setNow]               = useState(new Date());
  const [prayers, setPrayers]       = useState([]);
  const [hijriDate, setHijriDate]   = useState('');
  const [hijriCal, setHijriCal]     = useState([]);
  const [calMonth, setCalMonth]     = useState(null);
  const [calYear, setCalYear]       = useState(null);
  const [todayHijri, setTodayHijri] = useState(null);
  const [messages, setMessages]     = useState([
    { role: 'assistant', content: "As-salamu alaykum! I'm Noor, your Islamic assistant. Ask me anything about Islam, Ramadan, or prayer. 🌙" }
  ]);
  const [input, setInput]           = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef                  = useRef(null);
  const ayah                        = getDailyAyah();

  // Clock tick every second
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Fetch prayer times from AlAdhan (Dhaka, method=1)
  useEffect(() => {
    const today = new Date();
    const d  = today.getDate();
    const mo = today.getMonth() + 1;
    const y  = today.getFullYear();
    fetch(`https://api.aladhan.com/v1/timings/${d}-${mo}-${y}?latitude=23.8103&longitude=90.4125&method=1`)
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
        setHijriDate(`${hijri.day} ${hijri.month.en} ${hijri.year} AH`);
        setTodayHijri({ day: hDay, month: hMonth, year: hYear });
        setCalMonth(hMonth);
        setCalYear(hYear);
      })
      .catch(console.error);
  }, []);

  // Fetch Hijri calendar for displayed month
  useEffect(() => {
    if (!calMonth || !calYear) return;
    fetch(`https://api.aladhan.com/v1/hToGCalendar/${calMonth}/${calYear}`)
      .then(r => r.json())
      .then(data => { if (data.data) setHijriCal(data.data); })
      .catch(console.error);
  }, [calMonth, calYear]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const circle = getPrayerCircle(prayers, now);
  const { h, m, s } = msToHMS(circle.msLeft);

  // SVG progress circle
  const R    = 76;
  const CIRC = 2 * Math.PI * R;
  const dash = CIRC * (1 - circle.progress);

  // Send chat message
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
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Sorry, something went wrong.' }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Connection error. Please try again.' }]);
    }
    setChatLoading(false);
  }, [input, messages, chatLoading]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Calendar navigation
  const prevMonth = () => {
    if (calMonth === 1) { setCalMonth(12); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (calMonth === 12) { setCalMonth(1); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
  };

  const isToday = (dayNum) =>
    todayHijri &&
    todayHijri.day === dayNum &&
    todayHijri.month === calMonth &&
    todayHijri.year === calYear;

  // Last 1-2 days of month are uncertain (moonsighting), shown in gold
  const isUncertain = (dayNum) => {
    const total = hijriCal.length || 30;
    return !isToday(dayNum) && dayNum >= total - 1;
  };

  const daysInMonth = hijriCal.length || 30;
  const calDays     = Array.from({ length: daysInMonth }, (_, i) => i + 1);

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
          --navy:         #0d1428;
          --navy-mid:     #141d3a;
          --navy-card:    #182044;
          --border:       #2a3a6e;
          --border-light: #3d5499;
          --text:         #e8eaf6;
          --text-dim:     #7a8bb5;
          --accent-blue:  #4a6eb5;
          --accent-gold:  #e6c97a;
        }

        html, body {
          width: 100%; height: 100%;
          background: var(--navy);
          color: var(--text);
          font-family: 'Cormorant Garamond', Georgia, serif;
          overflow: hidden;
        }

        /* ── Layout ── */
        .app {
          display: grid;
          grid-template-columns: 1fr 310px;
          width: 100vw;
          height: 100vh;
        }

        .left {
          display: grid;
          grid-template-rows: auto 1fr auto;
          padding: 28px 20px 22px 30px;
          gap: 16px;
          overflow: hidden;
          min-width: 0;
        }

        /* ── Header ── */
        .header h1 {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.9rem;
          font-weight: 400;
          letter-spacing: 0.01em;
        }
        .header .clock {
          font-size: 1rem;
          font-weight: 700;
          margin-top: 1px;
          letter-spacing: 0.06em;
        }
        .header .dateline {
          font-size: 0.88rem;
          font-weight: 700;
          margin-top: 1px;
          letter-spacing: 0.04em;
        }
        .header .dateline em {
          font-style: normal;
          color: var(--accent-gold);
        }

        /* ── Middle row ── */
        .middle {
          display: grid;
          grid-template-columns: 250px 1fr;
          gap: 14px;
          min-height: 0;
        }

        /* ── Card base ── */
        .card {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 16px;
        }

        /* ── Hijri Calendar ── */
        .cal-header {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.2rem;
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

        .cal-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 7px;
          font-size: 0.7rem;
          font-weight: 600;
          font-family: 'Cormorant Garamond', Georgia, serif;
          background: var(--navy-mid);
          border: 1px solid var(--border);
          color: var(--text);
          user-select: none;
        }
        .cal-day.today {
          background: var(--accent-blue);
          border-color: #5a80cc;
          font-weight: 700;
        }
        .cal-day.uncertain {
          background: transparent;
          border: 1.5px solid #9a8430;
          color: var(--accent-gold);
        }

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

        /* ── Prayer section (circle + list) ── */
        .prayer-section {
          display: grid;
          grid-template-columns: 200px 1fr;
          gap: 14px;
          align-items: stretch;
        }

        .circle-card {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .circle-wrap {
          position: relative;
          width: 160px;
          height: 160px;
          flex-shrink: 0;
        }

        .circle-wrap svg { transform: rotate(-90deg); }

        .circle-inner {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .circle-inner .lbl-small {
          font-size: 0.6rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 1px;
          font-family: 'Cormorant Garamond', Georgia, serif;
        }
        .circle-inner .lbl-name {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.4rem;
          font-weight: 600;
          line-height: 1.1;
          color: var(--text);
        }
        .circle-inner .lbl-time {
          font-size: 0.65rem;
          color: var(--text-dim);
          margin-top: 4px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          line-height: 1.4;
        }

        /* Prayer list */
        .prayer-list {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 14px 20px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }

        .prayer-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 5px 0;
          border-bottom: 1px solid var(--border);
        }
        .prayer-row:last-child { border-bottom: none; }

        .prayer-row .pname {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1.15rem;
          font-weight: 500;
          color: var(--text);
        }
        .prayer-row .ptime {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 1rem;
          font-weight: 600;
          color: var(--text);
          letter-spacing: 0.03em;
        }

        /* ── Ayah card ── */
        .ayah-card {
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 16px;
          padding: 18px 28px;
          text-align: center;
        }

        .ayah-label {
          font-size: 0.7rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--text-dim);
          margin-bottom: 10px;
          font-weight: 700;
        }

        .ayah-arabic {
          font-family: 'Mirza', serif;
          font-size: 1.9rem;
          font-weight: 600;
          color: var(--text);
          direction: rtl;
          line-height: 1.7;
          margin-bottom: 8px;
        }

        .ayah-trans {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-style: italic;
          font-size: 0.95rem;
          color: var(--text-dim);
          margin-bottom: 3px;
        }

        .ayah-ref {
          font-size: 0.72rem;
          color: var(--text-dim);
          letter-spacing: 0.05em;
        }

        /* ── Right panel chat ── */
        .right {
          border-left: 1.5px solid var(--border);
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: var(--navy-mid);
        }

        .chat-msgs {
          flex: 1;
          overflow-y: auto;
          padding: 18px 14px 10px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          scrollbar-width: thin;
          scrollbar-color: var(--border) transparent;
        }
        .chat-msgs::-webkit-scrollbar { width: 3px; }
        .chat-msgs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }

        .bubble {
          max-width: 90%;
          padding: 9px 13px;
          border-radius: 13px;
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.92rem;
          line-height: 1.55;
          white-space: pre-wrap;
          word-break: break-word;
        }
        .bubble.user {
          align-self: flex-end;
          background: var(--accent-blue);
          color: #fff;
          border-bottom-right-radius: 4px;
        }
        .bubble.assistant {
          align-self: flex-start;
          background: var(--navy-card);
          color: var(--text);
          border: 1px solid var(--border);
          border-bottom-left-radius: 4px;
        }
        .bubble.loading { opacity: 0.55; }

        .chat-input-row {
          padding: 10px 12px;
          border-top: 1.5px solid var(--border);
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .chat-input {
          flex: 1;
          background: var(--navy-card);
          border: 1.5px solid var(--border);
          border-radius: 20px;
          padding: 9px 15px;
          color: var(--text);
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 0.9rem;
          outline: none;
          resize: none;
          line-height: 1.4;
          transition: border-color 0.2s;
        }
        .chat-input::placeholder { color: var(--text-dim); }
        .chat-input:focus { border-color: var(--accent-blue); }

        .send-btn {
          background: var(--accent-blue);
          border: none;
          border-radius: 50%;
          width: 36px;
          height: 36px;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: background 0.2s, transform 0.1s;
        }
        .send-btn:hover  { background: #5a80cc; transform: scale(1.06); }
        .send-btn:active { transform: scale(0.96); }
        .send-btn:disabled { background: var(--border); cursor: not-allowed; }
        .send-btn svg { fill: white; }
      `}</style>

      <div className="app">

        {/* ══ LEFT PANEL ══ */}
        <div className="left">

          {/* Header */}
          <div className="header">
            <h1>As-salamu alaykum, Muntasir!</h1>
            <div className="clock">{formatTime(now)}</div>
            <div className="dateline">
              {formatDate(now)}
              {hijriDate && <> | <em>{hijriDate}</em></>}
            </div>
          </div>

          {/* Middle row */}
          <div className="middle">

            {/* Hijri Calendar */}
            <div className="card">
              <div className="cal-header">
                {calMonth && calYear
                  ? `${HIJRI_MONTHS[calMonth - 1]} ${calYear}`
                  : 'Calendar'}
              </div>
              <div className="cal-grid">
                {calDays.map(day => (
                  <div
                    key={day}
                    className={[
                      'cal-day',
                      isToday(day) ? 'today' : '',
                      isUncertain(day) ? 'uncertain' : '',
                    ].filter(Boolean).join(' ')}
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

            {/* Prayer section */}
            <div className="prayer-section">

              {/* Circle */}
              <div className="circle-card">
                <div className="circle-wrap">
                  <svg width="160" height="160" viewBox="0 0 160 160">
                    <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="9" />
                    <circle
                      cx="80" cy="80" r={R}
                      fill="none"
                      stroke={circle.color}
                      strokeWidth="9"
                      strokeLinecap="round"
                      strokeDasharray={CIRC}
                      strokeDashoffset={dash}
                      style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
                    />
                  </svg>
                  <div className="circle-inner">
                    <span className="lbl-small">Time left for</span>
                    <span className="lbl-name">{circle.label}</span>
                    <span className="lbl-time">
                      {h > 0
                        ? `${h} hour${h !== 1 ? 's' : ''}\n${pad(m)} minutes`
                        : m > 0
                          ? `${m} minute${m !== 1 ? 's' : ''}\n${pad(s)} seconds`
                          : `${s} seconds`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Prayer list */}
              <div className="prayer-list">
                {(prayers.length
                  ? prayers
                  : [{ name: 'Fajr' }, { name: 'Dhuhr' }, { name: 'Asr' }, { name: 'Maghrib' }, { name: 'Isha' }]
                ).map(p => (
                  <div key={p.name} className="prayer-row">
                    <span className="pname">{p.name}</span>
                    <span className="ptime" style={!p.time ? { color: 'var(--text-dim)' } : {}}>
                      {p.time || '—'}
                    </span>
                  </div>
                ))}
              </div>

            </div>
          </div>

          {/* Daily Ayah */}
          <div className="ayah-card">
            <div className="ayah-label">Daily Ayah</div>
            <div className="ayah-arabic">{ayah.arabic}</div>
            <div className="ayah-trans">{ayah.translation}</div>
            <div className="ayah-ref">{ayah.ref}</div>
          </div>

        </div>

        {/* ══ RIGHT PANEL (Chat) ══ */}
        <div className="right">
          <div className="chat-msgs">
            {messages.map((msg, i) => (
              <div key={i} className={`bubble ${msg.role}`}>
                {msg.content}
              </div>
            ))}
            {chatLoading && (
              <div className="bubble assistant loading">Noor is typing…</div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="chat-input-row">
            <textarea
              className="chat-input"
              rows={1}
              placeholder="Start typing..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
            />
            <button
              className="send-btn"
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
