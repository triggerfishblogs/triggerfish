/**
 * Modal store — secret, credential, and trigger prompts.
 */

import { onTopic, send } from "./websocket.svelte.js";

export type ModalKind = "secret" | "credential" | "trigger" | "confirm" | null;

/** Current modal kind. */
let _modalKind: ModalKind = $state(null);

/** Modal nonce for response. */
let _modalNonce: string = $state("");

/** Modal display name. */
let _modalName: string = $state("");

/** Modal hint text. */
let _modalHint: string = $state("");

/** Trigger source (for trigger prompts). */
let _triggerSource: string = $state("");

/** Trigger classification. */
let _triggerClassification: string = $state("");

/** Trigger result preview. */
let _triggerPreview: string = $state("");

/** Confirm prompt message. */
let _confirmMessage: string = $state("");

/** Get the current modal kind. */
export function getModalKind(): ModalKind {
  return _modalKind;
}

/** Get the modal nonce. */
export function getModalNonce(): string {
  return _modalNonce;
}

/** Get the modal display name. */
export function getModalName(): string {
  return _modalName;
}

/** Get the modal hint text. */
export function getModalHint(): string {
  return _modalHint;
}

/** Get the trigger source. */
export function getTriggerSource(): string {
  return _triggerSource;
}

/** Get the trigger classification. */
export function getTriggerClassification(): string {
  return _triggerClassification;
}

/** Get the trigger result preview. */
export function getTriggerPreview(): string {
  return _triggerPreview;
}

/** Get the confirm prompt message. */
export function getConfirmMessage(): string {
  return _confirmMessage;
}

/** Show secret prompt. */
function showSecretPrompt(
  nonce: string,
  name: string,
  hint: string,
): void {
  _modalKind = "secret";
  _modalNonce = nonce;
  _modalName = name;
  _modalHint = hint;
}

/** Show credential prompt. */
function showCredentialPrompt(
  nonce: string,
  name: string,
  hint: string,
): void {
  _modalKind = "credential";
  _modalNonce = nonce;
  _modalName = name;
  _modalHint = hint;
}

/** Show trigger prompt. */
function showTriggerPrompt(
  source: string,
  classification: string,
  preview: string,
): void {
  _modalKind = "trigger";
  _triggerSource = source;
  _triggerClassification = classification;
  _triggerPreview = preview;
}

/** Show confirm prompt. */
function showConfirmPrompt(nonce: string, message: string): void {
  _modalKind = "confirm";
  _modalNonce = nonce;
  _confirmMessage = message;
}

/** Submit confirm response. */
export function submitConfirm(approved: boolean): void {
  send({ type: "confirm_prompt_response", nonce: _modalNonce, approved });
  closeModal();
}

/** Submit secret response. */
export function submitSecret(value: string | null): void {
  send({ type: "secret_prompt_response", nonce: _modalNonce, value });
  closeModal();
}

/** Submit credential response. */
export function submitCredential(
  username: string | null,
  password: string | null,
): void {
  send({
    type: "credential_prompt_response",
    nonce: _modalNonce,
    username,
    password,
  });
  closeModal();
}

/** Submit trigger response. */
export function submitTrigger(accepted: boolean): void {
  send({
    type: "trigger_prompt_response",
    source: _triggerSource,
    accepted,
  });
  closeModal();
}

/** Close the modal. */
export function closeModal(): void {
  _modalKind = null;
  _modalNonce = "";
  _modalName = "";
  _modalHint = "";
  _triggerSource = "";
  _triggerClassification = "";
  _triggerPreview = "";
  _confirmMessage = "";
}

function handleMessage(msg: Record<string, unknown>): void {
  switch (msg.type) {
    case "secret_prompt":
      showSecretPrompt(
        msg.nonce as string,
        msg.name as string,
        (msg.hint as string) ?? "",
      );
      break;
    case "credential_prompt":
      showCredentialPrompt(
        msg.nonce as string,
        msg.name as string,
        (msg.hint as string) ?? "",
      );
      break;
    case "trigger_prompt":
      showTriggerPrompt(
        msg.source as string,
        (msg.classification as string) ?? "PUBLIC",
        (msg.preview as string) ?? "",
      );
      break;
    case "confirm_prompt":
      showConfirmPrompt(
        msg.nonce as string,
        (msg.message as string) ?? "Confirm this action?",
      );
      break;
  }
}

onTopic("chat", handleMessage);
