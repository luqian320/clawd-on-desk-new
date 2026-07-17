# Codex Desktop Approval Notification

## Goal

Mirror Codex Desktop approval waits through the existing Clawd notification bubble. The bubble is informational only and provides a **Go to Codex** action. Clawd must never synthesize an allow or deny decision for this path.

## Detection

Codex Desktop currently records host-owned approval requests as `response_item.custom_tool_call` entries. The local monitor treats an `exec` call containing `sandbox_permissions: "require_escalated"` as a best-effort approval-wait signal, only when session metadata identifies `originator = "Codex Desktop"`. Both JavaScript-style keys and quoted JSON-style keys are accepted because Desktop emits both serializations.

The matching `custom_tool_call_output.call_id` resolves the notification automatically. The bubble shows the request's human-readable `justification` when present; command contents are not copied into the bubble. If no explanation is available, localized fallback copy replaces any `unknown` placeholder. Approval-wait bubbles are sticky: they remain visible until the call resolves or the user chooses **Go to Codex**.

## Visual skins

The approval notice uses the same `focusHudStyle` preference as the Focus HUD. Pixel is the default; switching the Focus HUD between pixel and modern refreshes any visible Codex approval notice immediately. Other permission bubbles keep their existing appearance.

## Safety and compatibility

- Existing official `PermissionRequest` hooks remain the authoritative interactive approval path for Codex CLI and supported Codex tools.
- Desktop notification bubbles never return approval decisions.
- **Go to Codex** uses the existing thread deep link and dismisses only the passive bubble.
- Codex documents transcript JSONL as an unstable interface. Keep detection isolated so a future official Desktop approval event can replace it without changing the permission UI.
- Unknown or malformed records fail closed by producing no notification.
