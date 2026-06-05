import nodeAssert from "node:assert";

type TestFn = () => void | Promise<void>;

type TestCase = {
  name: string;
  fn: TestFn;
};

const queue: TestCase[] = [];
let passed = 0;
let failed = 0;

export function test(name: string, fn: TestFn): void {
  queue.push({ name, fn });
}

function formatError(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export const assert = {
  ok(cond: unknown, msg: string): void {
    nodeAssert.ok(cond, msg);
  },

  equal<T>(a: T, b: T, msg: string): void {
    nodeAssert.strictEqual(a, b, msg);
  },

  deepIncludes(
    obj: object,
    keys: string[],
    msg: string,
  ): void {
    const record = obj as Record<string, unknown>;
    for (const key of keys) {
      nodeAssert.ok(
        Object.prototype.hasOwnProperty.call(record, key) &&
          record[key] !== undefined,
        `${msg}: missing or undefined key "${key}"`,
      );
    }
  },

  throws(fn: () => unknown, msg: string): void {
    nodeAssert.throws(fn, msg);
  },

  notThrows(fn: () => unknown, msg: string): void {
    nodeAssert.doesNotThrow(fn, msg);
  },

  inRange(n: number, lo: number, hi: number, msg: string): void {
    nodeAssert.ok(n >= lo && n <= hi, `${msg}: ${n} not in [${lo}, ${hi}]`);
  },
};

export async function run(): Promise<void> {
  for (const { name, fn } of queue) {
    try {
      await fn();
      passed += 1;
      console.log(`✓ ${name}`);
    } catch (err) {
      failed += 1;
      console.log(`✗ ${name}: ${formatError(err)}`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
  process.exit(0);
}
