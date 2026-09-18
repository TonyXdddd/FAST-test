// Работающая реализация (повторяет код из левой панели) + журнал шагов
const { FASTElement, html, css, ref, observable } = await import('https://cdn.jsdelivr.net/npm/@microsoft/fast-element@2.10.5/+esm');

// ===================== журнал =====================
const KIND_LABEL = { browser: 'браузер', ours: 'наш код', fast: 'компонент', ok: 'итог', bad: 'итог' };
const flows = new Map(); // карточка кейса -> { t0, submitted, submitter, expected }
const SUBMITTERS = 'fu-mimic-disabled fu-mimic-count btn-click';

export const caseOf = (node) => node?.closest?.('[data-case]') ?? null;

export function d(el) {
  if (!el) return '<code>null</code>';
  const id = el.id ? '#' + el.id.replace(/^c\d+-/, '') : '';
  let name = el.localName;
  if (el instanceof HTMLInputElement || el instanceof HTMLButtonElement) name += `[type=${el.type}]`;
  else if (el.getAttribute?.('type')) name += `[type=${el.getAttribute('type')}]`;
  return `<code>${name}${id}</code>`;
}

export function trace(node, kind, text, code = '') {
  const card = caseOf(node);
  if (!card) return;
  const log = card.querySelector('.log');
  log.querySelector('.empty')?.remove();
  const flow = flows.get(card);
  const isResult = kind === 'ok' || kind === 'bad';
  const li = document.createElement('li');
  if (isResult) li.className = 'result';
  if (code) li.dataset.code = code;
  li.innerHTML = '<span class="t"></span><span><span class="tag"></span></span><span class="msg"></span>';
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
  const ok = (flow.submitted ? 'submit' : 'none') === flow.expected;
  const text = flow.submitted ? `форма отправлена, submitter = ${d(flow.submitter)}` : 'форма не отправлена';
  trace(card, ok ? 'ok' : 'bad', `${text} ${ok ? '— как ожидалось ✔' : '— не совпало с ожиданием ✘'}`);
  flows.delete(card);
}

document.addEventListener('keydown', (e) => {
  const card = caseOf(e.target);
  if (e.key !== 'Enter' || !card) return;
  flows.set(card, { t0: performance.now(), submitted: false, submitter: null, expected: card._expectFor ? card._expectFor(e) : card.dataset.expect });
  clearTimeout(card._finishTimer);
  card._finishTimer = setTimeout(() => finish(card), 400);
  const mods = ['shift', 'ctrl', 'alt', 'meta'].filter((m) => e[`${m}Key`]).join('+');
  trace(e.target, 'browser', `<code>keydown</code> ${mods ? mods + '+' : ''}Enter на ${d(e.target)}${e.isTrusted ? '' : ' <span class="muted">(симуляция)</span>'}`, 'tpl-keydown');
}, true);

window.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.defaultPrevented && caseOf(e.target)) {
    trace(e.target, 'browser', '<code>keydown</code> отменён → браузер <b>не пришлёт</b> <code>keypress</code> и нативный <code>change</code> по Enter', 'input-keydown-enter');
  }
});

document.addEventListener('keypress', (e) => {
  if (e.key === 'Enter' && caseOf(e.target)) {
    trace(e.target, 'browser', '<code>keypress</code> Enter — keydown не был отменён', 'input-keydown-enter');
  }
}, true);

document.addEventListener('click', (e) => {
  const card = caseOf(e.target);
  if (card && flows.has(card)) trace(e.target, 'browser', `<code>click</code> на ${d(e.target)} (bubbles = ${e.bubbles}, cancelable = ${e.cancelable})`, 'fu-mimic-disabled');
}, true);

document.addEventListener('invalid', (e) => {
  if (caseOf(e.target)) trace(e.target, 'browser', `<code>invalid</code> на ${d(e.target)} — проверка формы не прошла, <code>submit</code> не будет`, SUBMITTERS);
}, true);

document.addEventListener('submit', (e) => {
  const card = caseOf(e.target);
  if (!card) return;
  e.preventDefault(); // демо: страница не перезагружается
  const flow = flows.get(card);
  if (flow) Object.assign(flow, { submitted: true, submitter: e.submitter ?? null });
  trace(e.target, 'browser', `<code>submit</code> на ${d(e.target)}, submitter = ${d(e.submitter)}`, SUBMITTERS);
}, true);

// ===================== form-utils.ts =====================
const submitBlockingElementTypes = new Set(['text', 'search', 'url', 'tel', 'email', 'password', 'date', 'month', 'week', 'time', 'datetime-local', 'number']);
const customSubmitBlockingElementTypes = new Set(['date-interval', 'time-interval', 'year']);

function isCustomElement($element) {
  return customElements.get($element.localName) !== undefined;
}

function getElementType($element) {
  const type = $element.type;
  return typeof type === 'string' ? type : '';
}

function isSubmitButton($element) {
  if ($element instanceof HTMLButtonElement) return $element.type === 'submit';
  if ($element instanceof HTMLInputElement) return $element.type === 'submit';
  return isCustomElement($element) && getElementType($element) === 'submit';
}

function isSubmitBlocking($element) {
  if ($element instanceof HTMLInputElement) {
    return submitBlockingElementTypes.has($element.type);
  }
  if (isCustomElement($element)) {
    const type = getElementType($element);
    if (submitBlockingElementTypes.has(type)) {
      return true;
    }
    return customSubmitBlockingElementTypes.has(type);
  }
  return false;
}

// только для журнала: почему элемент считается или не считается полем
function blockingReason($element) {
  if ($element instanceof HTMLInputElement) {
    return submitBlockingElementTypes.has($element.type) ? `нативный input, type «${$element.type}» из первого Set` : `нативный input, type «${$element.type}» не в списке`;
  }
  if (!isCustomElement($element)) return `${$element.localName} не зарегистрирован в customElements — не поле`;
  const type = getElementType($element);
  if (type === '') return 'кастомный, type не задан';
  if (submitBlockingElementTypes.has(type)) return `кастомный, type «${type}» из первого Set`;
  if (customSubmitBlockingElementTypes.has(type)) return `кастомный, type «${type}» из второго Set (уникальные типы)`;
  return `кастомный, type «${type}» нет ни в одном Set`;
}

function getDefaultButton($form, host) {
  let button = null;
  const rows = Array.from($form.elements).map((el) => {
    if (!isSubmitButton(el)) return `${d(el)} — не submit-кнопка`;
    if (button) return `${d(el)} — submit-кнопка, но не первая`;
    button = el;
    return `${d(el)} — <b>первая submit-кнопка</b>`;
  });
  trace(host, 'ours', `<b>шаг 2</b> · ищем кнопку по умолчанию в <code>form.elements</code> (порядок документа, включая <code>form="id"</code>):<br>${rows.join('<br>')}`, 'fu-getDefaultButton fu-isSubmitButton');
  return button || null;
}

function mimicFormSubmitBehavior($elementInternals, host) {
  const form = $elementInternals.form;
  if (!form) {
    trace(host, 'ours', '<b>шаг 1</b> · <code>elementInternals.form = null</code> → <code>return false</code>', 'fu-mimic-form');
    return false;
  }
  trace(host, 'ours', `<b>шаг 1</b> · форма: ${d(form)}`, 'fu-mimic-form');

  const button = getDefaultButton(form, host);
  if (button) {
    if (button.matches(':disabled')) {
      trace(host, 'ours', `<b>шаг 3</b> · ${d(button)} неактивна (<code>:disabled</code>) → не кликаем, следующую не ищем, <code>return true</code>`, 'fu-mimic-button');
      return true;
    }
    trace(host, 'ours', `<b>шаг 3</b> · ${d(button)} активна → <code>button.click()</code>`, 'fu-mimic-disabled');
    button.click();
    trace(host, 'ours', '<b>шаг 3</b> · <code>return true</code>', 'fu-mimic-button');
    return true;
  }

  const fields = Array.from(form.elements).filter(isSubmitBlocking);
  const rows = Array.from(form.elements).map((el) => `${d(el)} — ${isSubmitBlocking(el) ? '✔' : '✘'} ${blockingReason(el)}`);
  trace(host, 'ours', `<b>шаг 4</b> · submit-кнопок нет → считаем текстовые поля:<br>${rows.join('<br>')}<br>итого: <b>${fields.length}</b>`, 'fu-mimic-count fu-isSubmitBlocking fu-custom-check fu-types fu-custom-types');
  if (fields.length < 2) {
    trace(host, 'ours', '<b>шаг 5</b> · полей меньше двух → <code>form.requestSubmit()</code>, <code>return true</code>', 'fu-mimic-count');
    form.requestSubmit();
    return true;
  }
  trace(host, 'ours', '<b>шаг 5</b> · полей больше одного → <code>return false</code>', 'fu-mimic-false');
  return false;
}

// ===================== компоненты =====================
const fieldStyles = css`
  :host { display: inline-flex; align-items: center; gap: 6px; }
  input { font: inherit; width: 10em; padding: 4px 7px; border: 1px solid var(--border); border-radius: 6px; background: var(--card); color: var(--text); }
  .popup { font-size: 12px; padding: 1px 6px; border-radius: 4px; background: var(--fast-bg); color: var(--fast); }
`;

const inputTemplate = html`<input class="internal-control" part="control input"
  type="${(x) => x.type || 'text'}" placeholder="${(x) => x.placeholder ?? ''}"
  @input="${(x, c) => x.handleInputInputEvent(c.event)}"
  @change="${(x, c) => x.handleInputChangeEvent(c.event)}"
  @keydown="${(x, c) => x.handleKeydownEvent(c.event)}"
  ${ref('input')}>`;

const yearPickerTemplate = html`<input class="internal-control" part="control input" placeholder="Год"
  @input="${(x, c) => x.handleInputInputEvent(c.event)}"
  @change="${(x, c) => x.handleInputChangeEvent(c.event)}"
  @keydown="${(x, c) => x.handleKeydownEvent(c.event)}"
  ${ref('input')}><span class="popup" ?hidden="${(x) => !x.open}">▾ попап открыт</span>`;

export class Input extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
  get form() { return this.elementInternals.form; }
  get defaultType() { return 'text'; }

  connectedCallback() {
    if (!this.type) this.type = this.defaultType;
    super.connectedCallback();
  }

  handleInputInputEvent() {
    this.elementInternals.setFormValue(this.input.value);
  }

  handleInputChangeEvent() {
    trace(this, 'fast', '<code>handleInputChangeEvent</code>: нативный <code>change</code> внутреннего input → <code>$emit(\'change\')</code>', 'tpl-change input-change');
    this.$emit('change');
  }

  handleKeydownEvent($event) {
    if ($event.key === 'Enter') {
      trace(this, 'fast', '<code>handleKeydownEvent</code>: Enter → <code>mimicFormSubmitBehavior(this.elementInternals)</code>', 'tpl-keydown input-keydown-enter');
      const handled = mimicFormSubmitBehavior(this.elementInternals, this);
      trace(this, 'fast', handled
        ? '<code>return !true</code> → <code>false</code> → FAST вызывает <code>preventDefault()</code> на keydown'
        : '<code>return !false</code> → <code>true</code> → FAST не трогает keydown', 'input-keydown-enter');
      return !handled;
    }
    return true;
  }
}
FASTElement.define(Input, { name: 'x-input', template: inputTemplate, styles: fieldStyles, attributes: ['type', 'placeholder'] });

export class YearPicker extends Input {
  constructor() { super(); this.open = true; }
  get defaultType() { return 'year'; }
  handleKeydownEvent($event) {
    if ($event.key === 'Enter' && this.open) {
      this.input.value = '2026';
      this.open = false;
      trace(this, 'fast', '<code>YearPicker.handleKeydownEvent</code>: попап открыт → выбрали 2026, закрыли попап, <code>return false</code> → FAST отменяет keydown', 'picker-consume');
      return false;
    }
    if ($event.key === 'Enter') trace(this, 'fast', '<code>YearPicker.handleKeydownEvent</code>: попап закрыт → <code>super.handleKeydownEvent($event)</code>', 'picker-keydown');
    return super.handleKeydownEvent($event);
  }
}
observable(YearPicker.prototype, 'open');
FASTElement.define(YearPicker, {
  name: 'x-year-picker',
  template: yearPickerTemplate,
  styles: fieldStyles,
});

export class Button extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
  get form() { return this.elementInternals.form; }
  constructor() {
    super();
    this.addEventListener('click', () => {
      if (this.type === 'submit' && !this.matches(':disabled')) {
        trace(this, 'ours', `${d(this)}: обработчик клика → <code>form.requestSubmit()</code>`, 'btn-click');
        this.form?.requestSubmit();
      }
    });
  }
}
FASTElement.define(Button, {
  name: 'x-button',
  template: html`<button part="control" ?disabled="${(x) => x.disabled}"><slot></slot></button>`,
  styles: css`button { font: inherit; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border); background: var(--neutral-bg); color: var(--text); cursor: pointer; } button:disabled { opacity: .5; cursor: default; }`,
  attributes: ['type', { property: 'disabled', attribute: 'disabled', mode: 'boolean' }],
});

export class DateIntervalPicker extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
  get form() { return this.elementInternals.form; }

  connectedCallback() {
    if (!this.type) this.type = 'date-interval';
    super.connectedCallback();
  }

  handleKeydownEvent($event) {
    if ($event.key === 'Enter') {
      trace(this, 'fast', '<code>DateIntervalPicker.handleKeydownEvent</code>: Enter → <code>mimicFormSubmitBehavior(this.elementInternals)</code>', 'interval-keydown');
      const handled = mimicFormSubmitBehavior(this.elementInternals, this);
      trace(this, 'fast', handled
        ? '<code>return !true</code> → <code>false</code> → FAST вызывает <code>preventDefault()</code> на keydown'
        : '<code>return !false</code> → <code>true</code> → FAST не трогает keydown', 'interval-keydown');
      return !handled;
    }
    return true;
  }
}
FASTElement.define(DateIntervalPicker, {
  name: 'x-date-interval',
  template: html`<input class="internal-control" part="from" type="date" @keydown="${(x, c) => x.handleKeydownEvent(c.event)}"> — <input class="internal-control" part="to" type="date" @keydown="${(x, c) => x.handleKeydownEvent(c.event)}">`,
  styles: fieldStyles,
  attributes: ['type'],
});

// Сторонний кастомный компонент с типом, которого нет ни в одном Set
export class Rating extends FASTElement {
  static formAssociated = true;
  elementInternals = this.attachInternals();
}
FASTElement.define(Rating, {
  name: 'x-rating',
  template: html`<span part="stars" style="letter-spacing: 2px">★★★☆☆</span>`,
  attributes: ['type'],
});

// ===================== симуляция =====================
export function simulateEnter(card, init = {}) {
  const host = card.querySelector('[data-primary]');
  const target = host.shadowRoot?.querySelector('input') ?? host;
  const opts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, composed: true, cancelable: true, ...init };
  const keydown = new KeyboardEvent('keydown', opts);
  target.dispatchEvent(keydown);
  if (!keydown.defaultPrevented) target.dispatchEvent(new KeyboardEvent('keypress', { ...opts, charCode: 13 }));
  target.dispatchEvent(new KeyboardEvent('keyup', opts));
}
