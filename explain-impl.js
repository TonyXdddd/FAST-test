// Реализация + трассировка шагов для страницы explain.html
const { FASTElement, html, css, ref, observable } = await import('https://cdn.jsdelivr.net/npm/@microsoft/fast-element@2.10.5/+esm');

// ===================== трассировка =====================
const KIND_LABEL = { browser: 'браузер', ours: 'наш код', fast: 'компонент', ok: 'итог', bad: 'итог' };
const flows = new Map(); // карточка кейса -> { t0, submitted, submitter, expected }

export const caseOf = (node) => node?.closest?.('[data-case]') ?? null;

export function d(el) {
  if (!el) return '<code>null</code>';
  const id = el.id ? '#' + el.id.replace(/^c\d+-/, '') : '';
  let name = el.localName;
  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) name += `[type=${el.type}]`;
  else if (el.getAttribute?.('type')) name += `[type=${el.getAttribute('type')}]`;
  return `<code>${name}${id}</code>`;
}

export function trace(node, kind, text) {
  const card = caseOf(node);
  if (!card) return;
  const log = card.querySelector('.log');
  log.querySelector('.empty')?.remove();
  const flow = flows.get(card);
  const li = document.createElement('li');
  if (kind === 'ok' || kind === 'bad') li.className = 'result';
  li.innerHTML = '<span class="t"></span><span><span class="tag"></span></span><span class="msg"></span>';
  const isResult = kind === 'ok' || kind === 'bad';
  li.querySelector('.t').textContent = flow && !isResult ? `+${Math.round(performance.now() - flow.t0)} мс` : '';
  li.querySelector('.tag').classList.add(kind);
  li.querySelector('.tag').textContent = KIND_LABEL[kind];
  li.querySelector('.msg').innerHTML = text;
  log.append(li);
  log.scrollTop = log.scrollHeight;
}

function finish(card) {
  const flow = flows.get(card);
  if (!flow) return;
  const got = flow.submitted ? 'submit' : 'none';
  const ok = got === flow.expected;
  const text = flow.submitted ? `форма отправлена, submitter = ${d(flow.submitter)}` : 'форма не отправлена';
  trace(card, ok ? 'ok' : 'bad', `${text} ${ok ? '— как ожидалось ✔' : '— не совпало с ожиданием ✘'}`);
  flows.delete(card);
}

document.addEventListener('keydown', (e) => {
  const card = caseOf(e.target);
  if (e.key !== 'Enter' || !card) return;
  flows.set(card, {
    t0: performance.now(),
    submitted: false,
    submitter: null,
    expected: card._expectFor ? card._expectFor(e) : card.dataset.expect,
  });
  clearTimeout(card._finishTimer);
  card._finishTimer = setTimeout(() => finish(card), 400);
  const mods = ['shiftKey', 'ctrlKey', 'altKey', 'metaKey'].filter((m) => e[m]).map((m) => m.replace('Key', '')).join('+');
  trace(e.target, 'browser', `<code>keydown</code> ${mods ? mods + '+' : ''}Enter на ${d(e.target)}${e.isTrusted ? '' : ' <span class="muted">(симуляция)</span>'}`);
}, true);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.defaultPrevented && caseOf(e.target)) {
    trace(e.target, 'browser', '<code>keydown</code> отменён (<code>defaultPrevented = true</code>) → браузер <b>не пришлёт</b> <code>keypress</code>');
  }
});

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && caseOf(e.target)) {
    trace(e.target, 'browser', '<code>keypress</code> Enter (приходит, только если keydown не отменён и нет IME-ввода)');
  }
}, true);

document.addEventListener('click', (e) => {
  const card = caseOf(e.target);
  if (!card || !flows.has(card)) return;
  trace(e.target, 'browser', `<code>click</code> на ${d(e.target)} (bubbles = ${e.bubbles}, cancelable = ${e.cancelable})`);
}, true);

document.addEventListener('invalid', (e) => {
  if (caseOf(e.target)) trace(e.target, 'browser', `<code>invalid</code> на ${d(e.target)} — проверка формы не прошла, <code>submit</code> не будет`);
}, true);

document.addEventListener('submit', (e) => {
  const card = caseOf(e.target);
  if (!card) return;
  e.preventDefault(); // демо: не уходим со страницы
  const flow = flows.get(card);
  if (flow) Object.assign(flow, { submitted: true, submitter: e.submitter ?? null });
  trace(e.target, 'browser', `<code>submit</code> на ${d(e.target)}, submitter = ${d(e.submitter)}`);
}, true);

// ===================== form-utils.ts (с трассировкой) =====================
const submitBlockingInputTypes = new Set([
  'text', 'search', 'url', 'tel', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number',
]);

function isSubmitButton($element) {
  if ($element instanceof HTMLButtonElement) return $element.type === 'submit';
  if ($element instanceof HTMLInputElement) return $element.type === 'submit' || $element.type === 'image';
  return $element.isSubmitButton === true;
}

function isSubmitBlocking($element) {
  if ($element instanceof HTMLInputElement) return submitBlockingInputTypes.has($element.type);
  return $element.blocksImplicitSubmission === true;
}

function getDefaultButton($form, host) {
  let button = null;
  const rows = Array.from($form.elements).map((el) => {
    if (!isSubmitButton(el)) return `${d(el)} — не submit-кнопка`;
    if (button) return `${d(el)} — submit-кнопка, но не первая`;
    button = el;
    return `${d(el)} — <b>первая submit-кнопка</b>`;
  });
  trace(host, 'ours', `<b>шаг 2</b> · ищем кнопку по умолчанию в <code>form.elements</code> (порядок документа, включая элементы с <code>form="id"</code>):<br>${rows.join('<br>')}`);

  const root = $form.getRootNode();
  const image = Array.from(root.querySelectorAll('input')).find(($) => $.type === 'image' && $.form === $form);
  if (image && (!button || button.compareDocumentPosition(image) & Node.DOCUMENT_POSITION_PRECEDING)) {
    trace(host, 'ours', `${d(image)} стоит раньше — берём её (<code>input[type=image]</code> нет в <code>form.elements</code>)`);
    button = image;
  }
  return button;
}

export function mimicFormEnterBehavior($elementInternals, host) {
  const form = $elementInternals.form;
  if (!form) {
    trace(host, 'ours', '<b>шаг 1</b> · <code>elementInternals.form = null</code> — поле не в форме → выходим');
    return;
  }
  trace(host, 'ours', `<b>шаг 1</b> · форма: ${d(form)}`);

  const button = getDefaultButton(form, host);
  if (button) {
    if (button.matches(':disabled')) {
      trace(host, 'ours', `<b>шаг 3</b> · ${d(button)} неактивна (<code>:disabled</code>) → ничего не делаем, следующую кнопку <b>не ищем</b>`);
      return;
    }
    trace(host, 'ours', `<b>шаг 3</b> · ${d(button)} активна → <code>button.click()</code>`);
    button.click();
    return;
  }

  const fields = Array.from(form.elements).filter(isSubmitBlocking);
  trace(host, 'ours', `<b>шаг 4</b> · submit-кнопок нет → считаем текстовые поля: ${fields.map(d).join(', ') || 'нет'} → <b>${fields.length}</b>`);
  if (fields.length < 2) {
    trace(host, 'ours', '<b>шаг 5</b> · полей меньше двух → <code>form.requestSubmit()</code>');
    form.requestSubmit();
  } else {
    trace(host, 'ours', '<b>шаг 5</b> · полей больше одного → ничего не делаем (браузер поступает так же)');
  }
}

export function handleFormEnterKeypress($event, $elementInternals, host) {
  let reason = '';
  if ($event.key !== 'Enter') reason = 'не Enter';
  else if ($event.isComposing || $event.keyCode === 229) reason = 'идёт IME-ввод';
  else if ($event.ctrlKey || $event.altKey || $event.metaKey) reason = 'зажат Ctrl/Alt/Meta';
  if (reason) {
    if ($event.key === 'Enter') trace(host, 'ours', `фильтр клавиши: ${reason} → выходим`);
    return;
  }
  trace(host, 'ours', 'фильтр клавиши пройден → откладываем работу через <code>setTimeout</code>, чтобы сначала отработали все обработчики');

  setTimeout(() => {
    if ($event.defaultPrevented) {
      trace(host, 'ours', '<code>setTimeout</code>: <code>$event.defaultPrevented = true</code> — Enter кто-то отменил → выходим');
      return;
    }
    trace(host, 'ours', '<code>setTimeout</code>: событие обработано, <code>defaultPrevented = false</code> → <code>mimicFormEnterBehavior()</code>');
    mimicFormEnterBehavior($elementInternals, host);
  });
}

// ===================== компоненты =====================
const fieldStyles = css`
  :host { display: inline-flex; align-items: center; gap: 6px; }
  input { font: inherit; width: 10em; padding: 4px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); }
  .popup { font-size: 12px; padding: 1px 6px; border-radius: 4px; background: var(--fast-bg); color: var(--fast); }
`;

const inputTemplate = html`<input part="control" type="${(x) => x.type || 'text'}" placeholder="${(x) => x.placeholder ?? ''}"
  @input="${(x, c) => x.handleInputInputEvent(c.event)}"
  @change="${(x, c) => x.handleInputChangeEvent(c.event)}"
  @keydown="${(x, c) => x.handleKeydownEvent(c.event)}"
  @keypress="${(x, c) => x.handleKeypressEvent(c.event)}"
  ${ref('input')}>`;

export class Input extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
  blocksImplicitSubmission = true;
  get form() { return this.elementInternals.form; }

  handleInputInputEvent() {
    this.elementInternals.setFormValue(this.input.value);
    return true;
  }

  handleInputChangeEvent() {
    trace(this, 'fast', '<code>@change</code>: нативный <code>change</code> внутреннего input (действие браузера после keypress) → <code>$emit(\'change\')</code>');
    this.$emit('change');
    return true;
  }

  handleKeydownEvent($event) {
    if ($event.key === 'Enter') trace(this, 'fast', '<code>handleKeydownEvent</code>: Enter не обрабатываем, <code>return true</code> → FAST не вызовет <code>preventDefault()</code>');
    return true;
  }

  handleKeypressEvent($event) {
    if ($event.key === 'Enter') trace(this, 'fast', '<code>handleKeypressEvent</code> → <code>handleFormEnterKeypress()</code>, затем <code>return true</code>');
    handleFormEnterKeypress($event, this.elementInternals, this);
    return true;
  }
}
FASTElement.define(Input, { name: 'x-input', template: inputTemplate, styles: fieldStyles, attributes: ['type', 'placeholder'] });

export class InputBad extends Input {
  handleKeydownEvent($event) {
    if ($event.key === 'Enter') trace(this, 'fast', '<code>handleKeydownEvent</code> ничего не вернул → FAST сам вызывает <code>preventDefault()</code>');
  }
}
FASTElement.define(InputBad, { name: 'x-input-bad', template: inputTemplate, styles: fieldStyles, attributes: ['type', 'placeholder'] });

export class Picker extends Input {
  constructor() { super(); this.open = true; }
  handleKeydownEvent($event) {
    if ($event.key === 'Enter' && this.open) {
      this.open = false;
      this.input.value = '2026';
      trace(this, 'fast', '<code>handleKeydownEvent</code>: попап открыт → выбрали 2026, закрыли попап, <code>return false</code> → FAST вызовет <code>preventDefault()</code>');
      return false;
    }
    return super.handleKeydownEvent($event);
  }
}
observable(Picker.prototype, 'open');
const pickerTemplate = html`<input part="control" placeholder="Год"
  @input="${(x, c) => x.handleInputInputEvent(c.event)}"
  @change="${(x, c) => x.handleInputChangeEvent(c.event)}"
  @keydown="${(x, c) => x.handleKeydownEvent(c.event)}"
  @keypress="${(x, c) => x.handleKeypressEvent(c.event)}"
  ${ref('input')}><span class="popup" ?hidden="${(x) => !x.open}">▾ попап открыт</span>`;
FASTElement.define(Picker, { name: 'x-picker', template: pickerTemplate, styles: fieldStyles });

export class Button extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
  get form() { return this.elementInternals.form; }
  get isSubmitButton() { return this.type === 'submit'; }
  constructor() {
    super();
    this.addEventListener('click', () => {
      if (this.type !== 'submit' || this.matches(':disabled')) return;
      trace(this, 'ours', `${d(this)}: обработчик клика кнопки → <code>form.requestSubmit()</code>`);
      this.form?.requestSubmit();
    });
  }
}
FASTElement.define(Button, {
  name: 'x-button',
  template: html`<button part="control" ?disabled="${(x) => x.disabled}"><slot></slot></button>`,
  styles: css`button { font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--neutral-bg); color: var(--text); cursor: pointer; } button:disabled { opacity: .5; cursor: default; }`,
  attributes: ['type', { property: 'disabled', attribute: 'disabled', mode: 'boolean' }],
});

// ===================== симуляция =====================
export function simulateEnter(card, init = {}) {
  const host = card.querySelector('[data-primary]');
  const target = host.shadowRoot?.querySelector('input') ?? host;
  const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true, cancelable: true, ...init };
  const keydown = new KeyboardEvent('keydown', opts);
  target.dispatchEvent(keydown);
  if (!keydown.defaultPrevented && !opts.isComposing) target.dispatchEvent(new KeyboardEvent('keypress', { ...opts, charCode: 13 }));
  target.dispatchEvent(new KeyboardEvent('keyup', opts));
}
