// Utilities ---------------------------------------------------------------
const isOperand = (tok) => /[A-Za-z0-9]/.test(tok);
const precedence = (op) => ({'^':4,'*':3,'/':3,'+':2,'-':2})[op] || 0;
const isRightAssoc = (op) => op === '^';

function tokenize(expression) {
  const tokens = [];
  for (let i = 0; i < expression.length; i++) {
    const ch = expression[i];
    if (ch === ' ') continue;
    if (/[A-Za-z]/.test(ch)) { tokens.push(ch); continue; }
    if (/[0-9]/.test(ch)) { // support multi-digit numbers
      let j = i, num = ch;
      while (j + 1 < expression.length && /[0-9]/.test(expression[j+1])) { j++; num += expression[j]; }
      tokens.push(num); i = j; continue;
    }
    if ('()+-*/^'.includes(ch)) { tokens.push(ch); continue; }
    throw new Error(`Invalid character: ${ch}`);
  }
  return tokens;
}

// Infix -> Postfix via Shunting Yard with step trace ---------------------
function infixToPostfixWithSteps(expr) {
  const tokens = tokenize(expr);
  const output = [];
  const stack = [];
  const steps = [];

  let iter = 0;
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    iter++;
    const remaining = tokens.slice(idx + 1).join(' ');
    if (isOperand(tok)) {
      output.push(tok);
      steps.push({iter, input: remaining, stack: stack.join(''), output: output.join(' '), action:`append operand ${tok}`});
    } else if (tok === '(') {
      stack.push(tok);
      steps.push({iter, input: remaining, stack: stack.join(''), output: output.join(' '), action:'push ('});
    } else if (tok === ')') {
      while (stack.length && stack[stack.length-1] !== '(') {
        output.push(stack.pop());
      }
      stack.pop();
      steps.push({iter, input: remaining, stack: stack.join(''), output: output.join(' '), action:'pop till ( and discard )'});
    } else { // operator
      while (stack.length) {
        const top = stack[stack.length-1];
        if ('+-*/^'.includes(top)) {
          const pTop = precedence(top), pTok = precedence(tok);
          if (pTop > pTok || (pTop === pTok && !isRightAssoc(tok))) {
            output.push(stack.pop());
            continue;
          }
        }
        break;
      }
      stack.push(tok);
      steps.push({iter, input: remaining, stack: stack.join(''), output: output.join(' '), action:`push operator ${tok}`});
    }
  }
  while (stack.length) output.push(stack.pop());
  steps.push({iter: steps.length ? steps[steps.length-1].iter + 1 : 1, input: '', stack: '', output: output.join(' '), action:'pop remaining operators'});
  return {result: output.join(' '), steps};
}

// Postfix -> Infix with steps -------------------------------------------
function postfixToInfixWithSteps(expr) {
  const tokens = tokenize(expr);
  const stack = [];
  const steps = [];
  let iter = 0;
  for (let idx = 0; idx < tokens.length; idx++) {
    const tok = tokens[idx];
    iter++;
    const remaining = tokens.slice(idx + 1).join(' ');
    if (isOperand(tok)) {
      stack.push(tok);
      steps.push({iter, input: remaining, stack: stack.join(' '), output:'', action:`push ${tok}`});
    } else if ('+-*/^'.includes(tok)) {
      const right = stack.pop();
      const left = stack.pop();
      const exprStr = `(${left} ${tok} ${right})`;
      stack.push(exprStr);
      steps.push({iter, input: remaining, stack: stack.join(' '), output:'', action:`combine ${left} ${tok} ${right}`});
    }
  }
  const result = stack.pop()?.replace(/^\((.*)\)$/,'$1') || '';
  steps.push({iter:iter+1, input: '', stack:'', output: result, action:'finalize'});
  return {result, steps};
}

// Prefix -> Infix with steps --------------------------------------------
function prefixToInfixWithSteps(expr) {
  const tokens = tokenize(expr);
  const stack = [];
  const steps = [];
  let iter = 0;
  for (let i = tokens.length - 1; i >= 0; i--) {
    const tok = tokens[i];
    iter++;
    const remaining = tokens.slice(0, i).join(' '); // unprocessed to the left (right-to-left scan)
    if (isOperand(tok)) {
      stack.push(tok);
      steps.push({iter, input: remaining, stack: stack.join(' '), output:'', action:`push ${tok}`});
    } else if ('+-*/^'.includes(tok)) {
      const left = stack.pop();
      const right = stack.pop();
      const exprStr = `(${left} ${tok} ${right})`;
      stack.push(exprStr);
      steps.push({iter, input: remaining, stack: stack.join(' '), output:'', action:`combine ${left} ${tok} ${right}`});
    }
  }
  const result = stack.pop()?.replace(/^\((.*)\)$/,'$1') || '';
  steps.push({iter:iter+1, input: '', stack:'', output: result, action:'finalize'});
  return {result, steps};
}

// Bridging conversions ---------------------------------------------------
function convert(from, to, expr) {
  if (from === to) {
    return {result: expr, steps:[{iter:1, input: expr, stack:'', output: expr, action:'same notation'}]};
  }
  if (from === 'Infix' && to === 'Postfix') return infixToPostfixWithSteps(expr);
  if (from === 'Infix' && to === 'Prefix') {
    const {result: post} = infixToPostfixWithSteps(expr);
    // derive prefix from postfix using stack reverse approach
    const toks = tokenize(post);
    const stack = [];
    const preSteps = [];
    let iter = 0;
    for (let idx=0; idx<toks.length; idx++) {
      const tok = toks[idx];
      const remaining = toks.slice(idx+1).join(' ');
      iter++;
      if (isOperand(tok)) { stack.push(tok); preSteps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`push ${tok}`}); }
      else { const b = stack.pop(); const a = stack.pop(); const formed = `${tok} ${a} ${b}`; stack.push(formed); preSteps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`combine -> ${formed}`}); }
    }
    const result = stack.pop();
    preSteps.push({iter:iter+1,input:'',stack:'',output:result,action:'finalize'});
    return {result, steps: preSteps};
  }
  if (from === 'Postfix' && to === 'Infix') return postfixToInfixWithSteps(expr);
  if (from === 'Prefix' && to === 'Infix') return prefixToInfixWithSteps(expr);
  if (from === 'Postfix' && to === 'Prefix') {
    // Postfix -> Prefix directly
    const toks = tokenize(expr);
    const stack = []; const steps=[]; let iter=0;
    for (let idx=0; idx<toks.length; idx++){
      const tok = toks[idx];
      const remaining = toks.slice(idx+1).join(' ');
      iter++;
      if (isOperand(tok)) { stack.push(tok); steps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`push ${tok}`}); }
      else { const b=stack.pop(), a=stack.pop(); const formed = `${tok} ${a} ${b}`; stack.push(formed); steps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`combine -> ${formed}`}); }
    }
    const result = stack.pop(); steps.push({iter:iter+1,input:'',stack:'',output:result,action:'finalize'});
    return {result, steps};
  }
  if (from === 'Prefix' && to === 'Postfix') {
    // Prefix -> Postfix via stack from right
    const toks = tokenize(expr);
    const stack = []; const steps=[]; let iter=0;
    for (let i=toks.length-1;i>=0;i--){
      const tok = toks[i]; iter++;
      const remaining = toks.slice(0,i).join(' ');
      if (isOperand(tok)) { stack.push(tok); steps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`push ${tok}`}); }
      else { const a=stack.pop(), b=stack.pop(); const formed = `${a} ${b} ${tok}`; stack.push(formed); steps.push({iter,input:remaining,stack:stack.join(' '),output:'',action:`combine -> ${formed}`}); }
    }
    const result = stack.pop(); steps.push({iter:iter+1,input:'',stack:'',output:result,action:'finalize'});
    return {result, steps};
  }
  throw new Error('Unsupported conversion');
}

// UI glue ----------------------------------------------------------------
const exprEl = document.getElementById('expr');
const fromEl = document.getElementById('from');
const toEl = document.getElementById('to');
const convertBtn = document.getElementById('convertBtn');
const resultExprEl = document.getElementById('resultExpr');
const stepsTableBody = document.querySelector('#stepsTable tbody');
const playBtn = document.getElementById('playBtn');
const pauseBtn = document.getElementById('pauseBtn');
const stepBtn = document.getElementById('stepBtn');
const speedEl = document.getElementById('speed');
const metaInfoEl = document.getElementById('metaInfo');
const copyMdBtn = document.getElementById('copyMdBtn');

let currentSteps = [];
let animIndex = 0;
let timer = null;

function renderRow(step) {
  const tr = document.createElement('tr');
  tr.innerHTML = `<td>${step.iter}</td><td>${step.input}</td><td>${step.stack || '-'}</td><td>${step.output || '-'}</td><td class="muted">${step.action || ''}</td>`;
  return tr;
}

function clearTable() { stepsTableBody.innerHTML = ''; }

function renderAll(steps) {
  clearTable();
  for (const s of steps) stepsTableBody.appendChild(renderRow(s));
}

function animateSteps() {
  if (!currentSteps.length) return;
  if (animIndex >= currentSteps.length) { stopTimer(); return; }
  const step = currentSteps[animIndex++];
  const row = renderRow(step);
  row.classList.add('added');
  stepsTableBody.appendChild(row);
  highlightLastRow();
}

function highlightLastRow(){
  const rows = stepsTableBody.querySelectorAll('tr');
  rows.forEach(r=>r.classList.remove('highlight'));
  if (rows.length) rows[rows.length-1].classList.add('highlight');
}

function startTimer(){
  stopTimer();
  timer = setInterval(animateSteps, Number(speedEl.value));
}
function stopTimer(){ if (timer) clearInterval(timer); timer = null; }

function doConvert() {
  try{
    const {result, steps} = convert(fromEl.value, toEl.value, exprEl.value.trim());
    currentSteps = steps; animIndex = 0; stopTimer(); clearTable();
    resultExprEl.textContent = result || '—';
    metaInfoEl.textContent = `${steps.length} step(s)`;
    // prime first row for manual stepping
  }catch(e){
    alert(e.message);
  }
}

convertBtn.addEventListener('click', doConvert);
playBtn.addEventListener('click', ()=>{ if (!currentSteps.length) doConvert(); startTimer(); });
pauseBtn.addEventListener('click', ()=> stopTimer());
stepBtn.addEventListener('click', ()=>{ if (!currentSteps.length) doConvert(); if (!timer) animateSteps(); });
speedEl.addEventListener('input', ()=>{ if (timer) startTimer(); });

copyMdBtn.addEventListener('click', async ()=>{
  const rows = Array.from(stepsTableBody.querySelectorAll('tr'));
  const header = ['Iter','Input','Stack','Output','Action'];
  const md = [];
  md.push(`| ${header.join(' | ')} |`);
  md.push(`| ${header.map(()=> '---').join(' | ')} |`);
  for (const r of rows) {
    const tds = Array.from(r.children).map(td => td.textContent.replace(/\|/g,'\\|'));
    md.push(`| ${tds.join(' | ')} |`);
  }
  const blob = md.join('\n');
  await navigator.clipboard.writeText(blob);
  copyMdBtn.textContent = 'Copied!';
  setTimeout(()=> copyMdBtn.textContent = 'Copy Table as Markdown', 1200);
});

// Demo seed
exprEl.value = 'A + B * C - D / E';
fromEl.value = 'Infix';
toEl.value = 'Postfix';


