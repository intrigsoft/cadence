# Screenshots

Visual reference for the Cadence design. These are high-fidelity captures of the HTML prototype — use them to keep the implementation pixel-synced with the intended design. Exact tokens (color/type/spacing) are in `../README.md` → Design Tokens and `../prototype/styles.css`.

| # | File | Screen | What to notice |
|---|---|---|---|
| 01 | `01-login.png` | **Login** | Two-pane: dark BYOA story panel (left) + SSO / email / **sandbox identity picker** (right). The picker is sandbox-only. |
| 02 | `02-boards-home.png` | **Boards Home** (assistant open) | Greeting, board-card grid with gradient covers + Private pills + member stacks, "New board" tile, and the docked Dioschub assistant on the right. |
| 03 | `03-kanban-board.png` | **Kanban Board** | Full-width board: lists as columns, card tiles with label chips, due chips, checklist counts, the **"Dioschub" badge** on agent-touched cards, assignee avatars. |
| 04 | `04-card-detail.png` | **Card Detail** | Modal: editable description, checklist w/ progress, **activity feed with the `acting as …@northwind.io` audit chip**, and the functional right sidebar (Assignees, Labels, Due date, Add to card). |
| 05 | `05-my-cards.png` | **My Cards** | Everything assigned to the signed-in user, grouped by board. |
| 06 | `06-account-menu.png` | **Account Menu** | Signed-in identity (name/email/role), "Signed in via SSO" note, **Sign out**, and the sandbox-only **Switch demo identity** row. |
| 07 | `07-new-board.png` | **New Board** | Create-board modal: name, color swatches w/ live cover preview, Private/Workspace visibility, BYOA membership note. |
| 08 | `08-assistant-panel.png` | **Assistant Panel** | The embedded Dioschub shell: **operating-as identity** header, security badges, scoped welcome, suggestions, input. Dark ink to signal "separate secure layer." |

> The assistant in the prototype is a UI shell — the live agent + MCP wiring is specified in `../SPEC.md` §5.
