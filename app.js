/**
 * BẢNG GÕ TRỢ NĂNG TIẾNG VIỆT — PHIÊN BẢN TRÀN MÀN HÌNH DI ĐỘNG
 * Tối ưu hóa phản hồi cảm ứng, rung xúc giác (haptic) và phát âm tiếng Việt
 */

// BẢNG QUY TẮC DẤU THANH TIẾNG VIỆT
const TONE_MAP = {
  'A': ['A','Á','À','Ả','Ã','Ạ'], 'Ă': ['Ă','Ắ','Ằ','Ẳ','Ẵ','Ặ'],
  'Â': ['Â','Ấ','Ầ','Ẩ','Ẫ','Ậ'], 'E': ['E','É','È','Ẻ','Ẽ','Ẹ'],
  'Ê': ['Ê','Ế','Ề','Ể','Ễ','Ệ'], 'I': ['I','Í','Ì','Ỉ','Ĩ','Ị'],
  'O': ['O','Ó','Ò','Ỏ','Õ','Ọ'], 'Ô': ['Ô','Ố','Ồ','Ổ','Ỗ','Ộ'],
  'Ơ': ['Ơ','Ớ','Ờ','Ở','Ỡ','Ợ'], 'U': ['U','Ú','Ù','Ủ','Ũ','Ụ'],
  'Ư': ['Ư','Ứ','Ừ','Ử','Ữ','Ự'], 'Y': ['Y','Ý','Ỳ','Ỷ','Ỹ','Ỵ'],
  'a': ['a','á','à','ả','ã','ạ'], 'ă': ['ă','ắ','ằ','ẳ','ẵ','ặ'],
  'â': ['â','ấ','ầ','ẩ','ẫ','ậ'], 'e': ['e','é','è','ẻ','ẽ','ẹ'],
  'ê': ['ê','ế','ề','ể','ễ','ệ'], 'i': ['i','í','ì','ỉ','ĩ','ị'],
  'o': ['o','ó','ò','ỏ','õ','ọ'], 'ô': ['ô','ố','ồ','ổ','ỗ','ộ'],
  'ơ': ['ơ','ớ','ờ','ở','ỡ','ợ'], 'u': ['u','ú','ù','ủ','ũ','ụ'],
  'ư': ['ư','ứ','ừ','ử','ữ','ự'], 'y': ['y','ý','ỳ','ỷ','ỹ','ỵ']
};

const TONE_INDEX = { ngang:0, sac:1, huyen:2, hoi:3, nga:4, nang:5 };

function getVowelInfo(ch) {
  for (const [, forms] of Object.entries(TONE_MAP)) {
    const i = forms.indexOf(ch);
    if (i !== -1) return { base: forms[0], tone: i };
  }
  return null;
}
function isVowel(ch) { return getVowelInfo(ch) !== null; }
function applyToneToChar(ch, ti) {
  const info = getVowelInfo(ch);
  return info ? TONE_MAP[info.base][ti] : ch;
}

function findVowelToneIndex(chars, vi) {
  if (vi.length === 1) return vi[0];
  const vowels = vi.map(i => chars[i].toUpperCase()).join('');
  const hasFinalCons = !vi.includes(chars.length - 1);

  if (vowels.includes('ƯƠ')) return vi[vowels.indexOf('ƯƠ') + 1];
  if (vowels.includes('UÔ')) return vi[vowels.indexOf('UÔ') + 1];
  if (vowels.includes('IÊ') || vowels.includes('YÊ')) {
    const idx = vowels.indexOf('Ê');
    if (idx !== -1) return vi[idx];
  }

  const prio = ['Ê','Ô','Ơ','Â','Ă','Ư'];
  for (const p of prio) {
    const fi = vi.findIndex(i => chars[i].toUpperCase() === p);
    if (fi !== -1) return vi[fi];
  }

  if (hasFinalCons) return vi[vi.length - 1];
  if (['OA','OE','UY'].includes(vowels)) return vi[0];
  if (['ƯA','UA','IA'].includes(vowels)) return vi[0];
  return vi[0];
}

function applyToneToWord(word, toneType) {
  if (!word) return word;
  const ti = TONE_INDEX[toneType] !== undefined ? TONE_INDEX[toneType] : 0;
  const chars = word.split('');
  const vi = [];
  for (let i = 0; i < chars.length; i++) if (isVowel(chars[i])) vi.push(i);
  if (!vi.length) return word;
  for (const idx of vi) chars[idx] = applyToneToChar(chars[idx], 0);
  if (ti === 0) return chars.join('');
  const target = findVowelToneIndex(chars, vi);
  chars[target] = applyToneToChar(chars[target], ti);
  return chars.join('');
}

// ỨNG DỤNG ĐIỀU KHIỂN CHÍNH
class MobileVietKeyboard {
  constructor() {
    this.currentText = '';
    this.audioCtx = null;
    this.vietVoice = null;
    this.customPhrases = [];
    this.history = [];
    this.bsTimer = null;
    this.bsInterval = null;

    // Cache phần tử giao diện
    this.displayEl    = document.getElementById('textDisplay');
    this.screenBox    = document.getElementById('screenBox');
    this.cursorLine   = document.getElementById('cursorLine');
    this.btnSpeak     = document.getElementById('btnSpeak');
    this.btnBackspace = document.getElementById('btnBackspace');
    this.btnClear     = document.getElementById('btnClear');
    this.btnTheme     = document.getElementById('btnThemeToggle');
    this.btnFullscreen= document.getElementById('btnFullscreen');
    this.btnToggleNum = document.getElementById('btnToggleNum');
    this.rowNumbers   = document.getElementById('rowNumbers');
    this.liveClock    = document.getElementById('liveClock');
    this.chkAutoSpeak = document.getElementById('chkAutoSpeak');
    this.customGrid   = document.getElementById('customPhrasesGrid');
    this.btnAddCustom = document.getElementById('btnAddCustomPhrase');
    this.historyList  = document.getElementById('historyList');
    this.btnClearHist = document.getElementById('btnClearHistory');
    this.toastBox     = document.getElementById('toastContainer');
    this.confettiEl   = document.getElementById('confettiCanvas');

    this.tabs = document.querySelectorAll('.nav-tab');
    this.views = {
      keyboard: document.getElementById('keyboardView'),
      phrases:  document.getElementById('quickPhrasesView'),
      history:  document.getElementById('historyView')
    };

    this.init();
  }

  init() {
    this.bindEvents();
    this.initAudio();
    this.initSpeech();
    this.loadState();
    this.loadCustomPhrases();
    this.loadHistory();
    this.startClock();
    this.render();
  }

  // Phản hồi âm thanh & rung (Haptic feedback)
  triggerFeedback() {
    // 1. Rung nhẹ máy điện thoại (15ms)
    if (navigator.vibrate) {
      try { navigator.vibrate(15); } catch (e) {}
    }

    // 2. Tiếng click êm ái
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') this.audioCtx.resume();
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(500, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, this.audioCtx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.04);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.04);
    } catch (e) {}
  }

  initAudio() {
    const unlock = () => {
      if (!this.audioCtx) this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      document.removeEventListener('touchstart', unlock);
      document.removeEventListener('click', unlock);
    };
    document.addEventListener('touchstart', unlock, { once: true });
    document.addEventListener('click', unlock, { once: true });
  }

  // Khởi tạo giọng đọc tiếng Việt
  initSpeech() {
    if (!('speechSynthesis' in window)) return;
    const findVoice = () => {
      const voices = speechSynthesis.getVoices();
      this.vietVoice = voices.find(v => v.lang.toLowerCase().includes('vi')) || null;
    };
    findVoice();
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = findVoice;
    }
  }

  speak(text) {
    const target = (text || this.currentText).trim();
    if (!target) {
      this.toast('⚠️ Chưa có chữ nào để đọc!');
      return;
    }
    if (!('speechSynthesis' in window)) {
      this.toast('⚠️ Trình duyệt chưa hỗ trợ phát âm');
      return;
    }

    speechSynthesis.cancel();
    const utt = new SpeechSynthesisUtterance(target);
    utt.lang = 'vi-VN';
    utt.rate = 0.88;
    utt.pitch = 1.0;
    if (this.vietVoice) utt.voice = this.vietVoice;

    utt.onstart = () => {
      this.btnSpeak.classList.add('speaking');
    };
    utt.onend = () => {
      this.btnSpeak.classList.remove('speaking');
    };
    utt.onerror = () => {
      this.btnSpeak.classList.remove('speaking');
    };

    speechSynthesis.speak(utt);
    this.toast('🔊 Đang đọc: "' + target + '"');
  }

  render() {
    if (!this.currentText) {
      this.displayEl.innerHTML = '<span class="placeholder">Chạm phím bên dưới để gõ...</span>';
      this.screenBox.classList.remove('has-content');
      this.cursorLine.style.display = 'block';
    } else {
      this.displayEl.textContent = this.currentText;
      this.screenBox.classList.add('has-content');
      this.cursorLine.style.display = 'none';
    }
    requestAnimationFrame(() => {
      this.displayEl.scrollLeft = this.displayEl.scrollWidth;
    });
  }

  addChar(c) {
    this.triggerFeedback();
    this.currentText += c;
    this.render();
  }

  addSpace() {
    this.triggerFeedback();
    if (this.currentText.length > 0 && !this.currentText.endsWith(' ')) {
      this.currentText += ' ';
    }
    this.render();
  }

  backspace() {
    this.triggerFeedback();
    if (this.currentText.length > 0) {
      this.currentText = this.currentText.slice(0, -1);
      this.render();
    }
  }

  clear() {
    this.triggerFeedback();
    if (!this.currentText) return;
    this.saveHistory(this.currentText);
    this.currentText = '';
    this.render();
    this.toast('Đã xóa hết câu');
  }

  applyTone(tone) {
    this.triggerFeedback();
    if (!this.currentText.trim()) return;
    const match = this.currentText.match(/^(.*[\s\.,\?!])?([^\s\.,\?!]+)$/u);
    if (!match) return;
    const prefix = match[1] || '';
    const word = match[2];
    this.currentText = prefix + applyToneToWord(word, tone);
    this.render();
  }

  selectPhrase(text) {
    this.triggerFeedback();
    this.currentText = text;
    this.render();
    this.saveHistory(text);
    if (this.chkAutoSpeak.checked) {
      this.speak(text);
    } else {
      this.toast('Đã chọn câu. Bấm ĐỌC TO để phát ra loa.');
    }
  }

  switchTab(target) {
    this.triggerFeedback();
    this.tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === target));
    for (const [key, view] of Object.entries(this.views)) {
      view.classList.toggle('active', key === target);
    }
    if (target === 'history') this.renderHistory();
  }

  toggleDarkMode() {
    this.triggerFeedback();
    const isDark = document.body.classList.toggle('dark-mode');
    localStorage.setItem('viet_dark', isDark ? '1' : '0');
    this.toast(isDark ? '🌙 Đã đổi Giao diện Tối' : '☀️ Đã đổi Giao diện Sáng');
  }

  toggleFullscreen() {
    this.triggerFeedback();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      this.toast('⛶ Toàn màn hình');
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }

  toggleNumbers() {
    this.triggerFeedback();
    const shown = this.rowNumbers.classList.toggle('show');
    this.btnToggleNum.style.background = shown ? '#2563eb' : '';
    this.btnToggleNum.style.color = shown ? '#ffffff' : '';
  }

  toast(msg) {
    const el = document.createElement('div');
    el.className = 'toast-msg';
    el.textContent = msg;
    this.toastBox.appendChild(el);
    setTimeout(() => { if (el.parentNode) el.remove(); }, 2200);
  }

  // Quản lý câu riêng
  loadCustomPhrases() {
    try {
      const s = localStorage.getItem('viet_custom_phrases');
      if (s) this.customPhrases = JSON.parse(s);
    } catch (e) { this.customPhrases = []; }
    this.renderCustomPhrases();
  }

  addCustomPrompt() {
    const text = prompt('Nhập câu nói quen thuộc mới cho bà:');
    if (text && text.trim()) {
      this.customPhrases.push(text.trim());
      localStorage.setItem('viet_custom_phrases', JSON.stringify(this.customPhrases));
      this.renderCustomPhrases();
      this.toast('Đã thêm câu mới!');
    }
  }

  deleteCustom(idx) {
    if (confirm('Xóa câu này khỏi danh sách?')) {
      this.customPhrases.splice(idx, 1);
      localStorage.setItem('viet_custom_phrases', JSON.stringify(this.customPhrases));
      this.renderCustomPhrases();
    }
  }

  renderCustomPhrases() {
    this.customGrid.querySelectorAll('.p-custom-card').forEach(c => c.remove());
    this.customPhrases.forEach((phrase, i) => {
      const btn = document.createElement('button');
      btn.className = 'p-card p-custom-card card-love';
      btn.dataset.phrase = phrase;
      btn.innerHTML = `
        <span class="p-badge">⭐</span>
        <span class="p-label">${phrase}</span>
        <button class="btn-del-phrase" data-idx="${i}" title="Xóa">✕</button>
      `;
      this.customGrid.insertBefore(btn, this.btnAddCustom);
    });
  }

  // Quản lý lịch sử
  loadHistory() {
    try {
      const s = localStorage.getItem('viet_history');
      if (s) this.history = JSON.parse(s);
    } catch (e) { this.history = []; }
  }

  saveHistory(text) {
    if (!text || !text.trim()) return;
    const clean = text.trim();
    if (this.history.length > 0 && this.history[0] === clean) return;
    this.history.unshift(clean);
    if (this.history.length > 10) this.history.pop();
    localStorage.setItem('viet_history', JSON.stringify(this.history));
  }

  renderHistory() {
    if (!this.history.length) {
      this.historyList.innerHTML = '<div class="h-empty">Chưa có câu nào trong lịch sử</div>';
      return;
    }
    this.historyList.innerHTML = this.history.map((t, idx) => `
      <div class="h-card" data-text="${t}">
        <span class="h-idx">${idx + 1}</span>
        <span>${t}</span>
      </div>
    `).join('');
  }

  clearHistory() {
    if (confirm('Xóa hết lịch sử các câu vừa gõ?')) {
      this.history = [];
      localStorage.setItem('viet_history', JSON.stringify(this.history));
      this.renderHistory();
      this.toast('Đã xóa lịch sử');
    }
  }

  startClock() {
    const tick = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      this.liveClock.textContent = `${hh}:${mm}`;
    };
    tick();
    setInterval(tick, 30000);
  }

  loadState() {
    if (localStorage.getItem('viet_dark') === '1') {
      document.body.classList.add('dark-mode');
    }
    const auto = localStorage.getItem('viet_auto_speak');
    this.chkAutoSpeak.checked = auto !== null ? auto === '1' : true;
  }

  bindEvents() {
    this.btnSpeak.addEventListener('click', () => {
      this.triggerFeedback();
      this.speak();
    });
    this.btnClear.addEventListener('click', () => this.clear());
    this.btnTheme.addEventListener('click', () => this.toggleDarkMode());
    this.btnFullscreen.addEventListener('click', () => this.toggleFullscreen());
    this.btnToggleNum.addEventListener('click', () => this.toggleNumbers());

    // Giữ xóa Backspace
    const startBS = (e) => {
      e.preventDefault();
      this.backspace();
      this.bsTimer = setTimeout(() => {
        this.bsInterval = setInterval(() => this.backspace(), 110);
      }, 400);
    };
    const endBS = () => {
      clearTimeout(this.bsTimer);
      clearInterval(this.bsInterval);
    };
    this.btnBackspace.addEventListener('mousedown', startBS);
    this.btnBackspace.addEventListener('touchstart', startBS, { passive: false });
    this.btnBackspace.addEventListener('mouseup', endBS);
    this.btnBackspace.addEventListener('mouseleave', endBS);
    this.btnBackspace.addEventListener('touchend', endBS);
    this.btnBackspace.addEventListener('touchcancel', endBS);

    // Chuyển tab
    this.tabs.forEach(tab => {
      tab.addEventListener('click', () => this.switchTab(tab.dataset.tab));
    });

    this.chkAutoSpeak.addEventListener('change', (e) => {
      localStorage.setItem('viet_auto_speak', e.target.checked ? '1' : '0');
    });

    if (this.btnAddCustom) {
      this.btnAddCustom.addEventListener('click', () => this.addCustomPrompt());
    }
    if (this.btnClearHist) {
      this.btnClearHist.addEventListener('click', () => this.clearHistory());
    }

    // Bấm phím ảo
    document.getElementById('keyboardView').addEventListener('click', (e) => {
      const key = e.target.closest('.k-key');
      if (!key || key.id === 'btnToggleNum') return;

      key.classList.add('key-hit');
      setTimeout(() => key.classList.remove('key-hit'), 100);

      const char = key.dataset.char;
      const tone = key.dataset.tone;
      const action = key.dataset.action;

      if (char) this.addChar(char);
      else if (tone) this.applyTone(tone);
      else if (action === 'removeTone') this.applyTone('ngang');
      else if (action === 'space') this.addSpace();
    });

    // Bấm câu nhanh
    document.getElementById('quickPhrasesView').addEventListener('click', (e) => {
      const del = e.target.closest('.btn-del-phrase');
      if (del) {
        e.stopPropagation();
        this.deleteCustom(parseInt(del.dataset.idx, 10));
        return;
      }
      const card = e.target.closest('.p-card');
      if (!card || card.id === 'btnAddCustomPhrase') return;
      const phrase = card.dataset.phrase;
      if (phrase) this.selectPhrase(phrase);
    });

    // Chọn từ lịch sử
    this.historyList.addEventListener('click', (e) => {
      const card = e.target.closest('.h-card');
      if (!card) return;
      const text = card.dataset.text;
      if (text) {
        this.currentText = text;
        this.render();
        this.switchTab('keyboard');
        this.toast('Đã lấy lại câu');
      }
    });

    // Hỗ trợ bàn phím máy tính
    window.addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'Backspace') { e.preventDefault(); this.backspace(); }
      else if (e.key === ' ') { e.preventDefault(); this.addSpace(); }
      else if (e.key === 'Enter') { e.preventDefault(); this.speak(); }
      else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        this.addChar(e.key.toUpperCase());
      }
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.vietKeyApp = new MobileVietKeyboard();
});
