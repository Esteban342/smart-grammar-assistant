export interface EditableTarget {
  element: HTMLElement;
  type: 'input' | 'textarea' | 'contenteditable' | 'canvas-docs';
  start?: number;
  end?: number;
  range?: Range;
}

export interface SelectionResult {
  text: string;
  x: number;
  y: number;
  editableTarget: EditableTarget | null;
}