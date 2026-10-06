import { describe, it, expect } from "vitest";
import { DraftSaver } from "../src/lib/persistence";
import { blank } from "../src/lib/data";
import { isTextInteraction } from "../src/lib/keyboard";

function deferred() {
  let resolve!: () => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
describe("latest draft persistence", () => {
  it("serializes rapid edits and does not claim an older snapshot is saved", async () => {
    const states: string[] = [],
      writes: string[] = [],
      first = deferred();
    let calls = 0;
    const saver = new DraftSaver(
      async (b) => {
        writes.push(b.title);
        if (++calls === 1) await first.promise;
      },
      (s) => states.push(s),
      () => {},
      () => {},
    );
    const a = blank();
    a.title = "第一版";
    saver.changed();
    const savingA = saver.save(a);
    await Promise.resolve();
    a.title = "第二版";
    saver.changed();
    const savingB = saver.save(a);
    expect(writes).toEqual(["第一版"]);
    expect(states.at(-1)).toBe("保存中…");
    first.resolve();
    await Promise.all([savingA, savingB]);
    expect(writes).toEqual(["第一版", "第二版"]);
    expect(states.filter((s) => s === "已保存到本机")).toHaveLength(1);
  });
  it("keeps a newer edit pending when an obsolete write fails", async () => {
    const first = deferred(),
      states: string[] = [];
    let failures = 0,
      count = 0;
    const saver = new DraftSaver(
      async () => {
        if (++count === 1) await first.promise;
      },
      (s) => states.push(s),
      () => failures++,
      () => {},
    );
    saver.changed();
    const one = saver.save(blank());
    await Promise.resolve();
    saver.changed();
    const two = saver.save(blank());
    first.reject(Error("old write failed"));
    await Promise.all([one, two]);
    expect(failures).toBe(0);
    expect(states.at(-1)).toBe("已保存到本机");
  });
  it("reports the current write failure and supports retry without losing content", async () => {
    let fail = true,
      failures = 0,
      state = "";
    const saver = new DraftSaver(
      async () => {
        if (fail) throw Error("quota");
      },
      (s) => (state = s),
      () => failures++,
      () => {},
    );
    saver.changed();
    await saver.save(blank());
    expect(state).toBe("保存失败");
    expect(failures).toBe(1);
    fail = false;
    await saver.save(blank());
    expect(state).toBe("已保存到本机");
  });
});
describe("text input shortcuts", () => {
  it("protects composing, text inputs and contenteditable without swallowing board keys", () => {
    expect(isTextInteraction(null, true)).toBe(true);
    for (const matched of [true, false]) {
      const target = {
        closest: () => (matched ? {} : null),
      } as unknown as EventTarget;
      expect(isTextInteraction(target)).toBe(matched);
    }
    expect(isTextInteraction(null)).toBe(false);
  });
});
