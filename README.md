# Enter в FAST Input: эмуляция неявной отправки формы

Интерактивное демо: как FAST-компонент `Input` повторяет поведение браузера при нажатии Enter в форме (HTML Standard, §4.10.22.2 «Implicit submission»). Enter обрабатывается в `handleKeydownEvent`:

```ts
public handleKeydownEvent($event: KeyboardEvent): boolean {
  if ($event.key === 'Enter') {
    return !mimicFormEnterBehavior(this.elementInternals);
  }
  return true;
}
```

**Демо:** https://tonyxdddd.github.io/FAST-test/

## Как устроена страница

- **Слева** — полный код компонента: `input.template.ts`, `input.ts`, `form-utils.ts`, `button.ts`, `year-picker.ts`.
- **Справа** — цепочка по этапам и 20 живых кейсов с журналом шагов.
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
| `explain-cases-a.js`, `explain-cases-b.js` | описания кейсов и их связь с регионами кода |
| `explain-app.js` | сборка страницы |

`@microsoft/fast-element` 2.10.5 загружается с CDN jsdelivr, сборка не нужна.

## Локальный запуск

ES-модули не работают при открытии через `file://`, поэтому нужен любой статический сервер:

```bash
python -m http.server 8765
```

После запуска откройте http://localhost:8765/.
