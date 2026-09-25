// Small helper for building page elements. Text always goes in as plain text
// (textContent), never as HTML, so a note like "<b>" is shown, not run.

// el('button', { type: 'button', onclick: fn, class: 'x' }, 'Label', child, ...)
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === undefined || value === null || value === false) continue;
    if (name.startsWith('on')) node.addEventListener(name.slice(2), value);
    else if (name === 'class') node.className = value;
    else if (name === 'value') node.value = value;
    else if (value === true) node.setAttribute(name, '');
    else node.setAttribute(name, String(value));
  }
  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
  return node;
}

// Replaces everything inside `container` with `children`.
export function replaceChildren(container, ...children) {
  container.replaceChildren(...children.flat().filter((c) => c !== null && c !== undefined && c !== false));
}
