/* ============================================
   GPSL Quiz - Main Application
   ============================================ */

const App = {
  // ---- State ----
  storage: null,
  currentScreen: 'home',
  quizMode: 'practice', // 'practice' | 'exam'
  quizQuestions: [],
  currentIndex: 0,
  answers: {},  // { [questionId]: selectedKey }
  shuffleOptions: true,
  optionMaps: {}, // { [questionId]: shuffled options array }
  timerInterval: null,
  timerSeconds: 0,
  timePerQuestion: 60,

  // ---- Initialize ----
  init() {
    this.storage = Utils.getStorage();
    this.applyTheme(this.storage.theme || 'dark');
    this.bindEvents();
    this.renderHome();

    // Hide loading screen
    setTimeout(() => {
      document.getElementById('loading-screen').classList.add('fade-out');
      document.getElementById('app').classList.remove('hidden');
      setTimeout(() => document.getElementById('loading-screen').remove(), 500);
    }, 600);
  },

  // ---- Event Bindings ----
  bindEvents() {
    // Theme toggle
    document.getElementById('btn-theme').addEventListener('click', () => this.toggleTheme());

    // Back button
    document.getElementById('btn-back').addEventListener('click', () => this.goBack());

    // Mode buttons
    document.getElementById('btn-mode-practice').addEventListener('click', () => {
      this.quizMode = 'practice';
      // Show chapter selection visually (scrolls to chapters)
      document.querySelector('.chapter-section').scrollIntoView({ behavior: 'smooth' });
      Utils.showToast('🎯 Chọn một chương để bắt đầu luyện tập');
    });

    document.getElementById('btn-mode-exam').addEventListener('click', () => {
      this.quizMode = 'exam';
      this.showScreen('setup');
    });

    document.getElementById('btn-mode-bookmark').addEventListener('click', () => {
      const bookmarkedQs = QUESTIONS.filter(q => this.storage.bookmarks.includes(q.id));
      if (bookmarkedQs.length === 0) {
        Utils.showToast('⭐ Chưa có câu nào được đánh dấu');
        return;
      }
      this.quizMode = 'practice';
      this.startQuiz(bookmarkedQs);
    });

    document.getElementById('btn-mode-wrong').addEventListener('click', () => {
      const wrongIds = Object.keys(this.storage.history)
        .filter(id => !this.storage.history[id].correct)
        .map(Number);
      const wrongQs = QUESTIONS.filter(q => wrongIds.includes(q.id));
      if (wrongQs.length === 0) {
        Utils.showToast('✅ Chưa có câu nào trả lời sai');
        return;
      }
      this.quizMode = 'practice';
      this.startQuiz(Utils.shuffle(wrongQs));
    });

    // Setup screen
    document.getElementById('btn-start-exam').addEventListener('click', () => this.startExam());

    // Chip selection
    document.querySelectorAll('.setup-chips').forEach(container => {
      container.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        container.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
      });
    });

    // Quiz navigation
    document.getElementById('btn-prev').addEventListener('click', () => this.prevQuestion());
    document.getElementById('btn-next').addEventListener('click', () => this.nextQuestion());
    document.getElementById('btn-bookmark').addEventListener('click', () => this.toggleBookmark());
    document.getElementById('btn-submit-exam').addEventListener('click', () => this.submitExam());

    // Result actions
    document.getElementById('btn-retry').addEventListener('click', () => this.retryQuiz());
    document.getElementById('btn-home').addEventListener('click', () => this.showScreen('home'));

    // Stats
    document.getElementById('btn-reset-stats').addEventListener('click', () => this.resetStats());

    // Bottom nav
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        this.showScreen(screen);
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => this.handleKeyboard(e));

    // Populate setup chapter select
    const select = document.getElementById('setup-chapter');
    CHAPTERS.forEach(ch => {
      const opt = document.createElement('option');
      opt.value = ch.index;
      opt.textContent = `${ch.title} (${ch.count} câu)`;
      select.appendChild(opt);
    });
  },

  // ---- Theme ----
  toggleTheme() {
    const newTheme = this.storage.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(newTheme);
    this.storage.theme = newTheme;
    Utils.saveStorage(this.storage);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const moonIcon = document.getElementById('icon-moon');
    const sunIcon = document.getElementById('icon-sun');
    if (theme === 'dark') {
      moonIcon.style.display = 'block';
      sunIcon.style.display = 'none';
    } else {
      moonIcon.style.display = 'none';
      sunIcon.style.display = 'block';
    }
  },

  // ---- Screen Management ----
  showScreen(name) {
    // Clear timer if leaving quiz
    if (this.currentScreen === 'quiz' && name !== 'quiz') {
      this.stopTimer();
    }

    document.querySelectorAll('.screen').forEach(s => s.classList.add('hidden'));
    const screen = document.getElementById(`screen-${name}`);
    if (screen) {
      screen.classList.remove('hidden');
      // Re-trigger animation
      screen.style.animation = 'none';
      screen.offsetHeight; // force reflow
      screen.style.animation = '';
    }

    this.currentScreen = name;

    // Nav updates
    const backBtn = document.getElementById('nav-back');
    const bottomNav = document.getElementById('bottom-nav');

    if (name === 'home') {
      backBtn.style.display = 'none';
      bottomNav.classList.remove('hidden');
      document.getElementById('nav-title').textContent = 'GPSL Quiz';
      this.renderHome();
    } else if (name === 'stats') {
      backBtn.style.display = 'none';
      bottomNav.classList.remove('hidden');
      document.getElementById('nav-title').textContent = 'Thống kê';
      this.renderStats();
    } else {
      backBtn.style.display = 'flex';
      bottomNav.classList.add('hidden');
    }

    // Bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.screen === name);
    });

    if (name === 'setup') {
      document.getElementById('nav-title').textContent = 'Thiết lập';
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  goBack() {
    if (this.currentScreen === 'quiz') {
      if (this.quizMode === 'exam') {
        Utils.showModal('Thoát bài thi?', 'Tiến trình thi sẽ mất nếu thoát. Bạn có chắc?').then(ok => {
          if (ok) { this.stopTimer(); this.showScreen('home'); }
        });
      } else {
        this.showScreen('home');
      }
    } else if (this.currentScreen === 'result') {
      this.showScreen('home');
    } else if (this.currentScreen === 'setup') {
      this.showScreen('home');
    } else {
      this.showScreen('home');
    }
  },

  // ---- Render Home ----
  renderHome() {
    const stats = Utils.computeStats(this.storage);
    document.getElementById('stat-completed').textContent = stats.total;
    document.getElementById('stat-correct-rate').textContent = stats.rate + '%';
    document.getElementById('stat-bookmarked').textContent = stats.bookmarks;
    document.getElementById('total-questions').textContent = QUESTIONS.length;
    document.getElementById('total-chapters').textContent = CHAPTERS.length;

    // Chapter grid
    const grid = document.getElementById('chapter-grid');
    grid.innerHTML = '';

    const chapterStats = Utils.computeChapterStats(this.storage, CHAPTERS, QUESTIONS);

    chapterStats.forEach(ch => {
      const card = document.createElement('div');
      card.className = 'chapter-card';
      card.style.setProperty('--progress', ch.progress + '%');
      card.innerHTML = `
        <div class="chapter-num">${ch.index + 1}</div>
        <div class="chapter-info">
          <div class="chapter-title">${ch.title}</div>
          <div class="chapter-meta">${ch.count} câu • ${ch.done > 0 ? ch.rate + '% đúng' : 'Chưa làm'}</div>
        </div>
        <span class="chapter-badge">${ch.done}/${ch.count}</span>
      `;
      card.addEventListener('click', () => {
        const qs = QUESTIONS.filter(q => q.chapterIndex === ch.index);
        this.quizMode = 'practice';
        this.startQuiz(qs);
      });
      grid.appendChild(card);
    });
  },

  // ---- Start Quiz (Practice Mode) ----
  startQuiz(questions) {
    this.quizQuestions = [...questions];
    this.currentIndex = 0;
    this.answers = {};
    this.optionMaps = {};

    document.getElementById('nav-title').textContent = 
      this.quizMode === 'exam' ? '⏱️ Thi thử' : '🎯 Luyện tập';

    // Hide exam-specific elements
    const examSubmit = document.getElementById('exam-submit');
    const timerDisplay = document.getElementById('timer-display');
    examSubmit.classList.add('hidden');
    timerDisplay.style.display = 'none';

    this.showScreen('quiz');
    this.renderQuestion();
  },

  // ---- Start Exam ----
  startExam() {
    const chapterSelect = document.getElementById('setup-chapter');
    const chapterValue = chapterSelect.value;

    // Get selected count
    const countChip = document.querySelector('#setup-count .chip.active');
    const countValue = countChip ? countChip.dataset.value : '10';

    // Get time per question
    const timeChip = document.querySelector('#setup-time .chip.active');
    this.timePerQuestion = timeChip ? parseInt(timeChip.dataset.value) : 60;

    // Filter questions
    let pool = chapterValue === 'all' ? [...QUESTIONS] : QUESTIONS.filter(q => q.chapterIndex === parseInt(chapterValue));
    pool = Utils.shuffle(pool);

    // Limit count
    const count = countValue === 'all' ? pool.length : Math.min(parseInt(countValue), pool.length);
    const selected = pool.slice(0, count);

    if (selected.length === 0) {
      Utils.showToast('Không có câu hỏi nào phù hợp');
      return;
    }

    this.quizMode = 'exam';
    this.quizQuestions = selected;
    this.currentIndex = 0;
    this.answers = {};
    this.optionMaps = {};

    document.getElementById('nav-title').textContent = '⏱️ Thi thử';

    // Show exam elements
    const examSubmit = document.getElementById('exam-submit');
    examSubmit.classList.remove('hidden');

    // Timer
    if (this.timePerQuestion > 0) {
      this.timerSeconds = this.timePerQuestion;
      document.getElementById('timer-display').style.display = 'inline';
      this.startTimer();
    } else {
      document.getElementById('timer-display').style.display = 'none';
    }

    this.showScreen('quiz');
    this.renderQuestion();
  },

  // ---- Render Question ----
  renderQuestion() {
    const q = this.quizQuestions[this.currentIndex];
    if (!q) return;

    const options = q.options;

    // Progress
    const total = this.quizQuestions.length;
    const current = this.currentIndex + 1;
    document.getElementById('progress-fill').style.width = `${(current / total) * 100}%`;
    document.getElementById('progress-text').textContent = `Câu ${current}/${total}`;

    // Chapter
    document.getElementById('question-chapter').textContent = q.chapter;

    // Question text
    document.getElementById('question-text').textContent = `Câu ${q.localNum}: ${q.question}`;

    // Bookmark state
    const btnBookmark = document.getElementById('btn-bookmark');
    btnBookmark.classList.toggle('active', this.storage.bookmarks.includes(q.id));

    // Options
    const optionsList = document.getElementById('options-list');
    optionsList.innerHTML = '';

    const selectedKey = this.answers[q.id];
    const isAnswered = selectedKey !== undefined;
    const isPractice = this.quizMode === 'practice';

    options.forEach(opt => {
      const btn = document.createElement('button');
      btn.className = 'option-btn';
      btn.dataset.key = opt.key;

      if (isAnswered) {
        btn.classList.add('disabled');

        if (isPractice) {
          if (opt.key === q.answer) {
            btn.classList.add('correct');
          }
          if (opt.key === selectedKey && selectedKey !== q.answer) {
            btn.classList.add('wrong');
          }
        } else {
          // Exam mode: just highlight selected
          if (opt.key === selectedKey) {
            btn.classList.add('selected');
          }
        }
      }

      btn.innerHTML = `
        <span class="option-key">${opt.key}</span>
        <span class="option-text">${opt.text}</span>
      `;

      if (!isAnswered || (this.quizMode === 'exam')) {
        btn.addEventListener('click', () => this.selectAnswer(q, opt.key));
      }

      optionsList.appendChild(btn);
    });

    // Re-enable option selection in exam mode (can change answer)
    if (this.quizMode === 'exam' && isAnswered) {
      optionsList.querySelectorAll('.option-btn').forEach(btn => {
        btn.classList.remove('disabled');
        btn.addEventListener('click', () => this.selectAnswer(q, btn.dataset.key));
      });
    }

    // Explanation
    const panel = document.getElementById('explanation-panel');
    if (isPractice && isAnswered) {
      const isCorrect = selectedKey === q.answer;
      const header = document.getElementById('explanation-header');
      header.className = 'explanation-header ' + (isCorrect ? 'correct' : 'wrong');
      header.textContent = isCorrect ? '✅ Đúng rồi!' : `❌ Sai rồi! Đáp án đúng: ${q.answer}`;

      document.getElementById('explanation-body').innerHTML = Utils.renderMarkdown(q.explanation);
      panel.classList.remove('hidden');
    } else {
      panel.classList.add('hidden');
    }

    // Nav buttons
    document.getElementById('btn-prev').disabled = this.currentIndex === 0;

    const nextBtn = document.getElementById('btn-next');
    if (this.currentIndex === total - 1) {
      if (this.quizMode === 'practice') {
        nextBtn.textContent = '🏁 Hoàn thành';
        nextBtn.innerHTML = '🏁 Hoàn thành';
      } else {
        nextBtn.classList.add('hidden');
      }
    } else {
      nextBtn.classList.remove('hidden');
      nextBtn.innerHTML = 'Câu tiếp <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
    }

    // Reset timer for exam mode
    if (this.quizMode === 'exam' && this.timePerQuestion > 0) {
      this.resetTimer();
    }
  },

  // ---- Select Answer ----
  selectAnswer(question, key) {
    if (this.quizMode === 'practice') {
      // Already answered in practice mode? Skip
      if (this.answers[question.id] !== undefined) return;
    }

    this.answers[question.id] = key;

    if (this.quizMode === 'practice') {
      // Save to history
      const isCorrect = key === question.answer;
      this.storage.history[question.id] = {
        answered: true,
        correct: isCorrect,
        selectedKey: key
      };
      Utils.saveStorage(this.storage);
    }

    this.renderQuestion();

    // Auto-scroll to explanation in practice mode
    if (this.quizMode === 'practice') {
      setTimeout(() => {
        const panel = document.getElementById('explanation-panel');
        panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, 200);
    }
  },

  // ---- Navigation ----
  prevQuestion() {
    if (this.currentIndex > 0) {
      this.currentIndex--;
      this.renderQuestion();
    }
  },

  nextQuestion() {
    if (this.currentIndex < this.quizQuestions.length - 1) {
      this.currentIndex++;
      this.renderQuestion();
    } else if (this.quizMode === 'practice') {
      // End of practice
      this.finishPractice();
    }
  },

  // ---- Finish Practice ----
  finishPractice() {
    const total = this.quizQuestions.length;
    const answered = Object.keys(this.answers).length;
    const correct = this.quizQuestions.filter(q => this.answers[q.id] === q.answer).length;
    const wrong = answered - correct;
    const skipped = total - answered;

    this.showResult(total, correct, wrong, skipped);
  },

  // ---- Submit Exam ----
  async submitExam() {
    const unanswered = this.quizQuestions.filter(q => this.answers[q.id] === undefined).length;
    if (unanswered > 0) {
      const ok = await Utils.showModal(
        'Nộp bài?',
        `Còn ${unanswered} câu chưa trả lời. Bạn có chắc muốn nộp bài?`
      );
      if (!ok) return;
    }

    this.stopTimer();

    // Save to history
    this.quizQuestions.forEach(q => {
      const selectedKey = this.answers[q.id];
      if (selectedKey !== undefined) {
        this.storage.history[q.id] = {
          answered: true,
          correct: selectedKey === q.answer,
          selectedKey
        };
      }
    });
    Utils.saveStorage(this.storage);

    const total = this.quizQuestions.length;
    const answered = Object.keys(this.answers).length;
    const correct = this.quizQuestions.filter(q => this.answers[q.id] === q.answer).length;
    const wrong = answered - correct;
    const skipped = total - answered;

    // Save session
    this.storage.sessions.push({
      date: new Date().toISOString(),
      mode: 'exam',
      total,
      correct,
      wrong
    });
    Utils.saveStorage(this.storage);

    this.showResult(total, correct, wrong, skipped);
  },

  // ---- Show Result ----
  showResult(total, correct, wrong, skipped) {
    document.getElementById('score-value').textContent = correct;
    document.getElementById('score-total').textContent = `/${total}`;
    document.getElementById('result-correct').textContent = correct;
    document.getElementById('result-wrong').textContent = wrong;
    document.getElementById('result-skipped').textContent = skipped;

    const rate = total > 0 ? Math.round((correct / total) * 100) : 0;
    let title, subtitle;
    if (rate >= 90) { title = '🎉 Xuất sắc!'; subtitle = 'Bạn đã nắm vững kiến thức!'; }
    else if (rate >= 70) { title = '👏 Tốt lắm!'; subtitle = 'Tiếp tục ôn tập thêm nhé!'; }
    else if (rate >= 50) { title = '💪 Cố gắng hơn!'; subtitle = 'Bạn cần ôn lại các chương yếu.'; }
    else { title = '📚 Cần ôn tập nhiều hơn'; subtitle = 'Hãy xem lại giải thích từng câu.'; }

    document.getElementById('result-title').textContent = title;
    document.getElementById('result-subtitle').textContent = subtitle;

    // Animate score ring
    const circle = document.getElementById('score-circle');
    const circumference = 2 * Math.PI * 52; // r = 52
    const offset = circumference - (rate / 100) * circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
      if (rate >= 70) circle.style.stroke = 'var(--color-correct)';
      else if (rate >= 50) circle.style.stroke = 'var(--color-bookmark)';
      else circle.style.stroke = 'var(--color-wrong)';
    }, 100);

    // Review list (wrong questions)
    const reviewList = document.getElementById('review-list');
    reviewList.innerHTML = '';

    const wrongQs = this.quizQuestions.filter(q => {
      const key = this.answers[q.id];
      return key !== undefined && key !== q.answer;
    });

    if (wrongQs.length === 0) {
      document.getElementById('result-review').classList.add('hidden');
    } else {
      document.getElementById('result-review').classList.remove('hidden');
      wrongQs.forEach(q => {
        const item = document.createElement('div');
        item.className = 'review-item';
        item.innerHTML = `
          <div class="review-q">${q.question}</div>
          <div class="review-ans">
            Bạn chọn: <span class="your-ans">${this.answers[q.id]}</span>
            • Đáp án: <span class="correct-ans">${q.answer}</span>
          </div>
          <div class="review-explanation">${Utils.renderMarkdown(q.explanation)}</div>
        `;
        item.addEventListener('click', () => item.classList.toggle('expanded'));
        reviewList.appendChild(item);
      });
    }

    this.showScreen('result');

    // Reset score ring for animation
    circle.style.strokeDashoffset = circumference;
    setTimeout(() => {
      circle.style.strokeDashoffset = offset;
    }, 300);
  },

  // ---- Retry Quiz ----
  retryQuiz() {
    this.currentIndex = 0;
    this.answers = {};
    this.showScreen('quiz');
    this.renderQuestion();

    if (this.quizMode === 'exam') {
      document.getElementById('exam-submit').classList.remove('hidden');
      if (this.timePerQuestion > 0) {
        this.timerSeconds = this.timePerQuestion;
        document.getElementById('timer-display').style.display = 'inline';
        this.startTimer();
      }
    }
  },

  // ---- Bookmark ----
  toggleBookmark() {
    const q = this.quizQuestions[this.currentIndex];
    if (!q) return;

    const idx = this.storage.bookmarks.indexOf(q.id);
    if (idx >= 0) {
      this.storage.bookmarks.splice(idx, 1);
      Utils.showToast('Đã bỏ đánh dấu ⭐');
    } else {
      this.storage.bookmarks.push(q.id);
      Utils.showToast('Đã đánh dấu ⭐');
    }

    Utils.saveStorage(this.storage);
    document.getElementById('btn-bookmark').classList.toggle('active', this.storage.bookmarks.includes(q.id));
  },

  // ---- Timer ----
  startTimer() {
    this.stopTimer();
    this.timerSeconds = this.timePerQuestion;
    this.updateTimerDisplay();
    this.timerInterval = setInterval(() => {
      this.timerSeconds--;
      this.updateTimerDisplay();
      if (this.timerSeconds <= 0) {
        this.stopTimer();
        // Auto-advance
        if (this.currentIndex < this.quizQuestions.length - 1) {
          this.nextQuestion();
        } else {
          this.submitExam();
        }
      }
    }, 1000);
  },

  resetTimer() {
    this.stopTimer();
    if (this.timePerQuestion > 0) {
      this.startTimer();
    }
  },

  stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  },

  updateTimerDisplay() {
    const display = document.getElementById('timer-display');
    display.textContent = `⏱ ${Utils.formatTime(this.timerSeconds)}`;
    display.className = 'timer-display';
    if (this.timerSeconds <= 10) display.classList.add('danger');
    else if (this.timerSeconds <= 20) display.classList.add('warning');
  },

  // ---- Render Stats ----
  renderStats() {
    const stats = Utils.computeStats(this.storage);
    document.getElementById('stats-total-done').textContent = stats.total;
    document.getElementById('stats-avg-rate').textContent = stats.rate + '%';
    document.getElementById('stats-bookmarks').textContent = stats.bookmarks;

    const container = document.getElementById('chapter-stats');
    container.innerHTML = '';

    const chapterStats = Utils.computeChapterStats(this.storage, CHAPTERS, QUESTIONS);
    chapterStats.forEach(ch => {
      const item = document.createElement('div');
      item.className = 'chapter-stat-item';
      item.innerHTML = `
        <div class="chapter-stat-header">
          <span class="chapter-stat-title">${ch.title}</span>
          <span class="chapter-stat-rate">${ch.done > 0 ? ch.rate + '%' : '—'}</span>
        </div>
        <div class="chapter-stat-bar">
          <div class="chapter-stat-fill" style="width: ${ch.progress}%"></div>
        </div>
      `;
      container.appendChild(item);
    });
  },

  // ---- Reset Stats ----
  async resetStats() {
    const ok = await Utils.showModal(
      '🗑️ Xóa toàn bộ dữ liệu?',
      'Tất cả lịch sử làm bài, bookmark và thống kê sẽ bị xóa vĩnh viễn. Bạn có chắc?'
    );
    if (ok) {
      this.storage = Utils.getDefaultStorage();
      this.storage.theme = document.documentElement.getAttribute('data-theme') || 'dark';
      Utils.saveStorage(this.storage);
      this.renderStats();
      this.renderHome();
      Utils.showToast('Đã xóa toàn bộ dữ liệu');
    }
  },

  // ---- Keyboard Shortcuts ----
  handleKeyboard(e) {
    if (this.currentScreen !== 'quiz') return;

    const q = this.quizQuestions[this.currentIndex];
    if (!q) return;

    const key = e.key.toUpperCase();
    const options = q.options;
    const validKeys = options.map(o => o.key);

    if (validKeys.includes(key)) {
      e.preventDefault();
      const isAnswered = this.answers[q.id] !== undefined;
      if (!isAnswered || this.quizMode === 'exam') {
        this.selectAnswer(q, key);
      }
    } else if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      this.nextQuestion();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      this.prevQuestion();
    } else if (key === 'B' && e.ctrlKey) {
      e.preventDefault();
      this.toggleBookmark();
    }
  }
};

// ---- Boot ----
document.addEventListener('DOMContentLoaded', () => App.init());
