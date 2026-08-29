# Permissions System

## Overview

BEMS uses a two-layer permission system:

1. **Default permissions** (stored in `permissions` table) — apply to ALL users of a role
2. **Individual overrides** (stored in `user_permissions` table) — override defaults per user

## Permission Lookup Priority

```
user_permissions (individual override)  ← checked FIRST
          ↓ if not found
permissions.default_value              ← fallback
          ↓ if not found
false                                  ← deny by default
```

## Available Permissions

### Director Permissions

| Key | Description | Default |
|---|---|---|
| `director.see_all_branches` | Can see all branches | false |
| `director.search_member_id` | Search by Member ID | true |
| `director.search_full_name` | Search by Full Name | true |
| `director.import_member_ids` | Import Member IDs | false |
| `director.import_full_names` | Import Full Names | false |
| `director.assign_members` | Assign members to agents | false |
| `director.create_agents` | Create new Agents | false |
| `director.reassign_agents` | Reassign Agents | false |
| `director.view_counseling` | View counseling records | true |
| `director.view_polling` | View polling records | false |
| `director.export_reports` | Export reports | false |
| `director.view_mobile` | View member mobile numbers | true |
| `director.view_addresses` | View member addresses | true |
| `director.view_all_agents` | View all agents | true |
| `director.view_all_members` | View all assigned members | true |
| `director.manage_agents` | Manage assigned agents | false |
| `director.import_csv` | Import CSV/Excel | false |

### Agent Permissions

| Key | Description | Default |
|---|---|---|
| `agent.search_member_id` | Search by Member ID | true |
| `agent.search_full_name` | Search by Full Name | false |
| `agent.search_branch` | Search by Branch | false |
| `agent.search_mobile` | Search by Mobile | false |
| `agent.import_member_ids` | Import Member IDs | false |
| `agent.import_full_names` | Import Full Names | false |
| `agent.import_csv` | Import CSV | false |
| `agent.import_excel` | Import Excel | false |
| `agent.view_additional_branches` | View more branches | false |
| `agent.call_members` | Call button visible | true |
| `agent.whatsapp_members` | WhatsApp button visible | true |
| `agent.view_addresses` | View member addresses | true |
| `agent.view_mobile` | View mobile numbers | true |
| `agent.counseling` | Access counseling module | true |
| `agent.prediction` | Make predictions | true |
| `agent.polling` | Access polling module | false |
| `agent.export` | Export data | false |

### Election Permissions

| Key | Description | Default |
|---|---|---|
| `election.polling_day_module` | Enable polling module globally | false |
| `election.show_countdown_directors` | Show countdown to Directors | true |
| `election.show_countdown_agents` | Show countdown to Agents | true |

## Security Enforcement

Permissions are enforced in two places:

### 1. UI Layer
- Components check permissions before rendering buttons/sections
- Hidden UI elements send no network requests

### 2. Server Layer (cannot be bypassed)
- All Server Actions check permissions server-side
- RLS policies scope data access at the database level
- A user cannot bypass permission by calling APIs directly

## Changing Permissions

1. Go to `/admin/permissions`
2. Toggle the switch next to any permission
3. Change takes effect immediately for ALL users without individual overrides

## Individual Overrides

To set a specific permission for one Director or Agent:

```sql
-- Example: Enable Full Name search for agent AGT009 only
INSERT INTO public.user_permissions (user_id, permission_key, value)
SELECT p.id, 'agent.search_full_name', true
FROM public.profiles p WHERE p.login_id = 'AGT009'
ON CONFLICT (user_id, permission_key) DO UPDATE SET value = EXCLUDED.value;
```

(Individual override UI coming in next version)
