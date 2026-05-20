/**
 * ══════════════════════════════════════════════════
 *  CALCPRO — Scientific Calculator  |  script.js
 * ══════════════════════════════════════════════════
 *
 *  Features:
 *   • Basic arithmetic  +  −  ×  ÷
 *   • Scientific functions: sin cos tan (and inverses),
 *     sqrt, cbrt, log, ln, exp, x², x³, xʸ, 10ˣ,
 *     1/x, |x|, n!, %, log₂, π, e, ʸ√x
 *   • DEG / RAD toggle
 *   • Parentheses ( )
 *   • Real-time expression preview
 *   • Keyboard support (full)
 *   • Error handling
 *   • Smooth button press animations
 * ══════════════════════════════════════════════════
 */

/* ───────────────────────────────────
   STATE
─────────────────────────────────── */
const state = {
  expression: '',      // what the user has typed so far
  justEvaled: false,   // did we just press = ?
  isDeg: true,         // angle mode: degrees (true) or radians
  sciMode: false,      // scientific panel visible?
  pendingOp: null,     // for functions that need a second operand (xʸ, ʸ√x)
  pendingVal: null,
};

/* ───────────────────────────────────
   DOM REFS
─────────────────────────────────── */
const elExpression  = document.getElementById('expression');
const elResult      = document.getElementById('result');
const elChipDeg     = document.getElementById('chipDeg');
const elChipRad     = document.getElementById('chipRad');
const elChipSci     = document.getElementById('chipSci');
const elSciPanel    = document.getElementById('sciPanel');
const elModeToggle  = document.getElementById('modeToggle');
const elDegRadBtn   = document.getElementById('degRadToggle');

/* ───────────────────────────────────
   HELPERS
─────────────────────────────────── */

/** Convert degrees → radians if needed */
function toRad(v) {
  return state.isDeg ? (v * Math.PI) / 180 : v;
}

/** Convert radians → degrees (for inverse trig display) */
function toDeg(v) {
  return state.isDeg ? (v * 180) / Math.PI : v;
}

/** Factorial (integers only; returns NaN for negatives / non-ints) */
function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n === 0 || n === 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

/** Smart number formatter — avoids crazy long decimals */
function fmt(num) {
  if (typeof num !== 'number' || isNaN(num)) return 'Error';
  if (!isFinite(num)) return num > 0 ? '∞' : '-∞';
  
  // Use toPrecision to avoid floating-point noise, then strip trailing zeros
  const s = parseFloat(num.toPrecision(12)).toString();
  return s;
}

/** Safely evaluate an arithmetic expression string.
 *  We only allow digits, operators, dots, parentheses,
 *  and the letter E (scientific notation). */
function safeEval(expr) {
  // Replace display operators with JS operators
  const clean = expr
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/π/g, `(${Math.PI})`)
    .replace(/e(?!\d)/g, `(${Math.E})`);   // lone 'e' → Euler's number

  // Whitelist check — only allow safe characters
  if (/[^0-9+\-*/().eE%\s]/.test(clean)) throw new Error('Invalid');

  // eslint-disable-next-line no-new-func
  const val = Function('"use strict"; return (' + clean + ')')();
  return val;
}

/* ───────────────────────────────────
   DISPLAY UPDATE
─────────────────────────────────── */
function updateDisplay() {
  // Expression line
  elExpression.textContent = state.expression || '0';

  // Live preview in result line while typing
  if (state.expression && !state.justEvaled) {
    try {
      const val = safeEval(state.expression);
      if (val !== undefined && val !== null && isFinite(val)) {
        elResult.textContent = fmt(val);
        elResult.className = 'result';
      } else {
        elResult.textContent = '';
      }
    } catch {
      elResult.textContent = '';
    }
  }
}

/** Flash the result with a pop animation */
function showFinalResult(val) {
  elExpression.textContent = state.expression;
  elResult.textContent = fmt(val);
  elResult.className = 'result has-val pop';
  // Remove pop class after animation so it can retrigger
  elResult.addEventListener('animationend', () => {
    elResult.classList.remove('pop');
  }, { once: true });
}

/** Show error message */
function showError(msg = 'Error') {
  elResult.textContent = msg;
  elResult.className = 'result error';
  state.expression = '';
  state.justEvaled = false;
}

/* ───────────────────────────────────
   CORE ACTIONS
─────────────────────────────────── */

function appendToExpr(char) {
  // After a finished evaluation, if user types a number → start fresh
  if (state.justEvaled) {
    if (/[0-9.]/.test(char)) {
      state.expression = char;
    } else {
      // operator after result → continue from result
      state.expression = elResult.textContent + char;
    }
    state.justEvaled = false;
  } else {
    state.expression += char;
  }
  updateDisplay();
}

function clearAll() {
  state.expression = '';
  state.justEvaled = false;
  state.pendingOp  = null;
  state.pendingVal = null;
  elExpression.textContent = '0';
  elResult.textContent = '';
  elResult.className = 'result';
}

function deleteLast() {
  if (state.justEvaled) { clearAll(); return; }
  state.expression = state.expression.slice(0, -1);
  updateDisplay();
}

function toggleSign() {
  if (!state.expression) return;
  if (state.expression.startsWith('-')) {
    state.expression = state.expression.slice(1);
  } else {
    state.expression = '-' + state.expression;
  }
  updateDisplay();
}

function calculate() {
  if (!state.expression) return;
  try {
    const val = safeEval(state.expression);
    if (val === undefined || val === null) { showError(); return; }
    if (!isFinite(val)) {
      showFinalResult(val);
    } else {
      showFinalResult(val);
    }
    state.expression = fmt(val);
    state.justEvaled = true;
  } catch {
    showError('Syntax Error');
  }
}

/* ───────────────────────────────────
   SCIENTIFIC OPERATIONS
─────────────────────────────────── */

function getCurrentValue() {
  // If just evaluated, result line has the answer
  if (state.justEvaled) {
    const v = parseFloat(elResult.textContent);
    return isNaN(v) ? NaN : v;
  }
  // Otherwise try to evaluate the expression
  try {
    const v = safeEval(state.expression);
    return typeof v === 'number' ? v : NaN;
  } catch {
    return NaN;
  }
}

/**
 * Apply a unary scientific function.
 * Replaces the current expression with the result.
 */
function applySci(action) {
  const x = getCurrentValue();

  // For two-operand ops (xʸ, ʸ√x) we need a second operand
  if (action === 'pow') {
    if (isNaN(x)) { showError('Enter a number first'); return; }
    state.pendingOp  = 'pow';
    state.pendingVal = x;
    state.expression = '';
    state.justEvaled = false;
    elExpression.textContent = `${fmt(x)} ^ (`;
    elResult.textContent = 'Enter exponent…';
    elResult.className = 'result';
    return;
  }
  if (action === 'nthRoot') {
    if (isNaN(x)) { showError('Enter a number first'); return; }
    state.pendingOp  = 'nthRoot';
    state.pendingVal = x;
    state.expression = '';
    state.justEvaled = false;
    elExpression.textContent = `${fmt(x)} ʸ√ (`;
    elResult.textContent = 'Enter root…';
    elResult.className = 'result';
    return;
  }

  if (isNaN(x)) { showError('Enter a number first'); return; }

  let result;
  switch (action) {
    case 'sin':      result = Math.sin(toRad(x));         break;
    case 'cos':      result = Math.cos(toRad(x));         break;
    case 'tan':      result = Math.tan(toRad(x));         break;
    case 'asin':     result = toDeg(Math.asin(x));        break;
    case 'acos':     result = toDeg(Math.acos(x));        break;
    case 'atan':     result = toDeg(Math.atan(x));        break;
    case 'sqrt':     result = Math.sqrt(x);               break;
    case 'cbrt':     result = Math.cbrt(x);               break;
    case 'square':   result = x * x;                      break;
    case 'cube':     result = x * x * x;                  break;
    case 'tenPow':   result = Math.pow(10, x);            break;
    case 'log':      result = Math.log10(x);              break;
    case 'ln':       result = Math.log(x);                break;
    case 'log2':     result = Math.log2(x);               break;
    case 'exp':      result = Math.exp(x);                break;
    case 'inv':      result = 1 / x;                      break;
    case 'abs':      result = Math.abs(x);                break;
    case 'factorial':result = factorial(Math.round(x));   break;
    case 'percent':  result = x / 100;                    break;
    case 'pi':
      appendToExpr('π');
      return;
    case 'e':
      appendToExpr('e');
      return;
    default: return;
  }

  if (isNaN(result) || !isFinite(result)) {
    showError(isFinite(result) ? fmt(result) : 'Math Error');
    return;
  }

  // Show result
  state.expression = fmt(result);
  state.justEvaled = true;
  showFinalResult(result);
}

/** Resolve a pending two-operand op (pow / nthRoot) */
function resolvePendingOp() {
  if (!state.pendingOp) return false;
  const y = getCurrentValue();
  if (isNaN(y)) { showError('Invalid'); state.pendingOp = null; return true; }
  const x = state.pendingVal;
  let result;
  if (state.pendingOp === 'pow')     result = Math.pow(x, y);
  if (state.pendingOp === 'nthRoot') result = Math.pow(x, 1 / y);
  state.pendingOp  = null;
  state.pendingVal = null;
  state.expression = fmt(result);
  state.justEvaled = true;
  showFinalResult(result);
  return true;
}

/* ───────────────────────────────────
   BUTTON CLICK HANDLER
─────────────────────────────────── */
document.querySelectorAll('.btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const action = btn.dataset.action;
    if (!action) return;
    handleAction(action);
    animateBtn(btn);
  });
});

function handleAction(action) {
  switch (action) {
    // Numbers & dot
    case '0': case '1': case '2': case '3': case '4':
    case '5': case '6': case '7': case '8': case '9':
      appendToExpr(action);
      break;
    case '.':
      // Don't allow multiple dots in the same number segment
      if (!state.justEvaled && /\.\d*$/.test(state.expression)) break;
      appendToExpr('.');
      break;

    // Operators
    case '+': case '−': case '×': case '÷':
      // If pending op, resolve first
      if (state.pendingOp) { resolvePendingOp(); }
      appendToExpr(action);
      break;

    // Parentheses
    case 'openParen':  appendToExpr('(');  break;
    case 'closeParen': appendToExpr(')');  break;

    // Control
    case 'clear':   clearAll();     break;
    case 'delete':  deleteLast();   break;
    case 'sign':    toggleSign();   break;
    case '=':
      if (state.pendingOp) { resolvePendingOp(); }
      else { calculate(); }
      break;

    // Scientific
    default:
      applySci(action);
      break;
  }
}

/* ───────────────────────────────────
   SCIENTIFIC MODE TOGGLE
─────────────────────────────────── */
elModeToggle.addEventListener('click', () => {
  state.sciMode = !state.sciMode;
  elSciPanel.classList.toggle('visible', state.sciMode);
  elModeToggle.classList.toggle('active', state.sciMode);
  elChipSci.classList.toggle('active', state.sciMode);
});

/* ───────────────────────────────────
   DEG / RAD TOGGLE
─────────────────────────────────── */
elDegRadBtn.addEventListener('click', () => {
  state.isDeg = !state.isDeg;
  elDegRadBtn.textContent = state.isDeg ? 'DEG' : 'RAD';
  elChipDeg.classList.toggle('active', state.isDeg);
  elChipRad.classList.toggle('active', !state.isDeg);
  animateBtn(elDegRadBtn);
});

// Init chip state
elChipDeg.classList.add('active');

/* ───────────────────────────────────
   BUTTON PRESS ANIMATION
─────────────────────────────────── */
function animateBtn(el) {
  el.classList.remove('key-active');
  // Force reflow
  void el.offsetWidth;
  el.classList.add('key-active');
  setTimeout(() => el.classList.remove('key-active'), 150);
}

/* ───────────────────────────────────
   KEYBOARD SUPPORT
─────────────────────────────────── */
const keyMap = {
  '0': '0', '1': '1', '2': '2', '3': '3', '4': '4',
  '5': '5', '6': '6', '7': '7', '8': '8', '9': '9',
  '.': '.',
  '+': '+',
  '-': '−',
  '*': '×',
  '/': '÷',
  'Enter': '=',
  '=': '=',
  'Escape': 'clear',
  'Backspace': 'delete',
  '(': 'openParen',
  ')': 'closeParen',
  '%': 'percent',
  's': 'sin',
  'c': 'cos',
  't': 'tan',
  'l': 'log',
  'n': 'ln',
  'q': 'sqrt',
  'p': 'pi',
  'e': 'e',
  '!': 'factorial',
};

document.addEventListener('keydown', e => {
  // Prevent default browser shortcuts (e.g. / for search)
  if (['/', 'Enter'].includes(e.key)) e.preventDefault();

  const action = keyMap[e.key];
  if (!action) return;

  handleAction(action);

  // Visually highlight the matching button
  const btn = document.querySelector(`.btn[data-action="${action}"]`);
  if (btn) animateBtn(btn);
});

/* ───────────────────────────────────
   INITIAL STATE
─────────────────────────────────── */
clearAll();
