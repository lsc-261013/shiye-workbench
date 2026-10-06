import { clone, type Board } from "../types";

// Serialize writes and only report the latest revision's result.
export class DraftSaver {
  revision = 0;
  private queue = Promise.resolve();
  constructor(
    private write: (board: Board) => Promise<void>,
    private status: (state: string) => void,
    private failed: () => void,
    private saved: () => void,
  ) {}
  changed() {
    this.revision++;
    this.status("保存中…");
  }
  async save(board: Board) {
    const snapshot = clone(board),
      revision = this.revision;
    this.status("保存中…");
    this.queue = this.queue.then(async () => {
      try {
        await this.write(snapshot);
        if (revision === this.revision) {
          this.status("已保存到本机");
          this.saved();
        }
      } catch {
        if (revision === this.revision) {
          this.status("保存失败");
          this.failed();
        }
      }
    });
    await this.queue;
  }
}
