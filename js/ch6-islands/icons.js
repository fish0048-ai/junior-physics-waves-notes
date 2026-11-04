const svg = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${body}</svg>`;

const STAR_PATH = "M12 2.8l2.8 5.9 6.4.8-4.7 4.4 1.2 6.4L12 17.2l-5.7 3.1 1.2-6.4-4.7-4.4 6.4-.8z";

export const ICONS = {
  elements: svg('<path d="M7 4h10l4 5-9 11L3 9z"/><path d="M3 9h18M10 4 8.5 9 12 20l3.5-11L14 4"/>'),
  periodic: svg(
    [
      [2.5, 3.5], [18.5, 3.5],
      [2.5, 9.5], [6.5, 9.5], [14.5, 9.5], [18.5, 9.5],
      [2.5, 15.5], [6.5, 15.5], [10.5, 15.5], [14.5, 15.5], [18.5, 15.5],
    ]
      .map(([x, y]) => `<rect x="${x}" y="${y}" width="3" height="3" rx=".6"/>`)
      .join("")
  ),
  atom: svg(
    '<circle cx="12" cy="12" r="1.6" fill="currentColor"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(60 12 12)"/><ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(120 12 12)"/>'
  ),
  decompose: svg('<path d="M9 3h6M10 3v5.5L4.5 18.2A2 2 0 0 0 6.3 21h11.4a2 2 0 0 0 1.8-2.8L14 8.5V3"/><path d="m12.5 11-2 3.5h3l-2 3.5"/>'),
  molecule: svg('<circle cx="12" cy="8" r="3.2"/><circle cx="5.5" cy="17" r="2.5"/><circle cx="18.5" cy="17" r="2.5"/><path d="m10.2 10.6-3 4.4M13.8 10.6l3 4.4"/>'),
  classify: svg('<path d="M3 5h18l-7 8.5V19l-4 2v-7.5z"/>'),
};

export const UI = {
  back: svg('<path d="M15 18l-6-6 6-6"/>'),
  globe: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>'),
  soundOn: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>'),
  soundOff: svg('<path d="M4 9v6h4l5 4V5L8 9z"/><path d="m17 9 5 6M22 9l-5 6"/>'),
  help: svg('<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.7"/><path d="M12 17h.01"/>'),
  close: svg('<path d="M6 6l12 12M18 6 6 18"/>'),
  arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  book: svg('<path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3z"/><path d="M5 17a3 3 0 0 1 3-3h11"/>'),
  check: svg('<path d="m5 12 4.5 4.5L19 7"/>'),
  drag: svg('<path d="M12 3v18M3 12h18M12 3 9.5 5.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5"/>'),
  tap: svg('<path d="M9 11V5.5a1.5 1.5 0 0 1 3 0V10"/><path d="M12 9.5a1.5 1.5 0 0 1 3 0V11"/><path d="M15 10.5a1.5 1.5 0 0 1 3 0V15a6 6 0 0 1-6 6h-.5a6 6 0 0 1-5-2.7L4 15a1.5 1.5 0 0 1 2.5-1.6L9 16"/>'),
  star: `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${STAR_PATH}"/></svg>`,
  starOutline: svg(`<path d="${STAR_PATH}"/>`),
};
