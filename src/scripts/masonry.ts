export function tileHeight(ratio: number, captioned: boolean): number {
  return 1 / ratio + (captioned ? 0.12 : 0);
}

export function placeTiles(heights: number[], columns: number): number[][] {
  const cols: number[][] = Array.from({ length: columns }, () => []);
  const filled = new Array<number>(columns).fill(0);
  heights.forEach((h, i) => {
    let c = 0;
    for (let k = 1; k < columns; k++) if (filled[k] < filled[c] - 1e-9) c = k;
    cols[c].push(i);
    filled[c] += h;
  });
  return cols;
}
