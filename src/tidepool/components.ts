/**
 * Component tree types for the A2UI (Agent-to-UI) protocol.
 *
 * Defines the component model used by agents to build visual
 * workspaces in the Tide Pool. Components are immutable tree
 * structures that get serialized to JSON and broadcast to
 * connected clients via WebSocket.
 *
 * @module
 */

/** Supported component types in the A2UI protocol. */
export type ComponentType =
  | "card"
  | "table"
  | "chart"
  | "form"
  | "image"
  | "markdown"
  | "layout";

/** A single component in the A2UI tree. */
export interface A2UIComponent {
  /** The type of component to render. */
  readonly type: ComponentType;
  /** Unique identifier for this component. */
  readonly id: string;
  /** Component-specific properties. */
  readonly props: Readonly<Record<string, unknown>>;
  /** Optional child components for container types. */
  readonly children?: readonly A2UIComponent[];
}

/** A versioned tree of A2UI components. */
export interface ComponentTree {
  /** The root component of the tree. */
  readonly root: A2UIComponent;
  /** Monotonically increasing version number. */
  readonly version: number;
}

/**
 * Create a card component.
 *
 * @param id Unique component identifier
 * @param title Card title text
 * @param content Card body content
 * @returns A card A2UIComponent
 */
export function card(
  id: string,
  title: string,
  content: string,
): A2UIComponent {
  return {
    type: "card",
    id,
    props: { title, content },
  };
}

/**
 * Create a table component.
 *
 * @param id Unique component identifier
 * @param headers Column header labels
 * @param rows Table data rows
 * @returns A table A2UIComponent
 */
export function table(
  id: string,
  headers: readonly string[],
  rows: readonly (readonly string[])[],
): A2UIComponent {
  return {
    type: "table",
    id,
    props: { headers, rows },
  };
}

/**
 * Create a markdown component.
 *
 * @param id Unique component identifier
 * @param content Markdown text to render
 * @returns A markdown A2UIComponent
 */
export function markdown(id: string, content: string): A2UIComponent {
  return {
    type: "markdown",
    id,
    props: { content },
  };
}

/**
 * Create a chart component.
 *
 * Accepts either structured data (`type`, `labels`, `values`) for auto-rendered
 * charts, or a passthrough `svg` string for pre-built SVG charts.
 *
 * @param id Unique component identifier
 * @param props Chart properties: structured `{ type, labels, values }` or passthrough `{ svg }`
 * @returns A chart A2UIComponent
 */
export function chart(
  id: string,
  props: { readonly type: string; readonly labels: readonly string[]; readonly values: readonly number[] } | { readonly svg: string },
): A2UIComponent {
  return {
    type: "chart",
    id,
    props: { ...props },
  };
}

/**
 * Create a form component.
 *
 * Renders a display-only form with labeled fields.
 *
 * @param id Unique component identifier
 * @param fields Array of field definitions
 * @returns A form A2UIComponent
 */
export function form(
  id: string,
  fields: readonly { readonly name: string; readonly type: string; readonly label: string }[],
): A2UIComponent {
  return {
    type: "form",
    id,
    props: { fields: [...fields] },
  };
}

/**
 * Create an image component.
 *
 * @param id Unique component identifier
 * @param src Image URL or data URI
 * @param alt Optional alt text
 * @returns An image A2UIComponent
 */
export function image(
  id: string,
  src: string,
  alt?: string,
): A2UIComponent {
  return {
    type: "image",
    id,
    props: alt !== undefined ? { src, alt } : { src },
  };
}

/**
 * Create a layout component that arranges children.
 *
 * @param id Unique component identifier
 * @param direction Layout direction: "row" or "column"
 * @param children Child components to arrange
 * @returns A layout A2UIComponent
 */
export function layout(
  id: string,
  direction: "row" | "column",
  children: readonly A2UIComponent[],
): A2UIComponent {
  return {
    type: "layout",
    id,
    props: { direction },
    children,
  };
}
