let lastTime = 0;
let sameTimeCount = 0;

export function createId(name) {
  const now = Date.now();

  if (now === lastTime) {
    sameTimeCount += 1;
  } else {
    lastTime = now;
    sameTimeCount = 0;
  }

  return name + '-' + now + (sameTimeCount ? '-' + sameTimeCount : '');
}
