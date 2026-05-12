/* Tests for pure utility functions from main.js */

function hexToRgb(hex) {
  if (!hex) return [160, 120, 160];
  var rgb = hex.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3]];
  if (hex.length < 7) return [160, 120, 160];
  return [parseInt(hex.slice(1,3),16), parseInt(hex.slice(3,5),16), parseInt(hex.slice(5,7),16)];
}
function darken(rgb, p)  { return [rgb[0]*p, rgb[1]*p, rgb[2]*p]; }
function lighten(rgb, m) { return [rgb[0]+(255-rgb[0])*m, rgb[1]+(255-rgb[1])*m, rgb[2]+(255-rgb[2])*m]; }
function lum(rgb) {
  return rgb.map(function(v) { v/=255; return v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4); })
    .reduce(function(s,v,i) { return s+v*[.2126,.7152,.0722][i]; }, 0);
}
function contrast(a, b) { var l1=lum(a), l2=lum(b); return (Math.max(l1,l2)+.05)/(Math.min(l1,l2)+.05); }
function todayKey()  { return new Date().toISOString().slice(0, 10); }
function monthKey()  { return new Date().toISOString().slice(0, 7); }

describe('hexToRgb', () => {
  test('parses a standard hex color', () => {
    expect(hexToRgb('#ffffff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#2D1B4E')).toEqual([45, 27, 78]);
  });

  test('parses an rgb() string', () => {
    expect(hexToRgb('rgb(100, 150, 200)')).toEqual([100, 150, 200]);
  });

  test('returns fallback for null/undefined/short strings', () => {
    expect(hexToRgb(null)).toEqual([160, 120, 160]);
    expect(hexToRgb('')).toEqual([160, 120, 160]);
    expect(hexToRgb('#abc')).toEqual([160, 120, 160]);
  });
});

describe('darken', () => {
  test('scales RGB channels by factor', () => {
    expect(darken([200, 100, 50], 0.5)).toEqual([100, 50, 25]);
  });

  test('with factor 1 returns same values', () => {
    expect(darken([255, 128, 64], 1)).toEqual([255, 128, 64]);
  });

  test('with factor 0 returns black', () => {
    expect(darken([200, 200, 200], 0)).toEqual([0, 0, 0]);
  });
});

describe('lighten', () => {
  test('moves channels toward 255', () => {
    var result = lighten([0, 0, 0], 0.5);
    expect(result).toEqual([127.5, 127.5, 127.5]);
  });

  test('with factor 1 returns white', () => {
    var result = lighten([0, 0, 0], 1);
    expect(result).toEqual([255, 255, 255]);
  });

  test('with factor 0 returns original', () => {
    var result = lighten([100, 150, 200], 0);
    expect(result).toEqual([100, 150, 200]);
  });
});

describe('contrast', () => {
  test('white on black has maximum contrast (~21)', () => {
    var ratio = contrast([255, 255, 255], [0, 0, 0]);
    expect(ratio).toBeCloseTo(21, 0);
  });

  test('identical colors have contrast ratio of 1', () => {
    var ratio = contrast([128, 128, 128], [128, 128, 128]);
    expect(ratio).toBeCloseTo(1, 1);
  });

  test('returns a value >= 1 for any two colors', () => {
    expect(contrast([200, 50, 100], [10, 180, 90])).toBeGreaterThanOrEqual(1);
  });
});

describe('todayKey', () => {
  test('returns a string in YYYY-MM-DD format', () => {
    var key = todayKey();
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test('matches current date', () => {
    var today = new Date().toISOString().slice(0, 10);
    expect(todayKey()).toBe(today);
  });
});

describe('monthKey', () => {
  test('returns a string in YYYY-MM format', () => {
    var key = monthKey();
    expect(key).toMatch(/^\d{4}-\d{2}$/);
  });

  test('is a prefix of todayKey', () => {
    expect(todayKey().startsWith(monthKey())).toBe(true);
  });
});
