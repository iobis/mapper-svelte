const GAP = 1;
const HEADER = 20;

const TABLEAU = ["#4e79a7", "#f28e2c", "#e15759", "#76b7b2", "#59a14f", "#edc949", "#af7aa1", "#ff9da7", "#9c755f", "#bab0ab"];

function byValue(a, b) {
  return b.value - a.value || a.name.localeCompare(b.name);
}

export function phylumClassTree(root) {
  const phyla = [];
  for (const phylum of root?.children || []) {
    if (!phylum?.name) continue;
    const classes = [];
    for (const child of phylum.children || []) {
      const value = Number(child?.value) || 0;
      if (value > 0 && child?.name) classes.push({ name: child.name, value });
    }
    if (!classes.length) {
      const value = Number(phylum.value) || 0;
      if (value > 0) classes.push({ name: phylum.name, value });
    }
    if (!classes.length) continue;
    classes.sort(byValue);
    phyla.push({
      name: phylum.name,
      value: classes.reduce((sum, item) => sum + item.value, 0),
      children: classes,
    });
  }
  phyla.sort(byValue);
  if (!phyla.length) return null;
  return { name: "Records", children: phyla };
}

function tileBinary(parent, x0, y0, x1, y1) {
  const nodes = parent.children;
  const n = nodes.length;
  const sums = new Array(n + 1);
  sums[0] = 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += nodes[i].value;
    sums[i + 1] = sum;
  }

  partition(0, n, parent.value, x0, y0, x1, y1);

  function partition(i, j, value, left, top, right, bottom) {
    if (i >= j - 1) {
      const node = nodes[i];
      node.x0 = left;
      node.y0 = top;
      node.x1 = right;
      node.y1 = bottom;
      return;
    }

    const valueOffset = sums[i];
    const valueTarget = value / 2 + valueOffset;
    let k = i + 1;
    let hi = j - 1;
    while (k < hi) {
      const mid = (k + hi) >>> 1;
      if (sums[mid] < valueTarget) k = mid + 1;
      else hi = mid;
    }
    if (valueTarget - sums[k - 1] < sums[k] - valueTarget && i + 1 < k) k -= 1;

    const valueLeft = sums[k] - valueOffset;
    const valueRight = value - valueLeft;
    if (right - left > bottom - top) {
      const xk = value ? (left * valueRight + right * valueLeft) / value : right;
      partition(i, k, valueLeft, left, top, xk, bottom);
      partition(k, j, valueRight, xk, top, right, bottom);
    } else {
      const yk = value ? (top * valueRight + bottom * valueLeft) / value : bottom;
      partition(i, k, valueLeft, left, top, right, yk);
      partition(k, j, valueRight, left, yk, right, bottom);
    }
  }
}

function sidePadding(depth) {
  return depth === 0 ? GAP : 0;
}

function topPadding(depth) {
  if (depth === 0) return GAP;
  if (depth === 1) return HEADER + GAP;
  return 0;
}

function position(node, depth, paddingStack) {
  let pad = paddingStack[depth] || 0;
  let x0 = node.x0 + pad;
  let y0 = node.y0 + pad;
  let x1 = node.x1 - pad;
  let y1 = node.y1 - pad;
  if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
  if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
  node.x0 = x0;
  node.y0 = y0;
  node.x1 = x1;
  node.y1 = y1;
  if (!node.children?.length) return;

  pad = paddingStack[depth + 1] = GAP / 2;
  x0 += sidePadding(depth) - pad;
  y0 += topPadding(depth) - pad;
  x1 -= sidePadding(depth) - pad;
  y1 -= sidePadding(depth) - pad;
  if (x1 < x0) x0 = x1 = (x0 + x1) / 2;
  if (y1 < y0) y0 = y1 = (y0 + y1) / 2;
  tileBinary(node, x0, y0, x1, y1);
  for (const child of node.children) position(child, depth + 1, paddingStack);
}

function roundNode(node) {
  node.x0 = Math.round(node.x0);
  node.y0 = Math.round(node.y0);
  node.x1 = Math.round(node.x1);
  node.y1 = Math.round(node.y1);
  for (const child of node.children || []) roundNode(child);
}

export function layoutTreemap(tree, width, height) {
  if (!tree?.children?.length || width < 40 || height < 40) return [];
  const root = {
    name: tree.name,
    value: tree.children.reduce((sum, item) => sum + item.value, 0),
    x0: 0,
    y0: 0,
    x1: width,
    y1: height,
    children: tree.children.map((phylum, index) => ({
      name: phylum.name,
      value: phylum.value,
      color: TABLEAU[index % TABLEAU.length],
      children: phylum.children.map((item) => ({ name: item.name, value: item.value })),
    })),
  };
  position(root, 0, [0]);
  roundNode(root);
  return root.children.map((phylum) => ({
    name: phylum.name,
    value: phylum.value,
    color: phylum.color,
    x: phylum.x0,
    y: phylum.y0,
    width: Math.max(0, phylum.x1 - phylum.x0),
    classes: (phylum.children || []).map((item) => ({
      name: item.name,
      value: item.value,
      phylum: phylum.name,
      x: item.x0,
      y: item.y0,
      width: Math.max(0, item.x1 - item.x0),
      height: Math.max(0, item.y1 - item.y0),
    })),
  }));
}
