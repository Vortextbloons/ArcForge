import type { UiElement } from "@arcforge/schemas";
import type { World } from "../ecs/World.js";
import type { EventBus } from "../scripting/EventBus.js";

/** DOM overlay renderer for ui.element components. */
export class UiSystem {
  private root: HTMLDivElement | null = null;
  private readonly elements = new Map<string, HTMLElement>();

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly events: EventBus
  ) {}

  sync(world: World): void {
    const root = this.ensureRoot();
    if (!root) return;
    const alive = new Set<string>();
    for (const entity of world.query("ui.element")) {
      const data = world.getComponent<UiElement>(entity.id, "ui.element");
      if (!data) continue;
      alive.add(entity.id);
      let element = this.elements.get(entity.id);
      if (!element || element.dataset.uiType !== data.type) {
        element?.remove();
        element = document.createElement(data.type === "button" ? "button" : "div");
        element.dataset.uiType = data.type;
        element.dataset.entityId = entity.id;
        root.append(element);
        this.elements.set(entity.id, element);
      }
      applyUiElement(element, data);
      element.onclick =
        data.type === "button" && data.event
          ? () => this.events.emit(data.event, { entityId: entity.id })
          : null;
    }
    for (const [id, element] of this.elements) {
      if (!alive.has(id)) {
        element.remove();
        this.elements.delete(id);
      }
    }
  }

  dispose(): void {
    this.elements.clear();
    this.root?.remove();
    this.root = null;
  }

  private ensureRoot(): HTMLDivElement | null {
    if (this.root) return this.root;
    if (typeof document === "undefined" || !this.canvas.parentElement) return null;
    const parent = this.canvas.parentElement;
    if (getComputedStyle(parent).position === "static") parent.style.position = "relative";
    const root = document.createElement("div");
    root.className = "arcforge-runtime-ui";
    Object.assign(root.style, {
      position: "absolute",
      inset: "0",
      overflow: "hidden",
      pointerEvents: "none",
      fontFamily: "system-ui, sans-serif",
    });
    parent.append(root);
    this.root = root;
    return root;
  }
}

function applyUiElement(element: HTMLElement, data: UiElement): void {
  element.textContent = data.type === "panel" ? "" : data.text;
  const [anchorX, anchorY, transform] = anchorStyle(data.anchor);
  Object.assign(element.style, {
    position: "absolute",
    left: `calc(${anchorX} + ${data.position[0]}px)`,
    top: `calc(${anchorY} + ${data.position[1]}px)`,
    transform,
    width: `${data.size[0]}px`,
    height: `${data.size[1]}px`,
    color: data.color,
    background: data.background,
    fontSize: `${data.fontSize}px`,
    display: data.visible ? "flex" : "none",
    alignItems: "center",
    justifyContent: "center",
    border: data.type === "button" ? "1px solid currentColor" : "0",
    pointerEvents: data.type === "button" ? "auto" : "none",
    boxSizing: "border-box",
  });
}

function anchorStyle(anchor: UiElement["anchor"]): [string, string, string] {
  const horizontal = anchor.endsWith("left") ? "0%" : anchor.endsWith("right") ? "100%" : "50%";
  const vertical = anchor.startsWith("top") ? "0%" : anchor.startsWith("bottom") ? "100%" : "50%";
  const translateX = anchor.endsWith("left") ? "0" : anchor.endsWith("right") ? "-100%" : "-50%";
  const translateY = anchor.startsWith("top")
    ? "0"
    : anchor.startsWith("bottom")
      ? "-100%"
      : "-50%";
  return [horizontal, vertical, `translate(${translateX}, ${translateY})`];
}
