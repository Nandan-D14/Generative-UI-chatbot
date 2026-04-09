export function fromUnixish(value: number) {
  const timestamp = value > 1_000_000_000_000 ? value : value * 1000;
  return new Date(timestamp);
}
