// constants/checklistTemplates.ts
//
// Template checklist harian bersifat STATIS per kategori aset (bukan lagi
// per-unit/dinamis). Form checklist mengikuti form Excel baku yang sudah ada.
// Setiap aset cukup memilih salah satu `checklist_category` di bawah ini
// (kolom `assets.checklist_category`), lalu form akan otomatis merender
// field-field sesuai daftar di ChecklistTemplateField.

export type ChecklistCategory =
  | "pompa_air"
  | "genset"
  | "kendaraan_mobil"
  | "kendaraan_motor";

// Tipe input field checklist:
// - "bck"             : radio/select Baik, Cukup, Kurang
// - "normal_tindakan"  : radio Normal / Tidak Normal + textbox "Tindakan"
//                         (tindakan wajib/relevan hanya jika "Tidak Normal")
// - "text"             : textbox bebas (angka atau teks, mis. "Running Test")
export type ChecklistFieldType = "bck" | "normal_tindakan" | "text";

export interface ChecklistTemplateField {
  key: string; // -> disimpan sebagai daily_checklist_items.field_key
  label: string; // -> disimpan sebagai daily_checklist_items.field_label (snapshot)
  type: ChecklistFieldType; // -> daily_checklist_items.field_type
}

export interface ChecklistTemplate {
  value: ChecklistCategory;
  label: string;
  fields: ChecklistTemplateField[];
}

export const BCK_OPTIONS = ["Baik", "Cukup", "Kurang"] as const;
export const NORMAL_TINDAKAN_OPTIONS = ["Normal", "Tidak Normal"] as const;

export const CHECKLIST_TEMPLATES: Record<ChecklistCategory, ChecklistTemplate> = {
  pompa_air: {
    value: "pompa_air",
    label: "Pompa Air",
    fields: [
      { key: "volt", label: "Volt", type: "bck" },
      { key: "ampere", label: "Ampere", type: "bck" },
    ],
  },
  genset: {
    value: "genset",
    label: "Genset",
    fields: [
      { key: "level_air_accu", label: "Level Air Accu", type: "normal_tindakan" },
      { key: "level_air_radiator", label: "Level Air Radiator", type: "normal_tindakan" },
      { key: "level_oli", label: "Level Oli", type: "normal_tindakan" },
      { key: "bahan_bakar", label: "Bahan Bakar", type: "text" },
      { key: "running_test", label: "Running Test", type: "text" },
    ],
  },
  kendaraan_mobil: {
    value: "kendaraan_mobil",
    label: "Kendaraan Mobil",
    fields: [
      { key: "kebersihan", label: "Kebersihan", type: "bck" },
      { key: "ban", label: "Ban", type: "bck" },
      { key: "rem", label: "Rem", type: "bck" },
      { key: "gas", label: "Gas", type: "bck" },
      { key: "kopling", label: "Kopling", type: "bck" },
      { key: "air_accu", label: "Air Accu", type: "bck" },
      { key: "air_radiator", label: "Air Radiator", type: "bck" },
    ],
  },
  kendaraan_motor: {
    value: "kendaraan_motor",
    label: "Kendaraan Motor",
    fields: [
      { key: "kebersihan", label: "Kebersihan", type: "bck" },
      { key: "ban", label: "Ban", type: "bck" },
      { key: "rem", label: "Rem", type: "bck" },
      { key: "gas", label: "Gas", type: "bck" },
      { key: "air_accu", label: "Air Accu", type: "bck" },
    ],
  },
};

export interface ChecklistCategoryOption {
  value: ChecklistCategory;
  label: string;
}

// Untuk dropdown "Kategori Checklist" di form Registrasi/Edit Aset
// (menyertakan opsi kosong secara terpisah di UI, jangan dimasukkan di sini)
export const CHECKLIST_CATEGORY_OPTIONS: ChecklistCategoryOption[] = Object.values(
  CHECKLIST_TEMPLATES
).map((t) => ({ value: t.value, label: t.label }));

export function getChecklistTemplate(
  category: string | null | undefined
): ChecklistTemplate | null {
  if (!category) return null;
  return CHECKLIST_TEMPLATES[category as ChecklistCategory] ?? null;
}