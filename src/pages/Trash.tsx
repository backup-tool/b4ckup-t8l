import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2, RotateCcw, HardDrive, Database, Clock, Monitor } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  getDeletedBackups,
  getDeletedMedia,
  getDeletedEntries,
  getDeletedDevices,
  restoreBackup,
  restoreMedia,
  restoreEntry,
  restoreDevice,
  permanentDeleteBackup,
  permanentDeleteMedia,
  permanentDeleteEntry,
  permanentDeleteDevice,
} from "@/lib/db";
import { STORAGE_TYPE_LABELS, CATEGORY_LABELS, DEVICE_TYPE_LABELS } from "@/lib/types";
import { formatDate, formatBytes } from "@/lib/format";
import { useAppStore } from "@/lib/store";

export function Trash() {
  const { t, i18n } = useTranslation();
  const refreshKey = useAppStore((s) => s.refreshKey);
  const triggerRefresh = useAppStore((s) => s.triggerRefresh);
  const [deletedBackups, setDeletedBackups] = useState<Array<Record<string, any>>>([]);
  const [deletedMedia, setDeletedMedia] = useState<Array<Record<string, any>>>([]);
  const [deletedEntries, setDeletedEntries] = useState<Array<Record<string, any>>>([]);
  const [deletedDevices, setDeletedDevices] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  const [permDeleteBackupId, setPermDeleteBackupId] = useState<number | null>(null);
  const [permDeleteMediaId, setPermDeleteMediaId] = useState<number | null>(null);
  const [permDeleteDeviceId, setPermDeleteDeviceId] = useState<number | null>(null);
  const [deleteAllConfirm, setDeleteAllConfirm] = useState(false);
  const [permDeleteEntryId, setPermDeleteEntryId] = useState<number | null>(null);

  useEffect(() => {
    loadAll();
  }, [refreshKey]);

  async function loadAll() {
    try {
      const [b, m, e, d] = await Promise.all([
        getDeletedBackups(),
        getDeletedMedia(),
        getDeletedEntries(),
        getDeletedDevices(),
      ]);
      setDeletedBackups(b);
      setDeletedMedia(m);
      setDeletedEntries(e);
      setDeletedDevices(d);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  async function handleRestoreBackup(id: number) {
    await restoreBackup(id);
    triggerRefresh();
    await loadAll();
  }

  async function handleRestoreMedia(id: number) {
    await restoreMedia(id);
    triggerRefresh();
    await loadAll();
  }

  async function handleRestoreEntry(id: number) {
    await restoreEntry(id);
    triggerRefresh();
    await loadAll();
  }

  async function handlePermDeleteBackup(id: number) {
    await permanentDeleteBackup(id);
    triggerRefresh();
    await loadAll();
  }

  async function handlePermDeleteMedia(id: number) {
    await permanentDeleteMedia(id);
    triggerRefresh();
    await loadAll();
  }

  async function handlePermDeleteEntry(id: number) {
    await permanentDeleteEntry(id);
    triggerRefresh();
    await loadAll();
  }

  async function handleRestoreDevice(id: number) {
    await restoreDevice(id);
    triggerRefresh();
    await loadAll();
  }

  async function handlePermDeleteDevice(id: number) {
    await permanentDeleteDevice(id);
    triggerRefresh();
    await loadAll();
  }

  async function handleRestoreAll() {
    for (const b of deletedBackups) await restoreBackup(b.id as number);
    for (const e of deletedEntries) await restoreEntry(e.id as number);
    for (const m of deletedMedia) await restoreMedia(m.id as number);
    for (const d of deletedDevices) await restoreDevice(d.id as number);
    triggerRefresh();
    await loadAll();
  }

  async function handleDeleteAll() {
    for (const e of deletedEntries) await permanentDeleteEntry(e.id as number);
    for (const b of deletedBackups) await permanentDeleteBackup(b.id as number);
    for (const m of deletedMedia) await permanentDeleteMedia(m.id as number);
    for (const d of deletedDevices) await permanentDeleteDevice(d.id as number);
    triggerRefresh();
    await loadAll();
  }

  const lang = i18n.language as "en" | "de" | "ru";
  const isEmpty =
    deletedBackups.length === 0 &&
    deletedMedia.length === 0 &&
    deletedEntries.length === 0 &&
    deletedDevices.length === 0;

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{t("trash.title")}</h1>
        {!isEmpty && (
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleRestoreAll}>
              <RotateCcw className="w-3.5 h-3.5" />
              {t("trash.restoreAll")}
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setDeleteAllConfirm(true)}>
              <Trash2 className="w-3.5 h-3.5" />
              {t("trash.deleteAll")}
            </Button>
          </div>
        )}
      </div>

      {isEmpty ? (
        <Card className="text-center py-12">
          <Trash2 className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("trash.empty")}</p>
        </Card>
      ) : (
        <>
          {/* Deleted Backups */}
          {deletedBackups.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" />
                    {t("backups.title")} ({deletedBackups.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {deletedBackups.map((b) => (
                  <div
                    key={b.id as number}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{b.name as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {b.device_name as string}
                        {b.category && (
                          <> &middot; {CATEGORY_LABELS[b.category as string]?.[lang] || b.category}</>
                        )}
                        {b.deleted_at && (
                          <> &middot; {t("trash.deletedAt")}: {formatDate(b.deleted_at as string)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestoreBackup(b.id as number)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("trash.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermDeleteBackupId(b.id as number)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("trash.deletePermanent")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Deleted Entries */}
          {deletedEntries.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    {t("backups.entries")} ({deletedEntries.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {deletedEntries.map((e) => (
                  <div
                    key={e.id as number}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {e.backup_name as string}
                        <span className="text-muted-foreground font-normal ml-2">
                          {formatDate(e.backup_date as string)}
                        </span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.media_name as string}
                        {" · "}
                        {formatBytes(e.size_bytes as number)}
                        {e.deleted_at && (
                          <> &middot; {t("trash.deletedAt")}: {formatDate(e.deleted_at as string)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestoreEntry(e.id as number)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("trash.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermDeleteEntryId(e.id as number)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("trash.deletePermanent")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Deleted Media */}
          {deletedMedia.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    {t("media.title")} ({deletedMedia.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {deletedMedia.map((m) => (
                  <div
                    key={m.id as number}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{m.name as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {STORAGE_TYPE_LABELS[m.type as string]?.[lang] || m.type}
                        {m.deleted_at && (
                          <> &middot; {t("trash.deletedAt")}: {formatDate(m.deleted_at as string)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestoreMedia(m.id as number)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("trash.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermDeleteMediaId(m.id as number)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("trash.deletePermanent")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Deleted Devices */}
          {deletedDevices.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4" />
                    {t("devices.title")} ({deletedDevices.length})
                  </div>
                </CardTitle>
              </CardHeader>
              <div className="space-y-2">
                {deletedDevices.map((d) => (
                  <div
                    key={d.id as number}
                    className="flex items-center justify-between py-3 px-4 rounded-lg border border-border"
                  >
                    <div>
                      <p className="text-sm font-medium">{d.name as string}</p>
                      <p className="text-xs text-muted-foreground">
                        {DEVICE_TYPE_LABELS[d.type as string]?.[lang] || d.type}
                        {d.model && <> &middot; {d.model as string}</>}
                        {d.deleted_at && (
                          <> &middot; {t("trash.deletedAt")}: {formatDate(d.deleted_at as string)}</>
                        )}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleRestoreDevice(d.id as number)}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("trash.restore")}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setPermDeleteDeviceId(d.id as number)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        {t("trash.deletePermanent")}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}

      {/* Permanent delete confirms */}
      <ConfirmDialog
        open={permDeleteBackupId !== null}
        onClose={() => setPermDeleteBackupId(null)}
        onConfirm={() => permDeleteBackupId && handlePermDeleteBackup(permDeleteBackupId)}
        title={t("trash.deletePermanent")}
        message={t("trash.confirmPermanentBackup")}
        confirmLabel={t("trash.deletePermanent")}
        cancelLabel={t("common.cancel")}
      />
      <ConfirmDialog
        open={permDeleteMediaId !== null}
        onClose={() => setPermDeleteMediaId(null)}
        onConfirm={() => permDeleteMediaId && handlePermDeleteMedia(permDeleteMediaId)}
        title={t("trash.deletePermanent")}
        message={t("trash.confirmPermanentMedia")}
        confirmLabel={t("trash.deletePermanent")}
        cancelLabel={t("common.cancel")}
      />
      <ConfirmDialog
        open={permDeleteEntryId !== null}
        onClose={() => setPermDeleteEntryId(null)}
        onConfirm={() => permDeleteEntryId && handlePermDeleteEntry(permDeleteEntryId)}
        title={t("trash.deletePermanent")}
        message={t("trash.confirmPermanent")}
        confirmLabel={t("trash.deletePermanent")}
        cancelLabel={t("common.cancel")}
      />
      <ConfirmDialog
        open={permDeleteDeviceId !== null}
        onClose={() => setPermDeleteDeviceId(null)}
        onConfirm={() => permDeleteDeviceId && handlePermDeleteDevice(permDeleteDeviceId)}
        title={t("trash.deletePermanent")}
        message={t("trash.confirmPermanent")}
        confirmLabel={t("trash.deletePermanent")}
        cancelLabel={t("common.cancel")}
      />
      <ConfirmDialog
        open={deleteAllConfirm}
        onClose={() => setDeleteAllConfirm(false)}
        onConfirm={handleDeleteAll}
        title={t("trash.deleteAll")}
        message={t("trash.confirmDeleteAll")}
        confirmLabel={t("trash.deleteAll")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
