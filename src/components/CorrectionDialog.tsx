import { X } from "lucide-react";
import type { CorrectionDraft } from "../lib/types";

export function CorrectionDialog({
  draft,
  isWriting,
  onCancel,
  onContentChange,
  onConfirm,
}: {
  draft: CorrectionDraft;
  isWriting: boolean;
  onCancel: () => void;
  onContentChange: (content: string) => void;
  onConfirm: () => void;
}) {
  return (
    <div className="dialog-backdrop">
      <section className="dialog">
        <header>
          <div>
            <p className="eyebrow">Safe write preview</p>
            <h2>Correction note</h2>
          </div>
          <button className="icon-button" onClick={onCancel} type="button">
            <X size={18} />
          </button>
        </header>

        <label>
          Target path
          <input readOnly value={draft.targetPath} />
        </label>

        <label>
          Content
          <textarea
            onChange={(event) => onContentChange(event.target.value)}
            rows={10}
            value={draft.content}
          />
        </label>

        <footer>
          <button className="secondary-button" onClick={onCancel} type="button">
            Cancel
          </button>
          <button className="primary-button" disabled={isWriting} onClick={onConfirm} type="button">
            {isWriting ? "Writing..." : "Write correction note"}
          </button>
        </footer>
      </section>
    </div>
  );
}
