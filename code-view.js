// Левая панель: код компонента с подсветкой синтаксиса и подсветкой регионов при наведении
const FILES = ['input.template.ts', 'input.ts', 'form-utils.ts', 'button.ts', 'year-picker.ts', 'date-interval-picker.ts'];

const KEYWORDS = new Set([
  'import', 'from', 'export', 'const', 'let', 'type', 'interface', 'class', 'extends', 'implements', 'function',
  'return', 'if', 'static', 'public', 'readonly', 'get', 'new', 'this', 'super', 'true', 'false', 'null', 'as',
  'instanceof', 'void', 'boolean', 'string', 'number',
]);

function tokenize(src) {
  const out = [];
  let i = 0;
  const push = (t, v) => { if (v) out.push({ t, v }); };

  function template() {
    let start = i;
    i++; // открывающая `
    while (i < src.length) {
      if (src[i] === '\\') { i += 2; continue; }
      if (src[i] === '`') { i++; break; }
      if (src[i] === '$' && src[i + 1] === '{') {
        push('tpl', src.slice(start, i));
        push('p', '${');
        i += 2;
        code(true);
        push('p', '}');
        i++;
        start = i;
        continue;
      }
      i++;
    }
    push('tpl', src.slice(start, i));
  }

  function code(insideTemplate) {
    let depth = 0;
    while (i < src.length) {
      const ch = src[i];
      if (insideTemplate && ch === '}' && depth === 0) return;
      if (ch === '{') depth++;
      if (ch === '}') depth--;
      const rest = src.slice(i);
      let m;
      if ((m = /^\/\*[\s\S]*?\*\//.exec(rest)) || (m = /^\/\/[^\n]*/.exec(rest))) { push('com', m[0]); i += m[0].length; continue; }
      if (ch === '`') { template(); continue; }
      if ((m = /^'(?:\\.|[^'\\\n])*'/.exec(rest))) { push('str', m[0]); i += m[0].length; continue; }
      if ((m = /^@[A-Za-z]+/.exec(rest))) { push('dec', m[0]); i += m[0].length; continue; }
      if ((m = /^[A-Za-z_$][\w$]*/.exec(rest))) {
        const w = m[0];
        const kind = KEYWORDS.has(w) ? 'kw' : /^[A-Z]/.test(w) ? 'type' : src[i + w.length] === '(' ? 'fn' : 'id';
        push(kind, w);
        i += w.length;
        continue;
      }
      if ((m = /^\d+/.exec(rest))) { push('num', m[0]); i += m[0].length; continue; }
      push('p', ch);
      i++;
    }
  }

  code(false);
  return out;
}

const lines = []; // { el, regions }

function renderFile(name, text, container) {
  const visible = [];
  const regionsByLine = [];
  const open = [];
  for (const raw of text.replace(/\r/g, '').replace(/\n$/, '').split('\n')) {
    const marker = /^\s*\/\/([><])([\w-]+)\s*$/.exec(raw);
    if (marker) {
      if (marker[1] === '>') open.push(marker[2]);
      else open.splice(open.lastIndexOf(marker[2]), 1);
      continue;
    }
    visible.push(raw);
    regionsByLine.push([...open]);
  }

  const section = document.createElement('section');
  section.className = 'code-file';
  section.innerHTML = '<div class="code-file-name"></div><div class="code-lines"></div>';
  section.querySelector('.code-file-name').textContent = name;
  const box = section.querySelector('.code-lines');

  let lineIndex = 0;
  let current = null;
  const newLine = () => {
    const el = document.createElement('div');
    el.className = 'cl';
    el.innerHTML = `<span class="cn">${lineIndex + 1}</span><span class="cc"></span>`;
    box.append(el);
    lines.push({ el, regions: regionsByLine[lineIndex] ?? [] });
    current = el.querySelector('.cc');
    lineIndex++;
  };
  newLine();
  for (const token of tokenize(visible.join('\n'))) {
    token.v.split('\n').forEach((part, index) => {
      if (index > 0) newLine();
      if (!part) return;
      const span = document.createElement('span');
      if (token.t !== 'p' && token.t !== 'id') span.className = `tk-${token.t}`;
      span.textContent = part;
      current.append(span);
    });
  }
  container.append(section);
}

export async function renderCode(container) {
  const texts = await Promise.all(FILES.map((f) => fetch(`code/${f}.txt`).then((r) => r.text())));
  FILES.forEach((f, index) => renderFile(f, texts[index], container));
}

export function highlight(regions) {
  const wanted = new Set(regions);
  const hit = [];
  for (const line of lines) {
    const on = line.regions.some((r) => wanted.has(r));
    line.el.classList.toggle('hl', on);
    if (on) hit.push(line.el);
  }
  if (!hit.length) return;

  const pane = document.getElementById('code-pane');
  const header = 36 + 30; // подсказка + имя файла
  const top = hit[0].offsetTop;
  const bottom = hit[hit.length - 1].offsetTop + hit[hit.length - 1].offsetHeight;
  const viewTop = pane.scrollTop + header;
  const viewBottom = pane.scrollTop + pane.clientHeight;
  if (top >= viewTop && bottom <= viewBottom) return;
  const blockHeight = bottom - top;
  const target = blockHeight < pane.clientHeight - header
    ? top - header - (pane.clientHeight - header - blockHeight) / 2
    : top - header - 8;
  pane.scrollTo({ top: Math.max(0, target), behavior: 'smooth' });
}

export function clearHighlight() {
  for (const line of lines) line.el.classList.remove('hl');
}

export function bindHover(root) {
  let current = null;
  root.addEventListener('mouseover', (e) => {
    const el = e.target.closest('[data-code]');
    if (el === current) return;
    current = el;
    if (el && el.dataset.code.trim()) highlight(el.dataset.code.trim().split(/\s+/));
    else clearHighlight();
  });
  root.addEventListener('mouseleave', () => {
    current = null;
    clearHighlight();
  });
}
