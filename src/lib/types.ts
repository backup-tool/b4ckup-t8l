export interface StorageMedia {
  id: number;
  name: string;
  type: "nas" | "external_drive" | "cloud" | "local" | "other";
  total_capacity_gb: number | null;
  path: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Backup {
  id: number;
  name: string;
  device_name: string;
  category: "photos" | "documents" | "system" | "database" | "media" | "code" | "other";
  tags: string | null;
  notes: string | null;
  encryption_info: string | null;
  reminder_interval_days: number | null;
  watch_path: string | null;
  auto_detect: boolean;
  created_at: string;
  updated_at: string;
}

export interface BackupEntry {
  id: number;
  backup_id: number;
  storage_media_id: number;
  size_bytes: number;
  backup_date: string;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface BackupStorageLocation {
  id: number;
  backup_id: number;
  storage_media_id: number;
  path_on_media: string | null;
}

export type BackupStatus = "ok" | "warning" | "critical";

export interface BackupWithStatus extends Backup {
  status: BackupStatus;
  latest_entry: BackupEntry | null;
  storage_locations: (BackupStorageLocation & { media_name: string })[];
  total_media_count: number;
}

export interface StorageMediaWithUsage extends StorageMedia {
  used_gb: number;
  backup_count: number;
}

export const STORAGE_TYPES = [
  "nas", "external_drive", "internal_drive", "ssd", "usb_stick",
  "sd_card", "cloud", "tape", "optical", "network_share", "local", "other",
] as const;

export const BACKUP_CATEGORIES = [
  "photos", "videos", "music", "documents", "desktop",
  "system", "system_image", "vm", "database",
  "media", "code", "projects", "email",
  "contacts", "calendar", "messages",
  "games", "applications", "config", "other",
] as const;

type L = { en: string; de: string; ru: string };

export const STORAGE_TYPE_LABELS: Record<string, L> = {
  nas: { en: "NAS", de: "NAS", ru: "NAS" },
  external_drive: { en: "External HDD", de: "Externe Festplatte", ru: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 HDD" },
  internal_drive: { en: "Internal HDD", de: "Interne Festplatte", ru: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 HDD" },
  ssd: { en: "SSD", de: "SSD", ru: "SSD" },
  usb_stick: { en: "USB Stick", de: "USB-Stick", ru: "USB-\u043d\u0430\u043a\u043e\u043f\u0438\u0442\u0435\u043b\u044c" },
  sd_card: { en: "SD Card", de: "SD-Karte", ru: "SD-\u043a\u0430\u0440\u0442\u0430" },
  cloud: { en: "Cloud", de: "Cloud", ru: "\u041e\u0431\u043b\u0430\u043a\u043e" },
  tape: { en: "Tape", de: "Bandlaufwerk", ru: "\u041b\u0435\u043d\u0442\u0430" },
  optical: { en: "Optical (CD/DVD/BD)", de: "Optisch (CD/DVD/BD)", ru: "\u041e\u043f\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 (CD/DVD/BD)" },
  network_share: { en: "Network Share", de: "Netzwerkfreigabe", ru: "\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0440\u0435\u0441\u0443\u0440\u0441" },
  local: { en: "Local", de: "Lokal", ru: "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

export const CATEGORY_LABELS: Record<string, L> = {
  photos: { en: "Photos", de: "Fotos", ru: "\u0424\u043e\u0442\u043e" },
  videos: { en: "Videos", de: "Videos", ru: "\u0412\u0438\u0434\u0435\u043e" },
  music: { en: "Music", de: "Musik", ru: "\u041c\u0443\u0437\u044b\u043a\u0430" },
  documents: { en: "Documents", de: "Dokumente", ru: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b" },
  desktop: { en: "Desktop", de: "Desktop", ru: "\u0420\u0430\u0431\u043e\u0447\u0438\u0439 \u0441\u0442\u043e\u043b" },
  system: { en: "System", de: "System", ru: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430" },
  system_image: { en: "System Image", de: "System-Image", ru: "\u041e\u0431\u0440\u0430\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u044b" },
  vm: { en: "Virtual Machine", de: "Virtuelle Maschine", ru: "\u0412\u0438\u0440\u0442. \u043c\u0430\u0448\u0438\u043d\u0430" },
  database: { en: "Database", de: "Datenbank", ru: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445" },
  media: { en: "Media", de: "Medien", ru: "\u041c\u0435\u0434\u0438\u0430" },
  code: { en: "Code", de: "Code", ru: "\u041a\u043e\u0434" },
  projects: { en: "Projects", de: "Projekte", ru: "\u041f\u0440\u043e\u0435\u043a\u0442\u044b" },
  email: { en: "Email", de: "E-Mail", ru: "\u041f\u043e\u0447\u0442\u0430" },
  contacts: { en: "Contacts", de: "Kontakte", ru: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b" },
  calendar: { en: "Calendar", de: "Kalender", ru: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c" },
  messages: { en: "Messages", de: "Nachrichten", ru: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f" },
  games: { en: "Games", de: "Spiele", ru: "\u0418\u0433\u0440\u044b" },
  applications: { en: "Applications", de: "Anwendungen", ru: "\u041f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f" },
  config: { en: "Configuration", de: "Konfiguration", ru: "\u041a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044f" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

export const DEVICE_TYPES = [
  "desktop", "laptop", "phone", "tablet", "server", "nas",
  "cloud", "external_drive", "camera", "console", "smart_home", "other",
] as const;

export const DEVICE_TYPE_LABELS: Record<string, L> = {
  desktop: { en: "Desktop PC", de: "Desktop-PC", ru: "\u041d\u0430\u0441\u0442\u043e\u043b\u044c\u043d\u044b\u0439 \u041f\u041a" },
  laptop: { en: "Laptop", de: "Laptop", ru: "\u041d\u043e\u0443\u0442\u0431\u0443\u043a" },
  phone: { en: "Phone", de: "Smartphone", ru: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" },
  tablet: { en: "Tablet", de: "Tablet", ru: "\u041f\u043b\u0430\u043d\u0448\u0435\u0442" },
  server: { en: "Server", de: "Server", ru: "\u0421\u0435\u0440\u0432\u0435\u0440" },
  nas: { en: "NAS", de: "NAS", ru: "NAS" },
  cloud: { en: "Cloud Service", de: "Cloud-Dienst", ru: "\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0438\u0441" },
  external_drive: { en: "External Drive", de: "Externe Festplatte", ru: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0434\u0438\u0441\u043a" },
  camera: { en: "Camera", de: "Kamera", ru: "\u041a\u0430\u043c\u0435\u0440\u0430" },
  console: { en: "Console", de: "Konsole", ru: "\u041a\u043e\u043d\u0441\u043e\u043b\u044c" },
  smart_home: { en: "Smart Home", de: "Smart Home", ru: "\u0423\u043c\u043d\u044b\u0439 \u0434\u043e\u043c" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

export const SIZE_UNITS = [
  { value: "Bytes", label: "Bytes" },
  { value: "KB", label: "KB" },
  { value: "MB", label: "MB" },
  { value: "GB", label: "GB" },
  { value: "TB", label: "TB" },
  { value: "PB", label: "PB" },
] as const;

export const SIZE_MULTIPLIERS: Record<string, number> = {
  Bytes: 1,
  KB: 1024,
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
  PB: 1024 * 1024 * 1024 * 1024 * 1024,
};
