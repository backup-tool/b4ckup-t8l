import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Pencil, Trash2, Monitor } from "lucide-react";
import { ViewToggle } from "@/components/ui/ViewToggle";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Input, Textarea, Label } from "@/components/ui/Input";
import { CustomSelect } from "@/components/ui/CustomSelect";
import { TrashSection } from "@/components/ui/TrashSection";
import {
  getDeviceWithBackupCount,
  getDeletedDevices,
  createDevice,
  updateDevice,
  softDeleteDevice,
  restoreDevice,
  permanentDeleteDevice,
} from "@/lib/db";
import { DEVICE_TYPES } from "@/lib/types";

export function Devices() {
  const { t } = useTranslation();
  const [devices, setDevices] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [deleted, setDeleted] = useState<Array<Record<string, any>>>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [editMode, setEditMode] = useState(false);
  const [sortField, setSortField] = useState("name");
  const [sortDir, setSortDir] = useState("asc");
  const [form, setForm] = useState({
    name: "",
    type: "laptop",
    os: "",
    model: "",
    serial_number: "",
    notes: "",
  });

  useEffect(() => {
    loadDevices();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "n") {
        e.preventDefault();
        openCreate();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  async function loadDevices() {
    try {
      const [active, trash] = await Promise.all([getDeviceWithBackupCount(), getDeletedDevices()]);
      setDevices(active);
      setDeleted(trash);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: "", type: "laptop", os: "", model: "", serial_number: "", notes: "" });
    setModalOpen(true);
  }

  function openEdit(d: Record<string, any>) {
    setEditing(d);
    setForm({
      name: (d.name as string) || "",
      type: (d.type as string) || "other",
      os: (d.os as string) || "",
      model: (d.model as string) || "",
      serial_number: (d.serial_number as string) || "",
      notes: (d.notes as string) || "",
    });
    setModalOpen(true);
  }

  async function handleSave() {
    if (editing) {
      await updateDevice(editing.id as number, {
        name: form.name,
        type: form.type,
        os: form.os || null,
        model: form.model || null,
        serial_number: form.serial_number || null,
        notes: form.notes || null,
      });
    } else {
      await createDevice(form.name, form.type);
      // Get the device we just created and update it with extra fields
      const all = await getDeviceWithBackupCount();
      const created = all.find((d) => d.name === form.name);
      if (created && (form.os || form.model || form.serial_number || form.notes)) {
        await updateDevice(created.id as number, {
          name: form.name,
          type: form.type,
          os: form.os || null,
          model: form.model || null,
          serial_number: form.serial_number || null,
          notes: form.notes || null,
        });
      }
    }
    setModalOpen(false);
    await loadDevices();
  }

  async function handleDelete(id: number) {
    await softDeleteDevice(id);
    await loadDevices();
  }


  const sorted = [...devices].sort((a, b) => {
    const key = sortField;
    const mult = sortDir === "desc" ? -1 : 1;
    if (key === "name") return mult * (a.name as string).localeCompare(b.name as string);
    if (key === "type") return mult * ((t(`deviceTypes.${a.type}`, { defaultValue: "" })).localeCompare(t(`deviceTypes.${b.type}`, { defaultValue: "" })));
    if (key === "backups") return mult * ((a.backup_count as number) - (b.backup_count as number));
    return 0;
  });

  if (loading) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">{t("devices.title")}</h1>
          <ViewToggle view={view} onViewChange={setView} editMode={editMode} onEditModeChange={setEditMode} />
          <CustomSelect
            className="w-32"
            value={sortField}
            onChange={setSortField}
            options={[
              { value: "name", label: t("devices.name") },
              { value: "type", label: t("devices.type") },
              { value: "backups", label: t("devices.backupCount") },
            ]}
          />
          <CustomSelect
            className="w-20"
            value={sortDir}
            onChange={setSortDir}
            options={[
              { value: "asc", label: "↑" },
              { value: "desc", label: "↓" },
            ]}
          />
        </div>
        <div className="flex items-center gap-2">
          {editMode && <TrashSection
            items={deleted.map((d) => ({
              id: d.id as number,
              title: d.name as string,
              subtitle: t(`deviceTypes.${d.type}`, { defaultValue: d.type as string }),
              deleted_at: d.deleted_at as string,
            }))}
            onRestore={async (id) => { await restoreDevice(id); await loadDevices(); }}
            onPermanentDelete={async (id) => { await permanentDeleteDevice(id); await loadDevices(); }}
            onRestoreAll={async () => { for (const d of deleted) await restoreDevice(d.id as number); await loadDevices(); }}
            onDeleteAll={async () => { for (const d of deleted) await permanentDeleteDevice(d.id as number); await loadDevices(); }}
            permanentDeleteMessage={t("trash.confirmPermanent")}
          />}
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4" />
            {t("devices.create")}
          </Button>
        </div>
      </div>

      {devices.length === 0 ? (
        <Card className="text-center py-12">
          <Monitor className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">{t("devices.noDevices")}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((d) => (
            <Card key={d.id as number}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Monitor className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-sm truncate">{d.name as string}</h3>
                    <p className="text-xs text-muted-foreground truncate">
                      {t(`deviceTypes.${d.type}`, { defaultValue: d.type as string })}
                    </p>
                  </div>
                </div>
                {editMode && <div className="flex gap-1">
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => setDeleteId(d.id as number)}
                    className="p-1 rounded hover:bg-muted transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                </div>}
              </div>

              <div className="space-y-1 text-xs text-muted-foreground mt-3">
                {d.os && (
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">{t("devices.os")}</span>
                    <span className="text-foreground truncate">{d.os as string}</span>
                  </div>
                )}
                {d.model && (
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">{t("devices.model")}</span>
                    <span className="text-foreground truncate">{d.model as string}</span>
                  </div>
                )}
                {d.serial_number && (
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">{t("devices.serialNumber")}</span>
                    <span className="text-foreground font-mono text-[10px] truncate">{d.serial_number as string}</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 border-t border-border mt-2">
                  <span>{t("devices.backupCount")}</span>
                  <span className="text-foreground font-medium">{d.backup_count as number}</span>
                </div>
              </div>

              {d.notes && (
                <p className="text-xs text-muted-foreground mt-2 pt-2 border-t border-border">
                  {d.notes as string}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSave}
        title={editing ? t("devices.edit") : t("devices.create")}
      >
        <div className="space-y-4">
          <div>
            <Label>{t("devices.name")}</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="MacBook Pro"
            />
          </div>
          <div>
            <Label>{t("devices.type")}</Label>
            <CustomSelect
              value={form.type}
              onChange={(val) => setForm({ ...form, type: val })}
              options={DEVICE_TYPES.map((type) => ({
                value: type,
                label: t(`deviceTypes.${type}`, { defaultValue: type }),
              }))}
            />
          </div>
          <div>
            <Label>{t("devices.os")}</Label>
            <Input
              value={form.os}
              onChange={(e) => setForm({ ...form, os: e.target.value })}
              placeholder="macOS 15, Windows 11, iOS 19..."
            />
          </div>
          <div>
            <Label>{t("devices.model")}</Label>
            <Input
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              placeholder="MacBook Pro 16' M4 Max"
            />
          </div>
          <div>
            <Label>{t("devices.serialNumber")}</Label>
            <Input
              value={form.serial_number}
              onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
              placeholder="C02X..."
            />
          </div>
          <div>
            <Label>{t("devices.notes")}</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>
              {t("devices.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {t("devices.save")}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={() => deleteId && handleDelete(deleteId)}
        title={t("trash.moveToTrash")}
        message={t("trash.confirmSoftDelete")}
        confirmLabel={t("trash.moveToTrash")}
        cancelLabel={t("common.cancel")}
      />
    </div>
  );
}
