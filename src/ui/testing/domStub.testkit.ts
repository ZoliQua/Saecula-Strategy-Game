import { vi } from 'vitest';

/*
 * Test-only DOM for the overlay UI (Vitest runs in Node): elements with
 * children, attributes, classes, styles and listeners, and a log of every
 * write, so diffing can be checked. Only what `el` and the components use.
 */

export interface DomWrite {
  readonly node: StubNode;
  readonly what: string;
}

export class StubNode {
  readonly attrs = new Map<string, string>();
  readonly children: StubNode[] = [];
  readonly dataset: Record<string, string> = {};
  readonly classList = {
    add: (...names: string[]) => void names.forEach((name) => this.setClass(name, true)),
    remove: (...names: string[]) => void names.forEach((name) => this.setClass(name, false)),
    contains: (name: string) => this.classes.has(name),
    toggle: (name: string, on: boolean) => this.setClass(name, on),
  };
  readonly style: Record<string, unknown>;
  parent: StubNode | null = null;
  hidden = false;
  tabIndex = 0;
  value = '';
  scrolled: unknown[] = [];
  private classes = new Set<string>();
  private text = '';
  private readonly listeners = new Map<string, Array<(event: unknown) => void>>();

  constructor(
    readonly tag: string,
    private readonly dom: DomStub,
  ) {
    const values: Record<string, unknown> = {
      setProperty: (name: string, value: string) => {
        values[name] = value;
        this.wrote(name);
      },
    };
    this.style = new Proxy(values, {
      set: (target, name, value) => {
        target[String(name)] = value;
        this.wrote(String(name));
        return true;
      },
    });
  }

  private wrote(what: string): void {
    this.dom.writes.push({ node: this, what });
  }

  private setClass(name: string, on: boolean): void {
    if (on) this.classes.add(name);
    else this.classes.delete(name);
    this.wrote(`class:${name}`);
  }

  get className(): string {
    return [...this.classes].join(' ');
  }
  set className(value: string) {
    this.classes = new Set(value.split(' ').filter(Boolean));
  }
  get textContent(): string {
    return this.text + this.children.map((child) => child.textContent).join('');
  }
  set textContent(value: string) {
    this.children.length = 0;
    this.text = value;
    this.wrote('text');
  }
  set innerHTML(_value: string) {
    this.wrote('html');
  }
  get disabled(): boolean {
    return this.attrs.has('disabled');
  }
  set disabled(on: boolean) {
    if (on) this.setAttribute('disabled', '');
    else this.removeAttribute('disabled');
  }

  setAttribute(name: string, value: string): void {
    this.attrs.set(name, value);
    this.wrote(name);
  }
  getAttribute(name: string): string | null {
    return this.attrs.get(name) ?? null;
  }
  removeAttribute(name: string): void {
    this.attrs.delete(name);
    this.wrote(name);
  }

  append(...nodes: Array<StubNode | string>): void {
    for (const node of nodes) {
      if (typeof node === 'string') this.text += node;
      else this.place(node, null);
    }
  }
  insertBefore(node: StubNode, before: StubNode | null): void {
    this.place(node, before);
    node.wrote('moved');
  }
  private place(node: StubNode, before: StubNode | null): void {
    node.detach();
    const at = before ? this.children.indexOf(before) : this.children.length;
    this.children.splice(at, 0, node);
    node.parent = this;
  }
  remove(): void {
    this.detach();
  }
  private detach(): void {
    this.parent?.children.splice(this.parent.children.indexOf(this), 1);
    this.parent = null;
  }
  contains(node: StubNode | null): boolean {
    return node !== null && (node === this || this.children.some((child) => child.contains(node)));
  }
  /** This element and everything in it. */
  all(): StubNode[] {
    return [this, ...this.children.flatMap((child) => child.all())];
  }

  addEventListener(type: string, listener: (event: unknown) => void): void {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener]);
  }
  /** Runs the element's own listeners; whether the default was prevented. */
  fire(type: string, init: object = {}): boolean {
    let prevented = false;
    const event = { ...init, preventDefault: () => (prevented = true) };
    for (const listener of this.listeners.get(type) ?? []) listener(event);
    return prevented;
  }
  focus(): void {
    this.dom.active = this;
  }
  scrollIntoView(options: unknown): void {
    this.scrolled.push(options);
  }
}

export class DomStub {
  readonly writes: DomWrite[] = [];
  active: StubNode | null = null;
  readonly body = new StubNode('body', this);

  /** The component's root as the stub it really is. */
  node(element: unknown): StubNode {
    return element as StubNode;
  }
}

/** Installs the stub as `document` (undo with vi.unstubAllGlobals). */
export function installDomStub(): DomStub {
  const dom = new DomStub();
  vi.stubGlobal('document', {
    body: dom.body,
    createElement: (tag: string) => new StubNode(tag, dom),
    getElementById: (id: string) => dom.body.all().find((node) => node.getAttribute('id') === id) ?? null,
    get activeElement() {
      return dom.active;
    },
  });
  return dom;
}
