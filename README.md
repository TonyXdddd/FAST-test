# Enter в FAST Input: эмуляция неявной отправки формы

Интерактивное демо: как FAST-компонент `Input` повторяет поведение браузера при нажатии Enter в форме (HTML Standard, §4.10.22.2 «Implicit submission»). Enter обрабатывается в `handleKeydownEvent`:

```ts
public handleKeydownEvent($event: KeyboardEvent): boolean {
  if ($event.key === 'Enter') {
    return !mimicFormSubmitBehavior(this.elementInternals);
  }
  return true;
}
```

**Демо:** https://tonyxdddd.github.io/FAST-test/

## Кастомные компоненты

- **Кастомный элемент** определяется по дефису в имени тега. FAST-компоненты наследуются от `HTMLElement`, а в `form.elements`, кроме input и textarea, бывают нативные `button`, `select`, `fieldset` и `output`.
- **Поле или нет — решает свойство `type`.** Сначала проверяется первый Set (`submitBlockingElementTypes`, типы нативных полей). Если там нет — второй (`customSubmitBlockingElementTypes`, уникальные типы: `date-interval`, `time-interval`, `year`).
- **Не считаются** компоненты без `type` или с типом, которого нет ни в одном Set.
- **Кнопка отправки** — кастомный элемент с `type="submit"`.

## Как устроена страница

- **Слева** — полный код компонента: `input.template.ts`, `input.ts`, `form-utils.ts`, `button.ts`, `year-picker.ts`, `date-interval-picker.ts`.
- **Справа** — врезка про кастомные компоненты, цепочка по этапам и 24 живых кейса с журналом шагов.
- При наведении на этап, кейс или строку журнала слева подсвечивается код, который за это отвечает.

Кликните в поле и нажмите настоящий Enter. Кнопка «Симулировать» шлёт синтетический `keydown` (и `keypress`, если keydown не отменён). Нативного `change` при симуляции нет.

## Файлы

| Файл | Что делает |
|---|---|
| `index.html` | разметка: код слева, объяснение и кейсы справа |
| `explain.css` | стили, светлая и тёмная тема |
| `code/*.ts.txt` | код для левой панели; строки `//>имя` и `//<имя` размечают регионы подсветки и на странице не показываются |
| `code-view.js` | подсветка синтаксиса и подсветка регионов при наведении |
| `explain-impl.js` | работающая реализация (та же логика, что в `code/`) с журналом шагов |
| `explain-cases-a.js`, `explain-cases-b.js`, `explain-cases-c.js` | описания кейсов и их связь с регионами кода |
| `explain-app.js` | сборка страницы |

`@microsoft/fast-element` 2.10.5 загружается с CDN jsdelivr, сборка не нужна.

## Локальный запуск

ES-модули не работают при открытии через `file://`, поэтому нужен любой статический сервер:

```bash
python -m http.server 8765
```

После запуска откройте http://localhost:8765/.
