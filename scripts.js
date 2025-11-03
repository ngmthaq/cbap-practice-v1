// ============================================================================
// STATE MANAGEMENT
// ============================================================================
const QuizState = {
  allQuestions: [],
  quizQuestions: [],
  currentQuestionIndex: 0,
  userAnswers: [],
  correctAnswers: 0,
  wrongAnswers: 0,
  answered: false,
  attachments: [],
  skippedQuestions: [],

  reset() {
    this.currentQuestionIndex = 0;
    this.userAnswers = [];
    this.correctAnswers = 0;
    this.wrongAnswers = 0;
    this.skippedQuestions = [];
  },

  isQuestionAnswered(index = this.currentQuestionIndex) {
    return this.userAnswers[index] !== undefined;
  },

  getCurrentQuestion() {
    return this.quizQuestions[this.currentQuestionIndex];
  },

  getTotalQuestions() {
    return this.quizQuestions.length;
  },

  isLastQuestion() {
    return this.currentQuestionIndex >= this.getTotalQuestions();
  },
};

// ============================================================================
// CONSTANTS
// ============================================================================
const SELECTORS = {
  modeSelection: '#modeSelection',
  quizContainer: '#quizContainer',
  resultsContainer: '#resultsContainer',
  randomOptions: '#randomOptions',
  searchInput: '#searchInput',
  questionIndex: '#questionIndex',
  questionText: '#questionText',
  currentQuestion: '#currentQuestion',
  totalQuestions: '#totalQuestions',
  correctCount: '#correctCount',
  wrongCount: '#wrongCount',
  progressBar: '#progressBar',
  optionsContainer: '#optionsContainer',
  feedbackMessage: '#feedbackMessage',
  attachmentButtonContainer: '#attachmentButtonContainer',
  prevBtn: '#prevBtn',
  skipBtn: '#skipBtn',
  skippedSection: '#skippedSection',
  skippedCount: '#skippedCount',
  skippedList: '#skippedList',
  jumpToInput: '#jumpToInput',
  finalCorrect: '#finalCorrect',
  finalWrong: '#finalWrong',
  finalTotal: '#finalTotal',
  finalPercentage: '#finalPercentage',
  attachmentQuestionNumber: '#attachmentQuestionNumber',
  questionAttachmentImage: '#questionAttachmentImage',
};

const MESSAGES = {
  questionsLoading: 'Questions are still loading. Please wait a moment.',
  enterSearchTerm: 'Please enter a search term',
  noQuestionsFound: (term) => `No questions found matching: ${term}`,
  confirmEndQuiz: 'Are you sure you want to end the quiz?',
  confirmSkip: "You haven't answered this question yet. Do you want to skip it?",
  enterValidNumber: 'Please enter a valid question number',
  enterNumberInRange: (max) => `Please enter a number between 1 and ${max}`,
  noAttachment: 'No attachment found for this question.',
  noAttachmentsAvailable:
    'No attachments available. Please make sure attachments.json file exists.',
  errorLoadingQuestions: 'Error loading questions. Please make sure qna.json file exists.',
};

const ANSWER_OPTIONS = ['A', 'B', 'C', 'D'];

// ============================================================================
// DATA LOADING
// ============================================================================
const DataLoader = {
  loadQuestions() {
    return $.getJSON('qna.json')
      .done((data) => {
        QuizState.allQuestions = data;
        console.log(`Loaded ${data.length} questions`);
      })
      .fail(() => alert(MESSAGES.errorLoadingQuestions));
  },

  loadAttachments() {
    return $.getJSON('attachments.json')
      .done((data) => {
        QuizState.attachments = data;
        console.log(`Loaded ${data.length} attachments`);
      })
      .fail(() => console.log('No attachments.json file found or error loading it.'));
  },
};

// ============================================================================
// UI HELPERS
// ============================================================================
const UI = {
  show(selector) {
    $(selector).show();
  },

  hide(selector) {
    $(selector).hide();
  },

  setText(selector, text) {
    $(selector).text(text);
  },

  setHtml(selector, html) {
    $(selector).html(html);
  },

  getValue(selector) {
    return $(selector).val();
  },

  setValue(selector, value) {
    $(selector).val(value);
  },

  disable(selector, disabled = true) {
    $(selector).prop('disabled', disabled);
  },

  toggleSlide(selector) {
    $(selector).slideToggle();
  },

  setProgress(percentage) {
    $(SELECTORS.progressBar).css('width', `${percentage}%`);
  },

  showModal(modalId) {
    const modal = new bootstrap.Modal(document.getElementById(modalId));
    modal.show();
  },
};

// ============================================================================
// QUIZ LOGIC
// ============================================================================
const Quiz = {
  start(mode, count = null) {
    if (QuizState.allQuestions.length === 0) {
      alert(MESSAGES.questionsLoading);
      return;
    }

    this.prepareQuestions(mode, count);
    QuizState.reset();

    UI.hide(SELECTORS.modeSelection);
    UI.show(SELECTORS.quizContainer);
    UI.setText(SELECTORS.totalQuestions, QuizState.getTotalQuestions());

    Display.question();
  },

  prepareQuestions(mode, count) {
    switch (mode) {
      case 'all':
        QuizState.quizQuestions = [...QuizState.allQuestions];
        break;
      case 'random':
        QuizState.quizQuestions = Utils.shuffleArray([...QuizState.allQuestions]).slice(0, count);
        break;
      case 'search':
        // Questions already set in search function
        break;
    }
  },

  search() {
    const searchTerm = UI.getValue(SELECTORS.searchInput).trim().toLowerCase();

    if (!searchTerm) {
      alert(MESSAGES.enterSearchTerm);
      return;
    }

    QuizState.quizQuestions = QuizState.allQuestions.filter((q) =>
      [q.quesText, q.a, q.b, q.c, q.d].some((field) => field.toLowerCase().includes(searchTerm)),
    );

    if (QuizState.quizQuestions.length === 0) {
      alert(MESSAGES.noQuestionsFound(searchTerm));
      return;
    }

    this.start('search');
  },

  selectAnswer(answer) {
    if (QuizState.answered) return;

    const question = QuizState.getCurrentQuestion();
    QuizState.userAnswers[QuizState.currentQuestionIndex] = answer;
    QuizState.answered = true;

    const isCorrect = answer === question.trueAns;
    isCorrect ? QuizState.correctAnswers++ : QuizState.wrongAnswers++;

    Display.answerFeedback(answer);
    Display.score();
  },

  end() {
    if (confirm(MESSAGES.confirmEndQuiz)) {
      Display.results();
    }
  },

  restart() {
    UI.hide(SELECTORS.resultsContainer);
    UI.show(SELECTORS.modeSelection);
    UI.setValue(SELECTORS.searchInput, '');
    UI.hide(SELECTORS.randomOptions);
    QuizState.skippedQuestions = [];
    UI.hide(SELECTORS.skippedSection);
  },
};

// ============================================================================
// NAVIGATION
// ============================================================================
const Navigation = {
  next() {
    if (!QuizState.answered) {
      if (confirm(MESSAGES.confirmSkip)) {
        this.skip();
      }
      return;
    }

    QuizState.currentQuestionIndex++;
    QuizState.answered = false;
    Display.question();
  },

  previous() {
    if (QuizState.currentQuestionIndex > 0) {
      QuizState.currentQuestionIndex--;
      QuizState.answered = false;
      Display.question();
    }
  },

  skip() {
    if (
      !QuizState.skippedQuestions.includes(QuizState.currentQuestionIndex) &&
      !QuizState.answered
    ) {
      QuizState.skippedQuestions.push(QuizState.currentQuestionIndex);
    }

    QuizState.currentQuestionIndex++;
    QuizState.answered = false;
    Display.question();
  },

  goTo(index) {
    QuizState.currentQuestionIndex = index;
    QuizState.answered = false;
    Display.question();
  },

  jumpTo() {
    const jumpValue = parseInt(UI.getValue(SELECTORS.jumpToInput));

    if (!jumpValue || isNaN(jumpValue)) {
      alert(MESSAGES.enterValidNumber);
      return;
    }

    const maxQuestions = QuizState.getTotalQuestions();
    if (jumpValue < 1 || jumpValue > maxQuestions) {
      alert(MESSAGES.enterNumberInRange(maxQuestions));
      return;
    }

    this.goTo(jumpValue - 1);
    UI.setValue(SELECTORS.jumpToInput, '');
  },
};

// ============================================================================
// DISPLAY FUNCTIONS
// ============================================================================
const Display = {
  question() {
    if (QuizState.isLastQuestion()) {
      this.results();
      return;
    }

    const question = QuizState.getCurrentQuestion();
    QuizState.answered = QuizState.isQuestionAnswered();

    UI.setText(SELECTORS.questionIndex, question.quesIndex);
    UI.setText(SELECTORS.questionText, question.quesText);
    UI.setText(SELECTORS.currentQuestion, QuizState.currentQuestionIndex + 1);

    this.attachment(question);
    this.progress();
    this.options(question);
    this.previousAnswer();
    this.navigationButtons();
    this.score();
    this.skippedList();
  },

  attachment(question) {
    const hasAttachment = QuizState.attachments.some(
      (att) => att.quesIndex === question.quesIndex,
    );
    hasAttachment
      ? UI.show(SELECTORS.attachmentButtonContainer)
      : UI.hide(SELECTORS.attachmentButtonContainer);
  },

  progress() {
    const progress =
      ((QuizState.currentQuestionIndex + 1) / QuizState.getTotalQuestions()) * 100;
    UI.setProgress(progress);
  },

  options(question) {
    const optionsHtml = ANSWER_OPTIONS.map(
      (option) =>
        `<button class="btn option-btn" onclick="Quiz.selectAnswer('${option}')" data-answer="${option}">${question[option.toLowerCase()]}</button>`,
    ).join('');
    UI.setHtml(SELECTORS.optionsContainer, optionsHtml);
  },

  previousAnswer() {
    if (QuizState.answered) {
      this.answerFeedback(QuizState.userAnswers[QuizState.currentQuestionIndex]);
    } else {
      UI.hide(SELECTORS.feedbackMessage);
    }
  },

  navigationButtons() {
    UI.disable(SELECTORS.prevBtn, QuizState.currentQuestionIndex === 0);
    UI.disable(SELECTORS.skipBtn, QuizState.answered);
  },

  answerFeedback(selectedAnswer) {
    const question = QuizState.getCurrentQuestion();
    const isCorrect = selectedAnswer === question.trueAns;

    $('.option-btn').each(function () {
      const btnAnswer = $(this).data('answer');
      $(this).prop('disabled', true);

      if (btnAnswer === selectedAnswer) {
        $(this).addClass(isCorrect ? 'correct' : 'incorrect');
      }

      if (btnAnswer === question.trueAns) {
        $(this).addClass('correct');
      }
    });

    const feedbackMsg = isCorrect
      ? '<i class="bi bi-check-circle"></i> Correct! Well done.'
      : '<i class="bi bi-x-circle"></i> Incorrect. The correct answer is highlighted in green.';

    $(SELECTORS.feedbackMessage)
      .removeClass('alert-success alert-danger')
      .addClass(isCorrect ? 'alert-success' : 'alert-danger')
      .html(feedbackMsg)
      .slideDown();

    this.skippedList();
  },

  score() {
    UI.setText(SELECTORS.correctCount, QuizState.correctAnswers);
    UI.setText(SELECTORS.wrongCount, QuizState.wrongAnswers);
  },

  skippedList() {
    QuizState.skippedQuestions = QuizState.skippedQuestions.filter(
      (idx) => !QuizState.isQuestionAnswered(idx),
    );

    if (QuizState.skippedQuestions.length > 0) {
      UI.show(SELECTORS.skippedSection);
      UI.setText(SELECTORS.skippedCount, QuizState.skippedQuestions.length);

      const skippedHtml = QuizState.skippedQuestions
        .map((idx) => {
          const question = QuizState.quizQuestions[idx];
          const badgeClass = QuizState.isQuestionAnswered(idx) ? 'answered' : 'bg-warning';
          return `<span class="badge ${badgeClass} skipped-badge" onclick="Navigation.goTo(${idx})" title="Click to go to this question">${question.quesIndex}</span>`;
        })
        .join('');

      UI.setHtml(SELECTORS.skippedList, skippedHtml);
    } else {
      UI.hide(SELECTORS.skippedSection);
    }
  },

  results() {
    UI.hide(SELECTORS.quizContainer);
    UI.show(SELECTORS.resultsContainer);

    const total = QuizState.getTotalQuestions();
    const percentage = total > 0 ? Math.round((QuizState.correctAnswers / total) * 100) : 0;

    UI.setText(SELECTORS.finalCorrect, QuizState.correctAnswers);
    UI.setText(SELECTORS.finalWrong, QuizState.wrongAnswers);
    UI.setText(SELECTORS.finalTotal, total);
    UI.setText(SELECTORS.finalPercentage, `${percentage}%`);
  },
};

// ============================================================================
// ATTACHMENTS
// ============================================================================
const Attachments = {
  showQuestion() {
    const question = QuizState.getCurrentQuestion();
    const attachment = QuizState.attachments.find((att) => att.quesIndex === question.quesIndex);

    if (!attachment) {
      alert(MESSAGES.noAttachment);
      return;
    }

    UI.setText(SELECTORS.attachmentQuestionNumber, question.quesIndex);
    $(SELECTORS.questionAttachmentImage).attr('src', attachment.img);
    UI.showModal('questionAttachmentModal');
  },

  showMap() {
    if (QuizState.attachments.length === 0) {
      alert(MESSAGES.noAttachmentsAvailable);
      return;
    }

    this.displayList(QuizState.attachments);
    UI.showModal('attachmentModal');

    $('#attachmentSearch')
      .off('input')
      .on('input', function () {
        const searchTerm = $(this).val().trim().toLowerCase();
        const filtered = searchTerm
          ? QuizState.attachments.filter((att) => att.quesIndex.toLowerCase().includes(searchTerm))
          : QuizState.attachments;
        Attachments.displayList(filtered);
      });
  },

  displayList(attachmentList) {
    const container = $('#attachmentList');
    container.empty();

    if (attachmentList.length === 0) {
      container.html(
        '<div class="col-12 text-center"><p class="text-muted">No attachments found.</p></div>',
      );
      return;
    }

    attachmentList.forEach((att) => {
      const card = `
        <div class="col-md-6 col-lg-4">
          <div class="card h-100">
            <div class="card-header bg-primary text-white">
              <strong>${att.quesIndex}</strong>
            </div>
            <div class="card-body text-center p-2">
              <img src="${att.img}" class="img-fluid" alt="${att.quesIndex}" style="max-height: 300px; object-fit: contain;" />
            </div>
          </div>
        </div>
      `;
      container.append(card);
    });
  },
};

// ============================================================================
// UTILITIES
// ============================================================================
const Utils = {
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },
};

// ============================================================================
// LEGACY FUNCTION ALIASES (for HTML onclick handlers)
// ============================================================================
function startQuiz(mode, count) {
  Quiz.start(mode, count);
}
function searchQuestions() {
  Quiz.search();
}
function selectAnswer(answer) {
  Quiz.selectAnswer(answer);
}
function nextQuestion() {
  Navigation.next();
}
function previousQuestion() {
  Navigation.previous();
}
function skipQuestion() {
  Navigation.skip();
}
function goToQuestion(index) {
  Navigation.goTo(index);
}
function jumpToQuestion() {
  Navigation.jumpTo();
}
function endQuiz() {
  Quiz.end();
}
function restartQuiz() {
  Quiz.restart();
}
function showRandomOptions() {
  UI.toggleSlide(SELECTORS.randomOptions);
}
function showQuestionAttachment() {
  Attachments.showQuestion();
}
function showAttachmentMap() {
  Attachments.showMap();
}

// ============================================================================
// INITIALIZATION
// ============================================================================
$(document).ready(function () {
  DataLoader.loadQuestions();
  DataLoader.loadAttachments();

  // Event listeners
  $(document).on('keypress', SELECTORS.jumpToInput, function (e) {
    if (e.which === 13) {
      Navigation.jumpTo();
    }
  });
});
