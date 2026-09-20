import { clone } from "../types";
export class History<T> {
  past: T[] = [];
  future: T[] = [];
  push(state: T) {
    this.past.push(clone(state));
    if (this.past.length > 30) this.past.shift();
    this.future = [];
  }
  undo(current: T) {
    const prev = this.past.pop();
    if (!prev) return null;
    this.future.push(clone(current));
    return clone(prev);
  }
  redo(current: T) {
    const next = this.future.pop();
    if (!next) return null;
    this.past.push(clone(current));
    return clone(next);
  }
  clear() {
    this.past = [];
    this.future = [];
  }
}
