// Type surface for the vendored Idiomorph (./idiomorph.js) — hand-written, and
// transcribed from that file's own JSDoc typedefs (Config / ConfigCallbacks /
// ConfigHead).
//
// Why this file exists: idiomorph.js declares its types with Closure-style
// `function(X): Y` JSDoc, which TypeScript 7 cannot parse — checking it emits
// hundreds of errors from a dependency we do not own, and jsconfig's `exclude`
// cannot prevent it because morph.js imports the file. A sibling .d.ts takes
// precedence over the .js, so the source is never parsed. Runtime is unaffected:
// browsers resolve the import to the .js as before.
//
// Re-check this file when bumping Idiomorph.

export interface IdiomorphHeadConfig {
  style?: 'merge' | 'append' | 'morph' | 'none';
  block?: boolean;
  ignore?: boolean;
  shouldPreserve?: (element: Element) => boolean;
  shouldReAppend?: (element: Element) => boolean;
  shouldRemove?: (element: Element) => boolean;
  afterHeadMorphed?: (
    head: Element,
    changes: { added: Node[]; kept: Element[]; removed: Element[] },
  ) => void;
}

export interface IdiomorphCallbacks {
  /** Return false to skip adding the node. */
  beforeNodeAdded?: (node: Node) => boolean | void;
  afterNodeAdded?: (node: Node) => void;
  /** Return false to leave the old node untouched — the escape hatch for self-managed regions. */
  beforeNodeMorphed?: (oldNode: Node, newNode: Node) => boolean | void;
  afterNodeMorphed?: (oldNode: Node, newNode: Node) => void;
  /** Return false to keep the node. */
  beforeNodeRemoved?: (node: Node) => boolean | void;
  afterNodeRemoved?: (node: Node) => void;
  /** Return false to leave the attribute alone. */
  beforeAttributeUpdated?: (
    attributeName: string,
    node: Element,
    mutationType: 'update' | 'remove',
  ) => boolean | void;
}

export interface IdiomorphConfig {
  morphStyle?: 'outerHTML' | 'innerHTML';
  ignoreActive?: boolean;
  ignoreActiveValue?: boolean;
  restoreFocus?: boolean;
  callbacks?: IdiomorphCallbacks;
  head?: IdiomorphHeadConfig;
}

export declare const Idiomorph: {
  morph(
    oldNode: Element | Document,
    newContent: Element | Node | HTMLCollection | Node[] | string | null,
    config?: IdiomorphConfig,
  ): undefined | Node[];
  defaults: IdiomorphConfig;
};
