const BUTTON = 'B. Какую кнопку нажать';
const CANCEL = 'C. Отмена, валидация и особые случаи';

export default [
  {
    id: 'c11', group: BUTTON,
    title: 'Отмеченный checkbox стоит перед кнопкой',
    expect: 'submit',
    code: 'fu-isSubmitButton',
    expectText: '<code>click()</code> по кнопке, галочка остаётся',
    why: 'Поиск через <code>:default</code> нашёл бы и checkbox с атрибутом <code>checked</code>: Enter снимал бы галочку и не отправлял форму. <code>isSubmitButton</code> проверяет именно тип кнопки.',
    markup: `<form id="c11-form"><x-input id="c11-user" data-primary placeholder="Логин"></x-input><label><input type="checkbox" id="c11-remember" checked> запомнить меня</label><button id="c11-login">Войти</button></form>`,
    reset(card) { card.querySelector('#c11-remember').checked = true; },
  },
  {
    id: 'c12', group: BUTTON,
    title: 'Только x-button type="button" и x-button без type',
    expect: 'submit',
    code: 'fu-custom-button btn-type fu-mimic-count',
    expectText: '<code>form.requestSubmit()</code>, <code>submitter = null</code>',
    why: 'Кастомная кнопка считается submit-кнопкой, только если у неё <code>type === \'submit\'</code>. Здесь таких нет, поле одно — форма отправляется без клика.',
    markup: `<form id="c12-form"><x-input id="c12-tag" data-primary placeholder="Тег"></x-input><x-button id="c12-typebutton" type="button">type="button"</x-button><x-button id="c12-notype">без type</x-button></form>`,
  },
  {
    id: 'c13', group: CANCEL,
    title: 'preventDefault() в обработчике клика кнопки',
    expect: 'none',
    code: 'fu-mimic-disabled',
    expectText: '<code>click</code> есть, <code>submit</code> нет',
    why: '<code>button.click()</code> создаёт такой же отменяемый клик, как мышь, поэтому <code>preventDefault()</code> в обработчике отменяет отправку. С <code>dispatchEvent(new PointerEvent(\'click\'))</code> это не сработало бы.',
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
    title: 'Потребитель отменяет keydown на форме',
    expect: 'submit',
    code: 'tpl-keydown input-keydown-enter',
    expectText: 'форма <b>всё равно отправляется</b>',
    why: 'Обработчик на внутреннем input срабатывает раньше обработчика на <code>&lt;form&gt;</code>. Когда вызывается <code>preventDefault()</code>, форма уже отправлена. Это особенность обработки Enter в keydown. Как перехватить Enter до компонента — в кейсе 15.',
    markup: `<form id="c14-form"><x-input id="c14-tags" data-primary placeholder="Тег + Enter"></x-input><x-button id="c14-save" type="submit">Сохранить</x-button></form>`,
    setup(card, { trace }) {
      const form = card.querySelector('#c14-form');
      form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        trace(form, 'ours', 'обработчик потребителя на форме: <code>preventDefault()</code> на keydown — уже после отправки');
      });
    },
  },
  {
    id: 'c15', group: CANCEL,
    title: 'Потребитель перехватывает keydown в capture-фазе',
    expect: 'none',
    code: 'tpl-keydown input-keydown',
    expectText: 'ничего не происходит, эмуляция не запускается',
    why: 'Обработчик на форме с <code>{ capture: true }</code> срабатывает раньше внутреннего input. <code>stopPropagation()</code> не пускает событие дальше, и <code>handleKeydownEvent</code> не вызывается.',
    markup: `<form id="c15-form"><x-input id="c15-comment" data-primary placeholder="Комментарий"></x-input><x-button id="c15-send" type="submit">Отправить</x-button></form>`,
    setup(card, { trace }) {
      const form = card.querySelector('#c15-form');
      form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.stopPropagation();
        trace(form, 'ours', 'обработчик потребителя на форме в capture-фазе: <code>stopPropagation()</code> — до компонента событие не дойдёт');
      }, true);
    },
  },
  {
    id: 'c16', group: CANCEL,
    title: 'В форме есть незаполненное обязательное поле',
    expect: 'none',
    code: 'fu-mimic-disabled',
    expectText: '<code>click</code> → <code>invalid</code> → <code>submit</code> нет',
    why: 'После <code>click()</code> форму проверяет браузер: <code>invalid</code>, фокус переходит на поле с ошибкой, отправки нет. Валидация в нашем коде не нужна.',
    markup: `<form id="c16-form"><x-input id="c16-name" data-primary placeholder="Имя"></x-input><input id="c16-required" required placeholder="Обязательное (нативное)"><button id="c16-submit">Отправить</button></form>`,
  },
  {
    id: 'c17', group: CANCEL,
    title: 'Enter не обработан: keydown не отменяется',
    expect: 'none',
    code: 'input-keydown-enter fu-mimic-false tpl-change input-change',
    expectText: 'отправки нет; при настоящем нажатии после ввода текста придёт <code>change</code>',
    why: '<code>mimicFormSubmitBehavior</code> вернул <code>false</code>, значит <code>return !false</code> = <code>true</code>, и FAST не отменяет keydown. Браузер присылает keypress и, если текст менялся, нативный <code>change</code>. Впишите текст и нажмите Enter, затем сравните с кейсом 1.',
    markup: `<form id="c17-form"><x-input id="c17-first" data-primary placeholder="Впишите текст"></x-input><x-input id="c17-second" placeholder="Второе поле"></x-input></form>`,
  },
  {
    id: 'c18', group: CANCEL,
    title: 'YearPicker с открытым попапом',
    expect: 'none',
    code: 'picker-keydown',
    expectText: 'первый Enter выбирает значение без отправки, второй — отправляет форму',
    why: 'Пока попап открыт, <code>YearPicker.handleKeydownEvent</code> выбирает значение, закрывает попап и возвращает <code>false</code> — до <code>mimicFormSubmitBehavior</code> дело не доходит. Когда попап закрыт, вызывается <code>super.handleKeydownEvent</code>. Открыть попап снова — кнопкой «Сбросить».',
    markup: `<form id="c18-form"><x-year-picker id="c18-year" data-primary></x-year-picker><x-button id="c18-save" type="submit">Сохранить</x-button></form>`,
    expectFor(e, card) { return card.querySelector('#c18-year').open ? 'none' : 'submit'; },
    reset(card) { const picker = card.querySelector('#c18-year'); picker.open = true; picker.input.value = ''; },
  },
  {
    id: 'c19', group: CANCEL,
    title: 'Поле вне формы',
    expect: 'none',
    code: 'fu-mimic-form input-change',
    expectText: 'отправки нет; при настоящем нажатии после ввода текста придёт <code>change</code>',
    why: '<code>elementInternals.form = null</code>, функция возвращает <code>false</code>, keydown не отменяется, и нативный <code>change</code> по Enter приходит как обычно.',
    markup: `<div class="noform"><x-input id="c19-free" data-primary placeholder="Без формы"></x-input></div>`,
  },
  {
    id: 'c20', group: CANCEL,
    title: 'Shift+Enter и Ctrl+Enter',
    expect: 'submit',
    code: 'input-keydown-enter',
    expectText: 'оба сочетания отправляют форму',
    why: 'Проверяется только <code>$event.key === \'Enter\'</code>, модификаторы не учитываются, поэтому Shift+Enter и Ctrl+Enter работают как Enter.',
    markup: `<form id="c20-form"><x-input id="c20-msg" data-primary placeholder="Сообщение"></x-input><x-button id="c20-send" type="submit">Отправить</x-button></form>`,
    sims: [
      { label: '▶ Симулировать Shift+Enter', init: { shiftKey: true } },
      { label: '▶ Симулировать Ctrl+Enter', init: { ctrlKey: true } },
    ],
  },
];
