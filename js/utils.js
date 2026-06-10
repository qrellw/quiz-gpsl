/* ============================================
   GPSL Quiz - Utility Functions
   ============================================ */

const Utils = {
  // ---- Storage ----
  STORAGE_KEY: 'gpsl_quiz_data',

  getStorage() {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      return raw ? JSON.parse(raw) : this.getDefaultStorage();
    } catch {
      return this.getDefaultStorage();
    }
  },

  getDefaultStorage() {
    return {
      theme: 'dark',
      history: {},       // { [questionId]: { answered: true, correct: bool, selectedKey: string } }
      bookmarks: [],     // [questionId, ...]
      sessions: [],      // [{ date, mode, total, correct, wrong }]
    };
  },

  saveStorage(data) {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  },

  // ---- Shuffle (Fisher-Yates) ----
  shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  },

  // ---- Format Time ----
  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // ---- Render simple markdown ----
  renderMarkdown(text) {
    if (!text) return '';
    let html = text
      // Bold **text**
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // Italic *text*
      .replace(/(?<!\*)\*(?!\*)(.*?)\*(?!\*)/g, '<em>$1</em>')
      // Bullet list items (lines starting with -)
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      // Indented bullet list items (lines starting with  -)
      .replace(/^  - (.+)$/gm, '<li style="margin-left:16px">$1</li>')
      // Line breaks
      .replace(/\n/g, '<br>');

    // Wrap consecutive <li> in <ul>
    html = html.replace(/((?:<li[^>]*>.*?<\/li><br>?)+)/g, (match) => {
      const cleaned = match.replace(/<br>/g, '');
      return '<ul>' + cleaned + '</ul>';
    });

    return html;
  },

  // ---- Toast notification ----
  showToast(message) {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  },

  // ---- Modal ----
  showModal(title, message) {
    return new Promise((resolve) => {
      const overlay = document.getElementById('modal-overlay');
      const modalTitle = document.getElementById('modal-title');
      const modalMsg = document.getElementById('modal-message');
      const btnCancel = document.getElementById('modal-cancel');
      const btnConfirm = document.getElementById('modal-confirm');

      modalTitle.textContent = title;
      modalMsg.textContent = message;
      overlay.classList.remove('hidden');

      const cleanup = () => {
        overlay.classList.add('hidden');
        btnCancel.removeEventListener('click', onCancel);
        btnConfirm.removeEventListener('click', onConfirm);
      };

      const onCancel = () => { cleanup(); resolve(false); };
      const onConfirm = () => { cleanup(); resolve(true); };

      btnCancel.addEventListener('click', onCancel);
      btnConfirm.addEventListener('click', onConfirm);
    });
  },

  // ---- Compute stats from storage ----
  computeStats(storage) {
    const history = storage.history || {};
    const ids = Object.keys(history);
    const total = ids.length;
    const correct = ids.filter(id => history[id].correct).length;
    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    const bookmarks = (storage.bookmarks || []).length;

    return { total, correct, rate, bookmarks };
  },

  // ---- Compute per-chapter stats ----
  computeChapterStats(storage, chapters, questions) {
    return chapters.map(ch => {
      const chapterQuestions = questions.filter(q => q.chapterIndex === ch.index);
      const answered = chapterQuestions.filter(q => storage.history[q.id]);
      const correct = answered.filter(q => storage.history[q.id]?.correct);
      const total = chapterQuestions.length;
      const done = answered.length;
      const rate = done > 0 ? Math.round((correct.length / done) * 100) : 0;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;

      return {
        ...ch,
        total,
        done,
        correctCount: correct.length,
        rate,
        progress
      };
    });
  },

  // ---- Short chapter name ----
  shortChapterName(title) {
    // Remove "GIẢI PHẪU – SINH LÝ " prefix for brevity
    return title
      .replace(/^GIẢI PHẪU – SINH LÝ\s*/i, '')
      .replace(/^ĐẠI CƯƠNG\s*/i, '')
      .trim();
  }
};
