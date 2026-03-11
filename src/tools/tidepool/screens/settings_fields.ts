/**
 * Form field renderer types for the settings screen.
 *
 * @module
 */

/** Supported settings field types. */
export type SettingsFieldType =
  | "text"
  | "secret"
  | "dropdown"
  | "toggle"
  | "list"
  | "kv";

/** Settings field definition. */
export interface SettingsField {
  readonly key: string;
  readonly label: string;
  readonly type: SettingsFieldType;
  readonly description?: string;
  readonly required?: boolean;
  readonly placeholder?: string;
  /** Options for dropdown fields. */
  readonly options?: readonly string[];
  /** Whether this field contains a secret value. */
  readonly isSecret?: boolean;
}

/** Settings field value (can be various types depending on field type). */
export type SettingsFieldValue =
  | string
  | boolean
  | readonly string[]
  | Record<string, string>
  | null;

/** Settings form state for a section. */
export interface SettingsFormState {
  readonly section: string;
  readonly fields: readonly SettingsField[];
  readonly values: Readonly<Record<string, SettingsFieldValue>>;
  readonly dirty: boolean;
  readonly errors: Readonly<Record<string, string>>;
}
