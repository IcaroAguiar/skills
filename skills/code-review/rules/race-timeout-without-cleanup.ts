async function withDeadline<T>(work: Promise<T>, ms: number) {
  // ruleid: race-timeout-without-cleanup
  return Promise.race([
    work,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), ms);
    }),
  ]);
}

async function short(work: Promise<Response>) {
  // ruleid: race-timeout-without-cleanup
  return Promise.race([work, new Promise<never>((_, reject) => setTimeout(reject, 500))]);
}

async function helper(work: Promise<Response>) {
  // ruleid: race-timeout-without-cleanup
  return Promise.race([work, rejectAfterTimeout(500)]);
}

async function racingWork(a: Promise<number>, b: Promise<number>) {
  // ok: race-timeout-without-cleanup
  return Promise.race([a, b]);
}
