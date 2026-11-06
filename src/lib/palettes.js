import { config } from "./config.js";

export const STOPS = [1, 10, 100, 1000, 10000, 50000];
export const LEGEND_LABELS = ["1", "10", "100", "1k", "10k", "50k+"];
export const DEFAULT_OPACITY = 0.4;

export const SCHEMES = {
  hawaii: {
    label: "Hawaii",
    colors: ["#8c0862", "#c2456e", "#e08a5b", "#c9c35a", "#6db37a", "#2a6b7a"],
  },
  viridis: {
    label: "Viridis",
    colors: ["#440154", "#414487", "#2a788e", "#22a884", "#7ad151", "#fde725"],
  },
  inferno: {
    label: "Inferno",
    colors: ["#000004", "#420a68", "#932667", "#dd513a", "#fca50a", "#fcffa4"],
  },
  blues: {
    label: "Blues",
    colors: ["#eff3ff", "#c6dbef", "#9ecae1", "#6baed6", "#3182bd", "#08519c"],
  },
  greens: {
    label: "Greens",
    colors: ["#edf8e9", "#c7e9c0", "#a1d99b", "#74c476", "#31a354", "#006d2c"],
  },
  oranges: {
    label: "Oranges",
    colors: ["#feedde", "#fdd0a2", "#fdae6b", "#fd8d3c", "#e6550d", "#a63603"],
  },
  purples: {
    label: "Purples",
    colors: ["#f2f0f7", "#dadaeb", "#bcbddc", "#9e9ac8", "#756bb1", "#54278f"],
  },
  reds: {
    label: "Reds",
    colors: ["#fee5d9", "#fcbba1", "#fc9272", "#fb6a4a", "#de2d26", "#a50f15"],
  },
  greys: {
    label: "Greys",
    colors: ["#f7f7f7", "#d9d9d9", "#bdbdbd", "#969696", "#636363", "#252525"],
  },
};

export function schemeFor(id) {
  return SCHEMES[id] || SCHEMES.hawaii;
}

export function fillColorExpression(colors) {
  const expression = ["interpolate", ["linear"], ["coalesce", ["get", "doc_count"], 1]];
  for (let i = 0; i < STOPS.length; i++) {
    expression.push(STOPS[i], colors[i]);
  }
  return expression;
}

function parseHex(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function legendSwatch(hex, opacity, surface = config.mapSurface) {
  const [r, g, b] = parseHex(hex);
  const [br, bg, bb] = parseHex(surface);
  const mix = (c, base) => Math.round(c * opacity + base * (1 - opacity));
  return `rgb(${mix(r, br)}, ${mix(g, bg)}, ${mix(b, bb)})`;
}
