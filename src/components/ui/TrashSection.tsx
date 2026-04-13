import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, RotateCcw } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";
import { formatDate } from "@/lib/format";

interface TrashItem {
  id: number;
  title: string;
  subtitle?: string;
  deleted_at?: string;
}

interface TrashSectionProps {
  items: TrashItem[];
  onRestore: (id: number) => void;
  onPermanentDelete: (id: number) => void;
  onRestoreAll: () => void;
  onDeleteAll: () => void;
  permanentDeleteMessage?: string;
}

export function TrashButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="relative p-2 rounded-lg hover:bg-muted transition-colors"
    >
      <Trash2 className="w-4 h-4 text-muted-foreground" />
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
          {count > 9 ? "9+" : count}
        </span>
      )}
    </button>
  );
}

export function TrashSection({
  items,
  onRestore,
  onPermanentDelete,
  onRestoreAll,
  onDeleteAll,
  permanentDeleteMessage,
}: TrashSectionProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [permDeleteId, setPermDeleteId] = useState<number | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);

  return (
    <>
      <TrashButton count={items.length} onClick={() => setOpen(true)} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`${t("trash.title")} (${items.length})`}
        className="max-w-lg"
      >
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">{t("trash.empty")}</p>
        ) : (
          <>
            <div className="flex justify-end gap-2 mb-3">
              <Button variant="secondary" size="sm" onClick={() => { onRestoreAll(); setOpen(false); }}>
                <RotateCcw className="w-3.5 h-3.5" />
                {t("trash.restoreAll")}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setDeleteAllConfirm(true)}>
                <Trash2 className="w-3.5 h-3.5" />
                {t("trash.deleteAll")}
              </Button>
            </div>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between py-2 px-3 rounded-lg border border-border"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{item.title}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {item.subtitle || ""}
                      {item.deleted_at && (
                        <>{item.subtitle ? " · " : ""}{formatDate(item.deleted_at)}</>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <Button size="sm" variant="secondary" onClick={() => { onRestore(item.id); }}>
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setPermDeleteId(item.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={permDeleteId !== null}
        onClose={() => setPermDeleteId(null)}
        onConfirm={() => {
          if (permDeleteId) onPermanentDelete(permDeleteId);
          setPermDeleteId(null);
        }}
        title={t("trash.deletePermanent")}
        message={permanentDeleteMessage || t("trash.confirmPermanent")}
        confirmLabel={t("trash.deletePermanent")}
        cancelLabel={t("common.cancel")}
      />

      <ConfirmDialog
        open={deleteAllConfirm}
        onClose={() => setDeleteAllConfirm(false)}
        onConfirm={() => {
          onDeleteAll();
          setDeleteAllConfirm(false);
          setOpen(false);
        }}
        title={t("trash.deleteAll")}
        message={t("trash.confirmDeleteAll")}
        confirmLabel={t("trash.deleteAll")}
        cancelLabel={t("common.cancel")}
      />
    </>
  );
}
