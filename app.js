// Application State
const state = {
  currentScreen: 'home',
  bookmarks: new Set(),
  solved: new Set(),
  
  // Practice Mode state
  practice: {
    questions: [],
    currentIndex: 0,
    categoryFilter: null
  },
  
  // Test Mode state
  test: {
    questions: [],
    currentIndex: 0,
    answers: [], // Array of booleans: true for correct/know, false for incorrect/don't know
    timer: null,
    timeRemaining: 60,
    maxTime: 60
  },
  
  // Bookmark Mode state
  bookmarkView: {
    questions: [],
    currentIndex: 0
  },
  
  // Search state
  searchQuery: ''
};

// Answer Formatting Helper for structural grid alignment (Smart Table/Grid reconstruction)
function formatAnswerHTML(answerText) {
  if (!answerText) return "";
  
  let escaped = answerText
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
    
  const lines = escaped.split('\n').map(l => l.trim()).filter(l => l);
  let html = "";
  
  let i = 0;
  while (i < lines.length) {
    let line = lines[i];
    
    // 1. Check if this line is a multi-column header (e.g. "[행위별 분류] [대상별 분류]")
    let headers = line.split(/(?=\s\[)/).map(h => h.trim());
    if (headers.length > 1 && headers.every(h => h.startsWith('[') && h.endsWith(']'))) {
      // Gather subsequent lines that are list items starting with markers
      let listItems = [];
      let nextIdx = i + 1;
      
      while (nextIdx < lines.length) {
        let nextLine = lines[nextIdx].trim();
        if (/^[①-⑩‣\-]/.test(nextLine)) {
          listItems.push(nextLine);
          nextIdx++;
        } else {
          break;
        }
      }
      
      if (listItems.length > 0) {
        let numCols = headers.length;
        let colBuckets = Array.from({ length: numCols }, () => []);
        
        // Helper to extract numbers for sorting (e.g., ① -> 1)
        const getNum = (str) => {
          const match = str.match(/^[①-⑩]/);
          if (!match) return 999;
          const char = match[0];
          const nums = {"①":1, "②":2, "③":3, "④":4, "⑤":5, "⑥":6, "⑦":7, "⑧":8, "⑨":9, "⑩":10};
          return nums[char] || 999;
        };
        
        // Detect layout pattern: Alternating vs Sequential
        let isAlternating = false;
        if (listItems.length > 1) {
          let n1 = getNum(listItems[0]);
          let n2 = getNum(listItems[1]);
          if (n1 !== 999 && n1 === n2) {
            isAlternating = true;
          }
        }
        
        if (isAlternating) {
          // Case 1: Alternating pattern (e.g. ① A, ① B, ② A, ② B)
          listItems.forEach((item, idx) => {
            let colIdx = idx % numCols;
            colBuckets[colIdx].push(item);
          });
        } else {
          // Case 2: Sequential pattern (e.g. ① A, ② A, ③ A, ① B, ② B)
          let currentCol = 0;
          let prevNum = -1;
          listItems.forEach(item => {
            let num = getNum(item);
            if (num !== 999 && num < prevNum) {
              currentCol = (currentCol + 1) % numCols;
            }
            colBuckets[currentCol].push(item);
            prevNum = num;
          });
        }
        
        // Render reconstructed multi-column layout
        html += `<div style="display: flex; gap: 20px; margin-top: 12px; margin-bottom: 12px; justify-content: space-between; flex-wrap: wrap;">`;
        for (let c = 0; c < numCols; c++) {
          html += `<div style="flex: 1 1 45%; min-width: 150px;">`;
          html += `<div style="font-weight: 700; color: var(--secondary); margin-bottom: 8px; border-bottom: 1px solid rgba(20, 184, 166, 0.2); padding-bottom: 4px;">${headers[c]}</div>`;
          colBuckets[c].forEach(item => {
            html += `<div style="margin-bottom: 6px; word-break: keep-all;">${item}</div>`;
          });
          html += `</div>`;
        }
        html += `</div>`;
        
        i = nextIdx;
        continue;
      }
    }
    
    // 2. Fallback: Check if inline multi-column items exist
    let parts = line.split(/(?=\s[①-⑩‣\[])/);
    if (parts.length > 1) {
      html += `<div style="display: flex; gap: 20px; margin-bottom: 6px; justify-content: space-between; flex-wrap: wrap;">`;
      parts.forEach(part => {
        html += `<span style="flex: 1 1 45%; min-width: 150px; display: inline-block; word-break: keep-all;">${part.trim()}</span>`;
      });
      html += `</div>`;
    } else {
      if (line.startsWith('[') && line.endsWith(']')) {
        html += `<div style="font-weight: 700; color: var(--secondary); margin-top: 12px; margin-bottom: 8px;">${line}</div>`;
      } else {
        html += `<div style="margin-bottom: 6px; word-break: keep-all;">${line}</div>`;
      }
    }
    
    i++;
  }
  
  return html;
}

// DOM Elements
const elements = {
  screens: document.querySelectorAll('.screen'),
  brand: document.getElementById('nav-brand'),
  btnHome: document.getElementById('btn-nav-home'),
  btnBookmark: document.getElementById('btn-nav-bookmark'),
  btnSearch: document.getElementById('btn-nav-search'),
  
  // Home Screen Elements
  menuQuickTest: document.getElementById('menu-quick-test'),
  menuPractice: document.getElementById('menu-practice'),
  menuNewType: document.getElementById('menu-new-type'),
  menuPastExam: document.getElementById('menu-past-exam'),
  categoryContainer: document.getElementById('category-list-container'),
  
  // Practice Screen Elements
  learnBadgeCategory: document.getElementById('learn-badge-category'),
  learnProgressText: document.getElementById('learn-progress-text'),
  learnCardTrigger: document.getElementById('learn-card-trigger'),
  learnCard: document.getElementById('learn-card'),
  learnFrontCat: document.getElementById('learn-front-cat'),
  learnFrontQ: document.getElementById('learn-front-q'),
  learnBackCat: document.getElementById('learn-back-cat'),
  learnBackA: document.getElementById('learn-back-a'),
  learnBackMylang: document.getElementById('learn-back-mylang'),
  learnBackMylangText: document.getElementById('learn-back-mylang-text'),
  btnLearnPrev: document.getElementById('btn-learn-prev'),
  btnLearnNext: document.getElementById('btn-learn-next'),
  btnLearnBookmark: document.getElementById('btn-learn-bookmark'),
  
  // Test Screen Elements
  testProgressBadge: document.getElementById('test-progress-badge'),
  testTimerText: document.getElementById('test-timer-text'),
  testTimerFill: document.getElementById('test-timer-fill'),
  testCardTrigger: document.getElementById('test-card-trigger'),
  testCard: document.getElementById('test-card'),
  testFrontCat: document.getElementById('test-front-cat'),
  testFrontQ: document.getElementById('test-front-q'),
  testBackCat: document.getElementById('test-back-cat'),
  testBackA: document.getElementById('test-back-a'),
  testBackMylang: document.getElementById('test-back-mylang'),
  testBackMylangText: document.getElementById('test-back-mylang-text'),
  btnTestShowAnswer: document.getElementById('btn-test-show-answer'),
  btnTestBookmark: document.getElementById('btn-test-bookmark'),
  testGradingActions: document.getElementById('test-grading-actions'),
  testBottomControls: document.getElementById('test-bottom-controls'),
  btnTestSuccess: document.getElementById('btn-test-success'),
  btnTestFail: document.getElementById('btn-test-fail'),
  
  // Result Screen Elements
  resultScoreVal: document.getElementById('result-score-val'),
  resultTitleText: document.getElementById('result-title-text'),
  resultStatPass: document.getElementById('result-stat-pass'),
  resultStatFail: document.getElementById('result-stat-fail'),
  btnResultHome: document.getElementById('btn-result-home'),
  btnResultRetry: document.getElementById('btn-result-retry'),
  
  // Bookmark Screen Elements
  bookmarkProgressText: document.getElementById('bookmark-progress-text'),
  bookmarkCardTrigger: document.getElementById('bookmark-card-trigger'),
  bookmarkCard: document.getElementById('bookmark-card'),
  bookmarkFrontCat: document.getElementById('bookmark-front-cat'),
  bookmarkFrontQ: document.getElementById('bookmark-front-q'),
  bookmarkBackCat: document.getElementById('bookmark-back-cat'),
  bookmarkBackA: document.getElementById('bookmark-back-a'),
  bookmarkBackMylang: document.getElementById('bookmark-back-mylang'),
  bookmarkBackMylangText: document.getElementById('bookmark-back-mylang-text'),
  btnBookmarkPrev: document.getElementById('btn-bookmark-prev'),
  btnBookmarkNext: document.getElementById('btn-bookmark-next'),
  btnBookmarkToggle: document.getElementById('btn-bookmark-toggle'),
  
  // Search Screen Elements
  searchInputField: document.getElementById('search-input-field'),
  searchResultsContainer: document.getElementById('search-results-container'),
  
  // Detail Modal Elements
  detailModal: document.getElementById('detail-modal'),
  modalCloseBtn: document.getElementById('modal-close-btn'),
  modalCat: document.getElementById('modal-cat'),
  modalQId: document.getElementById('modal-q-id'),
  modalQText: document.getElementById('modal-q-text'),
  modalAText: document.getElementById('modal-a-text'),
  modalMylang: document.getElementById('modal-mylang'),
  modalMylangText: document.getElementById('modal-mylang-text'),
  btnModalBookmark: document.getElementById('btn-modal-bookmark')
};

// --- INITIALIZATION ---
function init() {
  loadLocalStorage();
  setupEventListeners();
  renderCategoryList();
  updateDashboardProgress();
  navigateTo('home');
}

// Load Bookmarks and Solved Questions from LocalStorage
function loadLocalStorage() {
  const savedBookmarks = localStorage.getItem('zavist_bookmarks');
  if (savedBookmarks) {
    JSON.parse(savedBookmarks).forEach(id => state.bookmarks.add(Number(id)));
  }
  
  const savedSolved = localStorage.getItem('zavist_solved');
  if (savedSolved) {
    JSON.parse(savedSolved).forEach(id => state.solved.add(Number(id)));
  }
}

// Save State to LocalStorage
function saveState() {
  localStorage.setItem('zavist_bookmarks', JSON.stringify([...state.bookmarks]));
  localStorage.setItem('zavist_solved', JSON.stringify([...state.solved]));
  updateDashboardProgress();
}

// Update home screen progress indicators
function updateDashboardProgress() {
  // Progress widget removed from UI at user's request. State logic is synced in localStorage.
}

// Navigate between screens
function navigateTo(screenId) {
  state.currentScreen = screenId;
  
  // Deactivate all screens
  elements.screens.forEach(screen => {
    screen.classList.remove('active');
  });
  
  // Stop test timer if active and navigating away from test
  if (screenId !== 'test') {
    clearInterval(state.test.timer);
    state.test.timer = null;
  }
  
  // Activate target screen
  const targetScreen = document.getElementById(`screen-${screenId}`);
  if (targetScreen) {
    targetScreen.classList.add('active');
  }
  
  // Update Header Button Active States
  elements.btnHome.classList.toggle('active', screenId === 'home');
  elements.btnBookmark.classList.toggle('active', screenId === 'bookmark');
  elements.btnSearch.classList.toggle('active', screenId === 'search');
  
  // Specific screen setups
  if (screenId === 'home') {
    updateDashboardProgress();
  } else if (screenId === 'bookmark') {
    startBookmarkLearning();
  } else if (screenId === 'search') {
    elements.searchInputField.value = '';
    performSearch('');
    elements.searchInputField.focus();
  }
  
  // Scroll to top
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Shuffles an array in place (Fisher-Yates)
function shuffle(array) {
  let currentIndex = array.length, randomIndex;
  while (currentIndex !== 0) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
  return array;
}

// --- CATEGORY RENDERING ---
function renderCategoryList() {
  // Aggregate categories
  const categories = {};
  QUESTIONS.forEach(q => {
    categories[q.category] = (categories[q.category] || 0) + 1;
  });
  
  elements.categoryContainer.innerHTML = '';
  
  Object.keys(categories).sort().forEach(cat => {
    const item = document.createElement('div');
    item.className = 'category-item glass';
    item.innerHTML = `
      <span>${cat}</span>
      <span class="category-count">${categories[cat]}문항</span>
    `;
    item.addEventListener('click', () => {
      startPractice(cat);
    });
    elements.categoryContainer.appendChild(item);
  });
}

// --- PRACTICE MODE (LEARN) ---
function startPractice(category = null) {
  state.practice.categoryFilter = category;
  if (category === "기출정리") {
    state.practice.questions = [...window.PAST_QUESTIONS];
  } else if (category) {
    state.practice.questions = QUESTIONS.filter(q => q.category === category);
  } else {
    // Shuffle the full set for general practice
    state.practice.questions = [...QUESTIONS];
    shuffle(state.practice.questions);
  }
  
  state.practice.currentIndex = 0;
  elements.learnBadgeCategory.textContent = category || '전체 연습';
  
  renderPracticeCard();
  navigateTo('learn');
}

function renderPracticeCard() {
  const currentQ = state.practice.questions[state.practice.currentIndex];
  if (!currentQ) return;
  
  // Mark as solved
  state.solved.add(currentQ.id);
  saveState();
  
  // Reset card flipped state
  elements.learnCard.classList.remove('flipped');
  
  // Populate details
  elements.learnProgressText.textContent = `${state.practice.currentIndex + 1} / ${state.practice.questions.length}`;
  
  elements.learnFrontCat.textContent = currentQ.category;
  elements.learnFrontQ.textContent = currentQ.question;
  
  elements.learnBackCat.textContent = currentQ.category;
  elements.learnBackA.innerHTML = formatAnswerHTML(currentQ.answer);
  
  if (currentQ.my_lang && currentQ.my_lang.trim()) {
    elements.learnBackMylang.style.display = 'block';
    elements.learnBackMylangText.textContent = currentQ.my_lang;
  } else {
    elements.learnBackMylang.style.display = 'none';
  }
  
  // Sync bookmark button state
  updateLearnBookmarkBtn(currentQ.id);
}

function updateLearnBookmarkBtn(id) {
  const isBookmarked = state.bookmarks.has(id);
  elements.btnLearnBookmark.classList.toggle('bookmarked', isBookmarked);
  if (isBookmarked) {
    elements.btnLearnBookmark.innerHTML = '<i class="fa-solid fa-star"></i> 북마크 해제';
  } else {
    elements.btnLearnBookmark.innerHTML = '<i class="fa-regular fa-star"></i> 북마크 저장';
  }
}

// --- TEST MODE ---
function startMockTest() {
  // Take 10 random questions
  const shuffled = [...QUESTIONS];
  shuffle(shuffled);
  state.test.questions = shuffled.slice(0, 10);
  state.test.currentIndex = 0;
  state.test.answers = [];
  
  renderTestCard();
  navigateTo('test');
}

function renderTestCard() {
  const currentQ = state.test.questions[state.test.currentIndex];
  if (!currentQ) return;
  
  // Mark as solved
  state.solved.add(currentQ.id);
  saveState();
  
  // Reset UI
  elements.testCard.classList.remove('flipped');
  elements.testGradingActions.style.visibility = 'hidden';
  elements.testBottomControls.style.display = 'grid';
  
  elements.testProgressBadge.textContent = `MOCK TEST ${state.test.currentIndex + 1} / 10`;
  
  // Set Text
  elements.testFrontCat.textContent = currentQ.category;
  elements.testFrontQ.textContent = currentQ.question;
  elements.testBackCat.textContent = currentQ.category;
  elements.testBackA.innerHTML = formatAnswerHTML(currentQ.answer);
  
  if (currentQ.my_lang && currentQ.my_lang.trim()) {
    elements.testBackMylang.style.display = 'block';
    elements.testBackMylangText.textContent = currentQ.my_lang;
  } else {
    elements.testBackMylang.style.display = 'none';
  }
  
  // Bookmark sync
  const isBookmarked = state.bookmarks.has(currentQ.id);
  elements.btnTestBookmark.classList.toggle('bookmarked', isBookmarked);
  elements.btnTestBookmark.innerHTML = isBookmarked ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
  
  // Timer restart
  startTestTimer();
}

function startTestTimer() {
  clearInterval(state.test.timer);
  state.test.timeRemaining = state.test.maxTime;
  updateTimerUI();
  
  state.test.timer = setInterval(() => {
    state.test.timeRemaining--;
    updateTimerUI();
    
    if (state.test.timeRemaining <= 0) {
      clearInterval(state.test.timer);
      handleTimeOut();
    }
  }, 1000);
}

function updateTimerUI() {
  elements.testTimerText.textContent = `${state.test.timeRemaining}초`;
  const fillPercentage = (state.test.timeRemaining / state.test.maxTime) * 100;
  elements.testTimerFill.style.width = `${fillPercentage}%`;
}

function handleTimeOut() {
  // Flips card automatically when time is out
  flipTestCard(true);
}

function flipTestCard(showAnswer = true) {
  if (showAnswer) {
    elements.testCard.classList.add('flipped');
    // Stop timer
    clearInterval(state.test.timer);
    // Switch controls
    elements.testBottomControls.style.display = 'none';
    elements.testGradingActions.style.visibility = 'visible';
  } else {
    elements.testCard.classList.remove('flipped');
  }
}

function submitGrade(known) {
  state.test.answers.push(known);
  
  // Automatically add to bookmark if user marked as "fail/don't know"
  const currentQ = state.test.questions[state.test.currentIndex];
  if (!known) {
    state.bookmarks.add(currentQ.id);
    saveState();
  }
  
  state.test.currentIndex++;
  if (state.test.currentIndex < state.test.questions.length) {
    renderTestCard();
  } else {
    showTestResults();
  }
}

function showTestResults() {
  const correctCount = state.test.answers.filter(val => val === true).length;
  const totalCount = state.test.questions.length;
  const score = Math.round((correctCount / totalCount) * 100);
  
  elements.resultScoreVal.textContent = `${score}점`;
  elements.resultStatPass.textContent = correctCount;
  elements.resultStatFail.textContent = totalCount - correctCount;
  
  // Custom title based on score
  if (score >= 90) {
    elements.resultTitleText.textContent = "완벽한 합격 라인입니다! 🏆";
  } else if (score >= 70) {
    elements.resultTitleText.textContent = "안정적인 합격권입니다! 🎉";
  } else if (score >= 50) {
    elements.resultTitleText.textContent = "조금 더 연습이 필요해요! 💪";
  } else {
    elements.resultTitleText.textContent = "기초부터 꼼꼼히 학습해볼까요? 🔥";
  }
  
  navigateTo('result');
}

// --- BOOKMARK VIEW MODE ---
function startBookmarkLearning() {
  const bookmarkIds = [...state.bookmarks];
  state.bookmarkView.questions = QUESTIONS.filter(q => bookmarkIds.includes(q.id));
  state.bookmarkView.currentIndex = 0;
  
  renderBookmarkCard();
}

function renderBookmarkCard() {
  const questionsCount = state.bookmarkView.questions.length;
  
  if (questionsCount === 0) {
    elements.bookmarkProgressText.textContent = '0 / 0';
    elements.bookmarkCardTrigger.innerHTML = `
      <div class="empty-state glass w-100 flex-row-center" style="flex-direction: column; justify-content: center; height: 320px;">
        <i class="fa-solid fa-star-half-stroke" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 12px;"></i>
        <p>북마크한 문항이 없습니다.</p>
        <p style="font-size: 0.8rem; margin-top: 4px;">공부 중 헷갈리는 문항에 별표를 눌러 추가해보세요!</p>
      </div>
    `;
    elements.btnBookmarkPrev.disabled = true;
    elements.btnBookmarkNext.disabled = true;
    elements.btnBookmarkToggle.style.display = 'none';
    return;
  }
  
  // Restore original layout if questions present
  elements.bookmarkCardTrigger.innerHTML = `
    <div class="flashcard glass" id="bookmark-card">
      <div class="card-face card-front">
        <div class="card-cat" id="bookmark-front-cat">CATEGORY</div>
        <div class="card-q-text" id="bookmark-front-q">질문</div>
        <div class="card-hint-tap">
          <i class="fa-solid fa-hand-pointer"></i> 터치하여 답안 보기
        </div>
      </div>
      <div class="card-face card-back">
        <div class="card-cat" id="bookmark-back-cat">CATEGORY</div>
        <div style="font-size: 0.9rem; font-weight: 700; color: var(--secondary); margin-bottom: 8px;">[정답 확인]</div>
        <div class="card-a-text" id="bookmark-back-a">정답</div>
        <div class="my-lang-box" id="bookmark-back-mylang" style="display: none;">
          <strong>나의 언어:</strong> <span id="bookmark-back-mylang-text"></span>
        </div>
        <div class="card-hint-tap" style="justify-content: center;">
          <i class="fa-solid fa-rotate-left"></i> 터치하여 질문으로 돌아가기
        </div>
      </div>
    </div>
  `;
  
  // Re-fetch DOM elements created dynamically
  elements.bookmarkCard = document.getElementById('bookmark-card');
  elements.bookmarkFrontCat = document.getElementById('bookmark-front-cat');
  elements.bookmarkFrontQ = document.getElementById('bookmark-front-q');
  elements.bookmarkBackCat = document.getElementById('bookmark-back-cat');
  elements.bookmarkBackA = document.getElementById('bookmark-back-a');
  elements.bookmarkBackMylang = document.getElementById('bookmark-back-mylang');
  elements.bookmarkBackMylangText = document.getElementById('bookmark-back-mylang-text');
  
  // Rebind click to dynamically created card
  elements.bookmarkCard.addEventListener('click', () => {
    elements.bookmarkCard.classList.toggle('flipped');
  });

  const currentQ = state.bookmarkView.questions[state.bookmarkView.currentIndex];
  
  elements.bookmarkProgressText.textContent = `${state.bookmarkView.currentIndex + 1} / ${questionsCount}`;
  elements.btnBookmarkPrev.disabled = false;
  elements.btnBookmarkNext.disabled = false;
  elements.btnBookmarkToggle.style.display = 'flex';
  
  elements.bookmarkFrontCat.textContent = currentQ.category;
  elements.bookmarkFrontQ.textContent = currentQ.question;
  elements.bookmarkBackCat.textContent = currentQ.category;
  elements.bookmarkBackA.innerHTML = formatAnswerHTML(currentQ.answer);
  
  if (currentQ.my_lang && currentQ.my_lang.trim()) {
    elements.bookmarkBackMylang.style.display = 'block';
    elements.bookmarkBackMylangText.textContent = currentQ.my_lang;
  } else {
    elements.bookmarkBackMylang.style.display = 'none';
  }
}

function toggleBookmarkOnView() {
  const currentQ = state.bookmarkView.questions[state.bookmarkView.currentIndex];
  if (!currentQ) return;
  
  if (state.bookmarks.has(currentQ.id)) {
    state.bookmarks.delete(currentQ.id);
  } else {
    state.bookmarks.add(currentQ.id);
  }
  
  saveState();
  
  // Reload bookmark view list but keep same position if possible
  const oldIndex = state.bookmarkView.currentIndex;
  const bookmarkIds = [...state.bookmarks];
  state.bookmarkView.questions = QUESTIONS.filter(q => bookmarkIds.includes(q.id));
  
  // Adjust current index
  if (state.bookmarkView.questions.length === 0) {
    state.bookmarkView.currentIndex = 0;
  } else if (oldIndex >= state.bookmarkView.questions.length) {
    state.bookmarkView.currentIndex = state.bookmarkView.questions.length - 1;
  }
  
  renderBookmarkCard();
}

// --- KNOWLEDGE BASE / SEARCH MODE ---
function performSearch(query) {
  state.searchQuery = query.toLowerCase().trim();
  
  elements.searchResultsContainer.innerHTML = '';
  
  const filtered = QUESTIONS.filter(q => {
    return q.question.toLowerCase().includes(state.searchQuery) ||
           q.answer.toLowerCase().includes(state.searchQuery) ||
           q.category.toLowerCase().includes(state.searchQuery) ||
           (q.my_lang && q.my_lang.toLowerCase().includes(state.searchQuery));
  });
  
  if (filtered.length === 0) {
    elements.searchResultsContainer.innerHTML = `
      <div class="empty-state glass">
        <i class="fa-solid fa-folder-open" style="font-size: 2.5rem; color: var(--text-muted); margin-bottom: 10px;"></i>
        <p>검색 결과가 없습니다.</p>
      </div>
    `;
    return;
  }
  
  filtered.forEach(q => {
    const item = document.createElement('div');
    item.className = 'search-item glass';
    
    const isBookmarked = state.bookmarks.has(q.id);
    
    item.innerHTML = `
      <div class="search-item-header">
        <span class="search-item-cat">${q.category}</span>
        <i class="fa-solid fa-star bookmark-star ${isBookmarked ? 'bookmarked' : ''}" data-id="${q.id}"></i>
      </div>
      <div class="search-item-q">#${q.id} ${q.question}</div>
      <div class="search-item-a">${q.answer}</div>
    `;
    
    // Clicking the item opens detail modal
    item.addEventListener('click', (e) => {
      // If clicked the bookmark star, handle bookmark instead
      if (e.target.classList.contains('bookmark-star')) {
        e.stopPropagation();
        const qId = Number(e.target.dataset.id);
        toggleBookmark(qId);
        e.target.classList.toggle('bookmarked');
        return;
      }
      openDetailModal(q);
    });
    
    elements.searchResultsContainer.appendChild(item);
  });
}

function toggleBookmark(id) {
  if (state.bookmarks.has(id)) {
    state.bookmarks.delete(id);
  } else {
    state.bookmarks.add(id);
  }
  saveState();
}

// --- MODAL UTILITIES ---
function openDetailModal(q) {
  elements.modalCat.textContent = q.category;
  elements.modalQId.textContent = `질문 #${q.id}`;
  elements.modalQText.textContent = q.question;
  elements.modalAText.innerHTML = formatAnswerHTML(q.answer);
  
  if (q.my_lang && q.my_lang.trim()) {
    elements.modalMylang.style.display = 'block';
    elements.modalMylangText.textContent = q.my_lang;
  } else {
    elements.modalMylang.style.display = 'none';
  }
  
  // Set bookmark btn on modal
  syncModalBookmarkBtn(q.id);
  
  // Store reference to current modal question id
  elements.btnModalBookmark.dataset.id = q.id;
  
  elements.detailModal.classList.add('active');
}

function syncModalBookmarkBtn(id) {
  const isBookmarked = state.bookmarks.has(id);
  elements.btnModalBookmark.classList.toggle('bookmarked', isBookmarked);
  elements.btnModalBookmark.innerHTML = isBookmarked ? '<i class="fa-solid fa-star"></i> 북마크 해제' : '<i class="fa-regular fa-star"></i> 북마크 저장';
}

function closeDetailModal() {
  elements.detailModal.classList.remove('active');
  // If we are on search or bookmark page, refreshing list is a good UX
  if (state.currentScreen === 'search') {
    performSearch(elements.searchInputField.value);
  } else if (state.currentScreen === 'bookmark') {
    startBookmarkLearning();
  }
}

// --- EVENT LISTENERS ---
function setupEventListeners() {
  // Navigation
  elements.brand.addEventListener('click', () => navigateTo('home'));
  elements.btnHome.addEventListener('click', () => navigateTo('home'));
  elements.btnBookmark.addEventListener('click', () => navigateTo('bookmark'));
  elements.btnSearch.addEventListener('click', () => navigateTo('search'));
  
  // Home Menu buttons
  elements.menuPractice.addEventListener('click', () => startPractice());
  elements.menuQuickTest.addEventListener('click', startMockTest);
  elements.menuNewType.addEventListener('click', () => {
    startPractice("신유형[2026 스포츠지도사 신유형]");
  });
  elements.menuPastExam.addEventListener('click', () => {
    startPractice("기출정리");
  });
  
  // Practice Cards
  elements.learnCardTrigger.addEventListener('click', () => {
    elements.learnCard.classList.toggle('flipped');
  });
  
  elements.btnLearnPrev.addEventListener('click', () => {
    if (state.practice.currentIndex > 0) {
      state.practice.currentIndex--;
      renderPracticeCard();
    }
  });
  
  elements.btnLearnNext.addEventListener('click', () => {
    if (state.practice.currentIndex < state.practice.questions.length - 1) {
      state.practice.currentIndex++;
      renderPracticeCard();
    }
  });
  
  elements.btnLearnBookmark.addEventListener('click', () => {
    const currentQ = state.practice.questions[state.practice.currentIndex];
    if (currentQ) {
      toggleBookmark(currentQ.id);
      updateLearnBookmarkBtn(currentQ.id);
    }
  });
  
  // Test Screen actions
  elements.btnTestShowAnswer.addEventListener('click', () => flipTestCard(true));
  elements.testCardTrigger.addEventListener('click', () => {
    // Only flip when showing answer is not yet done via button
    if (!elements.testCard.classList.contains('flipped')) {
      flipTestCard(true);
    }
  });
  
  elements.btnTestSuccess.addEventListener('click', () => submitGrade(true));
  elements.btnTestFail.addEventListener('click', () => submitGrade(false));
  elements.btnTestBookmark.addEventListener('click', () => {
    const currentQ = state.test.questions[state.test.currentIndex];
    if (currentQ) {
      toggleBookmark(currentQ.id);
      const isBookmarked = state.bookmarks.has(currentQ.id);
      elements.btnTestBookmark.classList.toggle('bookmarked', isBookmarked);
      elements.btnTestBookmark.innerHTML = isBookmarked ? '<i class="fa-solid fa-star"></i>' : '<i class="fa-regular fa-star"></i>';
    }
  });
  
  // Result screen actions
  elements.btnResultHome.addEventListener('click', () => navigateTo('home'));
  elements.btnResultRetry.addEventListener('click', startMockTest);
  
  // Bookmark Screen actions
  elements.btnBookmarkPrev.addEventListener('click', () => {
    if (state.bookmarkView.currentIndex > 0) {
      state.bookmarkView.currentIndex--;
      renderBookmarkCard();
    }
  });
  
  elements.btnBookmarkNext.addEventListener('click', () => {
    if (state.bookmarkView.currentIndex < state.bookmarkView.questions.length - 1) {
      state.bookmarkView.currentIndex++;
      renderBookmarkCard();
    }
  });
  
  elements.btnBookmarkToggle.addEventListener('click', toggleBookmarkOnView);
  
  // Search actions
  elements.searchInputField.addEventListener('input', (e) => {
    performSearch(e.target.value);
  });
  
  // Modal actions
  elements.modalCloseBtn.addEventListener('click', closeDetailModal);
  elements.detailModal.addEventListener('click', (e) => {
    if (e.target === elements.detailModal) {
      closeDetailModal();
    }
  });
  
  elements.btnModalBookmark.addEventListener('click', () => {
    const qId = Number(elements.btnModalBookmark.dataset.id);
    if (qId) {
      toggleBookmark(qId);
      syncModalBookmarkBtn(qId);
    }
  });
}

// Run the App
window.addEventListener('DOMContentLoaded', init);
