const CUSTOM = 'D. Кастомные компоненты: type из двух Set';

export default [
  {
    id: 'c21', group: CUSTOM,
    title: 'x-input type="date" + x-date-interval, кнопок нет',
    expect: 'none',
    code: 'fu-custom-check fu-types fu-custom-types input-type interval-type',
    expectText: 'ничего не происходит: в форме два текстовых поля',
    why: 'Оба элемента кастомные. У <code>x-input</code> <code>type="date"</code> есть в первом Set, у <code>x-date-interval</code> тип <code>date-interval</code> — во втором, поэтому считаются оба. Без второго Set поле было бы одно, и форма бы отправилась.',
    markup: `<form id="c21-form"><x-input id="c21-date" type="date"></x-input><x-date-interval id="c21-interval" data-primary></x-date-interval></form>`,
  },
  {
    id: 'c22', group: CUSTOM,
    title: 'Наше поле + кастомный компонент с другим type',
    expect: 'submit',
    code: 'fu-custom-check fu-custom',
    expectText: '<code>form.requestSubmit()</code>: считается только поле',
    why: '<code>x-rating</code> — кастомный элемент с <code>type="stars"</code>. Такого типа нет ни в одном Set, поэтому он не считается. Так же не считаются компоненты без <code>type</code>.',
    markup: `<form id="c22-form"><x-input id="c22-review" data-primary placeholder="Отзыв"></x-input><x-rating id="c22-rating" type="stars"></x-rating></form>`,
  },
  {
    id: 'c23', group: CUSTOM,
    title: 'Один x-date-interval, кнопок нет',
    expect: 'submit',
    code: 'fu-custom-types interval-type fu-mimic-count',
    expectText: '<code>form.requestSubmit()</code>: интервал считается одним полем',
    why: 'Внутри <code>x-date-interval</code> два поля (с и по), но в <code>form.elements</code> это один элемент, поэтому он даёт одно поле. Если нужна полная аналогия с двумя нативными date-полями, такой тип придётся считать за два.',
    markup: `<form id="c23-form"><x-date-interval id="c23-interval" data-primary></x-date-interval></form>`,
  },
  {
    id: 'c24', group: CUSTOM,
    title: 'Рядом нативные fieldset, output и button type="button"',
    expect: 'submit',
    code: 'fu-custom fu-isSubmitBlocking',
    expectText: '<code>form.requestSubmit()</code>: считается только поле',
    why: 'Эти элементы тоже есть в <code>form.elements</code> и не являются ни input, ни textarea, но и кастомными они не являются: <code>customElements.get()</code> для их тегов возвращает <code>undefined</code>. Поэтому признак «не input и не textarea» ненадёжен, и кастомность проверяется через реестр.',
    markup: `<form id="c24-form"><x-input id="c24-name" data-primary placeholder="Имя"></x-input><fieldset id="c24-group"><legend>группа</legend></fieldset><output id="c24-total">42</output><button type="button" id="c24-action">Действие</button></form>`,
  },
];
