export function getRandomText(length: number) {
  return new Int8Array(length).reduce(p => p + String.fromCharCode(Math.min(Math.floor(Math.random() * 26) + 65, 90)), '');
}