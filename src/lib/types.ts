export type FolderEntityType = "backup" | "media" | "device";
export type FolderViewMode = "flat" | "folder" | "expanded";

export interface Folder {
  id: number;
  name: string;
  entity_type: FolderEntityType;
  sort_order: number;
  collapsed: boolean;
  deleted_at: string | null;
  created_at: string;
}

export interface StorageMedia {
  id: number;
  name: string;
  type: "nas" | "external_drive" | "cloud" | "local" | "other";
  total_capacity_gb: number | null;
  path: string | null;
  notes: string | null;
  folder_id: number | null;
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
  folder_id: number | null;
  backup_mode: "manual" | "automatic";
  schedule_frequency: "daily" | "weekly" | "monthly" | "yearly" | "custom" | null;
  schedule_time: string | null;
  schedule_weekday: number | null;
  schedule_month_day: number | null;
  schedule_custom_interval_days: number | null;
  schedule_note: string | null;
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
  is_available: boolean;
  created_at: string;
}

export const RETENTION_TYPES = ["all", "count", "days", "months"] as const;

export interface BackupStorageLocation {
  id: number;
  backup_id: number;
  storage_media_id: number;
  path_on_media: string | null;
}

export type BackupStatus = "ok" | "warning" | "critical" | "paused";

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
  // Local drives
  "internal_drive", "ssd", "nvme", "external_drive",
  // Portable
  "usb_stick", "sd_card", "optical",
  // Devices
  "laptop", "desktop_pc", "phone", "tablet", "server", "camera", "console",
  // Network
  "nas", "network_share", "ftp", "webdav",
  // Cloud
  "cloud", "object_storage",
  // Archival
  "tape", "raid",
  // Other
  "local", "other",
] as const;

export const BACKUP_CATEGORIES = [
  // Documents & Files
  "documents", "photos", "videos", "music", "media", "desktop",
  // Communication
  "email", "messages", "contacts", "calendar",
  // Development & IT
  "code", "projects", "database", "config", "logs", "credentials",
  // System
  "system", "system_image", "vm", "container", "applications",
  // Cloud & Services
  "cloud_data", "social_media", "bookmarks", "passwords",
  // Personal
  "finance", "health", "notes", "education",
  // Entertainment
  "games",
  // Other
  "other",
] as const;

type L = { en: string; de: string; ru: string };

export const STORAGE_TYPE_LABELS: Record<string, L> = {
  internal_drive: { en: "Internal HDD", de: "Interne Festplatte", ru: "\u0412\u043d\u0443\u0442\u0440\u0435\u043d\u043d\u0438\u0439 HDD" },
  ssd: { en: "SSD", de: "SSD", ru: "SSD" },
  nvme: { en: "NVMe", de: "NVMe", ru: "NVMe" },
  external_drive: { en: "External HDD", de: "Externe Festplatte", ru: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 HDD" },
  usb_stick: { en: "USB Stick", de: "USB-Stick", ru: "USB-\u043d\u0430\u043a\u043e\u043f\u0438\u0442\u0435\u043b\u044c" },
  sd_card: { en: "SD Card", de: "SD-Karte", ru: "SD-\u043a\u0430\u0440\u0442\u0430" },
  optical: { en: "Optical (CD/DVD/BD)", de: "Optisch (CD/DVD/BD)", ru: "\u041e\u043f\u0442\u0438\u0447\u0435\u0441\u043a\u0438\u0439 (CD/DVD/BD)" },
  laptop: { en: "Laptop", de: "Laptop", ru: "\u041d\u043e\u0443\u0442\u0431\u0443\u043a" },
  desktop_pc: { en: "Desktop PC", de: "Desktop-PC", ru: "\u041d\u0430\u0441\u0442\u043e\u043b\u044c\u043d\u044b\u0439 \u041f\u041a" },
  phone: { en: "Phone", de: "Smartphone", ru: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" },
  tablet: { en: "Tablet", de: "Tablet", ru: "\u041f\u043b\u0430\u043d\u0448\u0435\u0442" },
  server: { en: "Server", de: "Server", ru: "\u0421\u0435\u0440\u0432\u0435\u0440" },
  camera: { en: "Camera", de: "Kamera", ru: "\u041a\u0430\u043c\u0435\u0440\u0430" },
  console: { en: "Console", de: "Konsole", ru: "\u041a\u043e\u043d\u0441\u043e\u043b\u044c" },
  nas: { en: "NAS", de: "NAS", ru: "NAS" },
  network_share: { en: "Network Share", de: "Netzwerkfreigabe", ru: "\u0421\u0435\u0442\u0435\u0432\u043e\u0439 \u0440\u0435\u0441\u0443\u0440\u0441" },
  ftp: { en: "FTP / SFTP", de: "FTP / SFTP", ru: "FTP / SFTP" },
  webdav: { en: "WebDAV", de: "WebDAV", ru: "WebDAV" },
  cloud: { en: "Cloud", de: "Cloud", ru: "\u041e\u0431\u043b\u0430\u043a\u043e" },
  object_storage: { en: "Object Storage (S3)", de: "Objektspeicher (S3)", ru: "\u041e\u0431\u044a\u0435\u043a\u0442\u043d\u043e\u0435 \u0445\u0440\u0430\u043d\u0438\u043b\u0438\u0449\u0435 (S3)" },
  tape: { en: "Tape", de: "Bandlaufwerk", ru: "\u041b\u0435\u043d\u0442\u0430" },
  raid: { en: "RAID", de: "RAID", ru: "RAID" },
  local: { en: "Local", de: "Lokal", ru: "\u041b\u043e\u043a\u0430\u043b\u044c\u043d\u044b\u0439" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

export const CATEGORY_LABELS: Record<string, L> = {
  documents: { en: "Documents", de: "Dokumente", ru: "\u0414\u043e\u043a\u0443\u043c\u0435\u043d\u0442\u044b" },
  photos: { en: "Photos", de: "Fotos", ru: "\u0424\u043e\u0442\u043e" },
  videos: { en: "Videos", de: "Videos", ru: "\u0412\u0438\u0434\u0435\u043e" },
  music: { en: "Music", de: "Musik", ru: "\u041c\u0443\u0437\u044b\u043a\u0430" },
  media: { en: "Media", de: "Medien", ru: "\u041c\u0435\u0434\u0438\u0430" },
  desktop: { en: "Desktop", de: "Desktop", ru: "\u0420\u0430\u0431\u043e\u0447\u0438\u0439 \u0441\u0442\u043e\u043b" },
  email: { en: "Email", de: "E-Mail", ru: "\u041f\u043e\u0447\u0442\u0430" },
  messages: { en: "Messages", de: "Nachrichten", ru: "\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u044f" },
  contacts: { en: "Contacts", de: "Kontakte", ru: "\u041a\u043e\u043d\u0442\u0430\u043a\u0442\u044b" },
  calendar: { en: "Calendar", de: "Kalender", ru: "\u041a\u0430\u043b\u0435\u043d\u0434\u0430\u0440\u044c" },
  code: { en: "Code", de: "Code", ru: "\u041a\u043e\u0434" },
  projects: { en: "Projects", de: "Projekte", ru: "\u041f\u0440\u043e\u0435\u043a\u0442\u044b" },
  database: { en: "Database", de: "Datenbank", ru: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445" },
  config: { en: "Configuration", de: "Konfiguration", ru: "\u041a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044f" },
  logs: { en: "Logs", de: "Protokolle", ru: "\u041b\u043e\u0433\u0438" },
  credentials: { en: "Credentials", de: "Zugangsdaten", ru: "\u0423\u0447\u0451\u0442\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435" },
  system: { en: "System", de: "System", ru: "\u0421\u0438\u0441\u0442\u0435\u043c\u0430" },
  system_image: { en: "System Image", de: "System-Image", ru: "\u041e\u0431\u0440\u0430\u0437 \u0441\u0438\u0441\u0442\u0435\u043c\u044b" },
  vm: { en: "Virtual Machine", de: "Virtuelle Maschine", ru: "\u0412\u0438\u0440\u0442. \u043c\u0430\u0448\u0438\u043d\u0430" },
  container: { en: "Container", de: "Container", ru: "\u041a\u043e\u043d\u0442\u0435\u0439\u043d\u0435\u0440" },
  applications: { en: "Applications", de: "Anwendungen", ru: "\u041f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u044f" },
  cloud_data: { en: "Cloud Data", de: "Cloud-Daten", ru: "\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0435 \u0434\u0430\u043d\u043d\u044b\u0435" },
  social_media: { en: "Social Media", de: "Social Media", ru: "\u0421\u043e\u0446\u0438\u0430\u043b\u044c\u043d\u044b\u0435 \u0441\u0435\u0442\u0438" },
  bookmarks: { en: "Bookmarks", de: "Lesezeichen", ru: "\u0417\u0430\u043a\u043b\u0430\u0434\u043a\u0438" },
  passwords: { en: "Passwords", de: "Passwörter", ru: "\u041f\u0430\u0440\u043e\u043b\u0438" },
  finance: { en: "Finance", de: "Finanzen", ru: "\u0424\u0438\u043d\u0430\u043d\u0441\u044b" },
  health: { en: "Health", de: "Gesundheit", ru: "\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435" },
  notes: { en: "Notes", de: "Notizen", ru: "\u0417\u0430\u043c\u0435\u0442\u043a\u0438" },
  education: { en: "Education", de: "Bildung", ru: "\u041e\u0431\u0440\u0430\u0437\u043e\u0432\u0430\u043d\u0438\u0435" },
  games: { en: "Games", de: "Spiele", ru: "\u0418\u0433\u0440\u044b" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

export const BACKUP_MODES = ["manual", "automatic", "provider_managed"] as const;

export const SCHEDULE_FREQUENCIES = [
  "daily", "weekly", "monthly", "yearly", "custom",
] as const;

export const DEVICE_TYPES = [
  // Physical devices
  "desktop", "laptop", "phone", "tablet", "camera", "smartwatch", "ereader",
  // Server & Network
  "server", "nas", "router", "raspberry_pi",
  // External & Entertainment
  "external_drive", "console", "smart_home", "tv", "drone",
  // Cloud & Digital
  "cloud", "app", "service", "email", "website", "database", "vm",
  // Other
  "other",
] as const;

export const DEVICE_TYPE_LABELS: Record<string, L> = {
  desktop: { en: "Desktop PC", de: "Desktop-PC", ru: "\u041d\u0430\u0441\u0442\u043e\u043b\u044c\u043d\u044b\u0439 \u041f\u041a" },
  laptop: { en: "Laptop", de: "Laptop", ru: "\u041d\u043e\u0443\u0442\u0431\u0443\u043a" },
  phone: { en: "Phone", de: "Smartphone", ru: "\u0422\u0435\u043b\u0435\u0444\u043e\u043d" },
  tablet: { en: "Tablet", de: "Tablet", ru: "\u041f\u043b\u0430\u043d\u0448\u0435\u0442" },
  camera: { en: "Camera", de: "Kamera", ru: "\u041a\u0430\u043c\u0435\u0440\u0430" },
  smartwatch: { en: "Smartwatch", de: "Smartwatch", ru: "\u0421\u043c\u0430\u0440\u0442-\u0447\u0430\u0441\u044b" },
  ereader: { en: "E-Reader", de: "E-Reader", ru: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043a\u043d\u0438\u0433\u0430" },
  server: { en: "Server", de: "Server", ru: "\u0421\u0435\u0440\u0432\u0435\u0440" },
  nas: { en: "NAS", de: "NAS", ru: "NAS" },
  router: { en: "Router", de: "Router", ru: "\u0420\u043e\u0443\u0442\u0435\u0440" },
  raspberry_pi: { en: "Raspberry Pi", de: "Raspberry Pi", ru: "Raspberry Pi" },
  external_drive: { en: "External Drive", de: "Externe Festplatte", ru: "\u0412\u043d\u0435\u0448\u043d\u0438\u0439 \u0434\u0438\u0441\u043a" },
  console: { en: "Console", de: "Konsole", ru: "\u041a\u043e\u043d\u0441\u043e\u043b\u044c" },
  smart_home: { en: "Smart Home", de: "Smart Home", ru: "\u0423\u043c\u043d\u044b\u0439 \u0434\u043e\u043c" },
  tv: { en: "TV / Smart TV", de: "TV / Smart TV", ru: "\u0422\u0435\u043b\u0435\u0432\u0438\u0437\u043e\u0440" },
  drone: { en: "Drone", de: "Drohne", ru: "\u0414\u0440\u043e\u043d" },
  cloud: { en: "Cloud Service", de: "Cloud-Dienst", ru: "\u041e\u0431\u043b\u0430\u0447\u043d\u044b\u0439 \u0441\u0435\u0440\u0432\u0438\u0441" },
  app: { en: "App", de: "App", ru: "\u041f\u0440\u0438\u043b\u043e\u0436\u0435\u043d\u0438\u0435" },
  service: { en: "Online Service", de: "Online-Dienst", ru: "\u041e\u043d\u043b\u0430\u0439\u043d-\u0441\u0435\u0440\u0432\u0438\u0441" },
  email: { en: "Email Service", de: "E-Mail-Dienst", ru: "\u042d\u043b\u0435\u043a\u0442\u0440\u043e\u043d\u043d\u0430\u044f \u043f\u043e\u0447\u0442\u0430" },
  website: { en: "Website", de: "Webseite", ru: "\u0412\u0435\u0431-\u0441\u0430\u0439\u0442" },
  database: { en: "Database", de: "Datenbank", ru: "\u0411\u0430\u0437\u0430 \u0434\u0430\u043d\u043d\u044b\u0445" },
  vm: { en: "Virtual Machine", de: "Virtuelle Maschine", ru: "\u0412\u0438\u0440\u0442. \u043c\u0430\u0448\u0438\u043d\u0430" },
  other: { en: "Other", de: "Sonstiges", ru: "\u0414\u0440\u0443\u0433\u043e\u0435" },
};

type DeviceFields = "brand" | "model" | "os" | "serial_number" | "ip_address" | "url" | "provider" | "storage_capacity";

const ALL_DEVICE_FIELDS: DeviceFields[] = ["brand", "model", "os", "serial_number", "ip_address", "url", "provider", "storage_capacity"];

export const DEVICE_FIELD_CONFIG: Record<string, DeviceFields[]> = {
  desktop:        ["brand", "model", "os", "serial_number"],
  laptop:         ["brand", "model", "os", "serial_number", "storage_capacity"],
  phone:          ["brand", "model", "os", "serial_number", "storage_capacity"],
  tablet:         ["brand", "model", "os", "serial_number", "storage_capacity"],
  camera:         ["brand", "model", "serial_number"],
  smartwatch:     ["brand", "model", "os", "serial_number", "storage_capacity"],
  ereader:        ["brand", "model", "serial_number", "storage_capacity"],
  server:         ["brand", "model", "os", "serial_number", "ip_address", "storage_capacity"],
  nas:            ["brand", "model", "os", "serial_number", "ip_address", "storage_capacity"],
  router:         ["brand", "model", "serial_number", "ip_address"],
  raspberry_pi:   ["brand", "model", "os", "serial_number", "ip_address", "storage_capacity"],
  external_drive: ["brand", "model", "serial_number", "storage_capacity"],
  console:        ["brand", "model", "os", "serial_number"],
  smart_home:     ["brand", "model", "serial_number", "ip_address"],
  tv:             ["brand", "model", "serial_number", "ip_address"],
  drone:          ["brand", "model", "serial_number"],
  cloud:          ["provider", "url", "storage_capacity"],
  app:            ["provider", "url"],
  service:        ["provider", "url"],
  email:          ["provider", "url"],
  website:        ["provider", "url"],
  database:       ["provider", "url", "ip_address", "storage_capacity"],
  vm:             ["os", "ip_address", "storage_capacity"],
  other:          ALL_DEVICE_FIELDS,
};

export function getDeviceFields(type: string): DeviceFields[] {
  return DEVICE_FIELD_CONFIG[type] ?? ALL_DEVICE_FIELDS;
}

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
