import { z } from "zod";
import { defineComponent } from "../defineComponent.js";
import { vec3 } from "../vec3.js";

export const UiElementSchema = z.object({
  type: z.enum(["text", "button", "panel"]).default("text"),
  text: z.string().default("Text"),
  position: vec3([0, 0, 0]),
  size: vec3([200, 48, 0]),
  anchor: z
    .enum(["top-left", "top", "top-right", "center", "bottom-left", "bottom", "bottom-right"])
    .default("top-left"),
  color: z.string().default("#ffffff"),
  background: z.string().default("transparent"),
  fontSize: z.number().positive().default(24),
  visible: z.boolean().default(true),
  event: z.string().default(""),
});

export type UiElement = z.infer<typeof UiElementSchema>;

export const UiElementComponent = defineComponent({
  id: "ui.element",
  displayName: "UI Element",
  schema: UiElementSchema,
  defaults: {
    type: "text",
    text: "Text",
    position: [0, 0, 0],
    size: [200, 48, 0],
    anchor: "top-left",
    color: "#ffffff",
    background: "transparent",
    fontSize: 24,
    visible: true,
    event: "",
  },
  inspector: [
    { key: "type", label: "Type", type: "enum", options: ["text", "button", "panel"] },
    { key: "text", label: "Text", type: "string" },
    { key: "position", label: "Position", type: "vec3" },
    { key: "size", label: "Size", type: "vec3" },
    {
      key: "anchor",
      label: "Anchor",
      type: "enum",
      options: ["top-left", "top", "top-right", "center", "bottom-left", "bottom", "bottom-right"],
    },
    { key: "color", label: "Color", type: "color" },
    { key: "background", label: "Background", type: "color" },
    { key: "fontSize", label: "Font Size", type: "number" },
    { key: "visible", label: "Visible", type: "boolean" },
    { key: "event", label: "Click Event", type: "string" },
  ],
  docs: {
    summary: "Screen-space text, button, or panel rendered over the game canvas.",
    aiUsage: "Use event on buttons to emit a named ctx.events event when clicked.",
  },
});
