const BUTTON = 'B. Какую кнопку нажать';
const CANCEL = 'C. Отмена, валидация и особые случаи';

export default [
  {
    id: 'c11', group: BUTTON,
    title: 'Отмеченный checkbox стоит перед кнопкой',
    expect: 'submit',
    expectText: '<code>click()</code> по кнопке, галочка остаётся',
    why: 'Старая версия искала кнопку через <code>:default</code>, а под него попадает и checkbox с атрибутом <code>checked</code>: Enter снимал галочку и не отправлял форму. Теперь проверяется именно тип кнопки.',
    markup: `<form id="c11-form"><x-input id="c11-user" data-primary placeholder="Логин"></x-input><label><input type="checkbox" id="c11-remember" checked> запомнить меня</label><button id="c11-login">Войти</button></form>`,
    reset(card) { card.querySelector('#c11-remember').checked = true; },
  },
  {
    id: 'c12', group: BUTTON,
    title: 'Только x-button type="button" и x-button без type',
    expect: 'submit',
    expectText: '<code>form.requestSubmit()</code>, <code>submitter = null</code>',
    why: 'У таких кнопок <code>isSubmitButton = false</code> → submit-кнопок нет → подсчёт полей → одно поле → отправка без клика.',
    markup: `<form id="c12-form"><x-input id="c12-tag" data-primary placeholder="Тег"></x-input><x-button id="c12-typebutton" type="button">type="button"</x-button><x-button id="c12-notype">без type</x-button></form>`,
  },
  {
    id: 'c13', group: CANCEL,
    title: 'preventDefault() в обработчике клика кнопки',
    expect: 'none',
    expectText: '<code>click</code> есть, <code>submit</code> нет',
    why: '<code>button.click()</code> создаёт такой же отменяемый клик, как мышь, поэтому <code>preventDefault()</code> в обработчике отменяет отправку. Со старым <code>dispatchEvent(new PointerEvent(\'click\'))</code> отмена не срабатывала.',
    markup: `<form id="c13-form"><x-input id="c13-amount" data-primary type="number" placeholder="Сумма"></x-input><button id="c13-pay">Оплатить</button></form>`,
    setup(card, { trace }) {
      const button = card.querySelector('#c13-pay');
      button.addEventListener('click', (e) => {
        e.preventDefault();
        trace(button, 'ours', 'обработчик потребителя на кнопке: <code>event.preventDefault()</code> (например, «нужно подтверждение»)');
      });
    },
  },
  {
    id: 'c14', group: CANCEL,
    title: 'Потребитель гасит Enter на keydown',
    expect: 'none',
    expectText: 'ничего не происходит, наш код даже не запускается',
    why: 'Например, в этом поле Enter добавляет тег. Обработчик на <code>&lt;form&gt;</code> отменяет keydown → браузер не присылает keypress → <code>handleKeypressEvent</code> не вызывается.',
    markup: `<form id="c14-form"><x-input id="c14-tags" data-primary placeholder="Тег + Enter"></x-input><x-button id="c14-save" type="submit">Сохранить</x-button></form>`,
    setup(card, { trace }) {
      const form = card.querySelector('#c14-form');
      form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        trace(form, 'ours', 'обработчик потребителя на форме: <code>preventDefault()</code> на <code>keydown</code> («Enter добавляет тег»)');
      });
    },
  },
  {
    id: 'c15', group: CANCEL,
    title: 'Потребитель гасит Enter на keypress',
    expect: 'none',
    expectText: 'наш обработчик отработал, но отправки нет',
    why: 'Обработчик на внутреннем input срабатывает раньше, чем обработчик на форме. Но отправка отложена через <code>setTimeout</code>, и к её моменту <code>defaultPrevented</code> уже <code>true</code>.',
    markup: `<form id="c15-form"><x-input id="c15-comment" data-primary placeholder="Комментарий"></x-input><x-button id="c15-send" type="submit">Отправить</x-button></form>`,
    setup(card, { trace }) {
      const form = card.querySelector('#c15-form');
      form.addEventListener('keypress', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        trace(form, 'ours', 'обработчик потребителя на форме: <code>preventDefault()</code> на <code>keypress</code>');
      });
    },
  },
  {
    id: 'c16', group: CANCEL,
    title: 'В форме есть незаполненное обязательное поле',
    expect: 'none',
    expectText: '<code>click</code> → <code>invalid</code> → <code>submit</code> нет',
    why: 'После <code>click()</code> проверку формы делает браузер: <code>invalid</code>, фокус переходит на поле с ошибкой, отправки нет. В нашем коде валидации нет и не нужно.',
    markup: `<form id="c16-form"><x-input id="c16-name" data-primary placeholder="Имя"></x-input><input id="c16-required" required placeholder="Обязательное (нативное)"><button id="c16-submit">Отправить</button></form>`,
  },
  {
    id: 'c17', group: CANCEL,
    title: 'FAST-обработчик keydown забыл return true',
    expect: 'none',
    expectText: 'ничего не происходит',
    why: 'Если обработчик события в FAST-шаблоне вернул не <code>true</code>, FAST сам вызывает <code>preventDefault()</code> → keypress не приходит. Поэтому <code>handleKeydownEvent</code> в Input на Enter возвращает <code>true</code>.',
    markup: `<form id="c17-form"><x-input-bad id="c17-bad" data-primary placeholder="Без return true"></x-input-bad><x-button id="c17-save" type="submit">Сохранить</x-button></form>`,
  },
  {
    id: 'c18', group: CANCEL,
    title: 'Пикер с открытым попапом (как YearPicker)',
    expect: 'none',
    expectText: 'первый Enter — выбор значения без отправки, второй Enter — отправка',
    why: 'Пока попап открыт, keydown выбирает значение, закрывает попап и возвращает <code>false</code> → FAST отменяет keydown → отправки нет. Попап закрыт → работает обычная цепочка. Вернуть попап — кнопка «Сбросить».',
    markup: `<form id="c18-form"><x-picker id="c18-year" data-primary></x-picker><x-button id="c18-save" type="submit">Сохранить</x-button></form>`,
    expectFor(e, card) { return card.querySelector('#c18-year').open ? 'none' : 'submit'; },
    reset(card) { const picker = card.querySelector('#c18-year'); picker.open = true; picker.input.value = ''; },
  },
  {
    id: 'c19', group: CANCEL,
    title: 'Поле вне формы',
    expect: 'none',
    expectText: 'отправки нет; при настоящем нажатии после изменения текста придёт <code>change</code>',
    why: '<code>elementInternals.form = null</code> → выходим на шаге 1. Нативный <code>change</code> по Enter при этом работает как обычно.',
    markup: `<div class="noform"><x-input id="c19-free" data-primary placeholder="Без формы"></x-input></div>`,
  },
  {
    id: 'c20', group: CANCEL,
    title: 'Shift+Enter и Ctrl+Enter',
    expect: 'submit',
    expectText: 'Shift+Enter → отправка; Ctrl/Alt/Meta+Enter → ничего',
    why: 'Спецификация модификаторы не описывает. Shift+Enter ведёт себя как обычный Enter, а сочетания с Ctrl/Alt/Meta отсекает фильтр клавиши — их можно отдать под хоткеи.',
    markup: `<form id="c20-form"><x-input id="c20-msg" data-primary placeholder="Сообщение"></x-input><x-button id="c20-send" type="submit">Отправить</x-button></form>`,
    expectFor(e) { return e.ctrlKey || e.altKey || e.metaKey ? 'none' : 'submit'; },
    sims: [
      { label: '▶ Симулировать Shift+Enter', init: { shiftKey: true } },
      { label: '▶ Симулировать Ctrl+Enter', init: { ctrlKey: true } },
    ],
  },
];
