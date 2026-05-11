export interface SupplierPhotoAttachmentInput {
  telegram_file_id: string;
  telegram_file_unique_id: string;
  telegram_message_id: number;
  telegram_caption: string | null;
  telegram_width: number | null;
  telegram_height: number | null;
  telegram_file_size: number | null;
}

export type SupplierManualFieldKey =
  | "supplier_name"
  | "package_weight"
  | "package_dimensions"
  | "package_contents";

export type SupplierIntakeSessionState =
  | "waiting_for_photo_or_text"
  | "waiting_for_text_after_photo"
  | "waiting_for_missing_field_confirmation"
  | "waiting_for_missing_field_value";

export interface SupplierIntakeSessionPayload {
  command: "/new";
  state: SupplierIntakeSessionState;
  pending_supplier_photo?: SupplierPhotoAttachmentInput | null;
  draft_id?: string;
  short_code?: string;
  pending_fields?: SupplierManualFieldKey[];
}
