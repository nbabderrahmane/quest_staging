# Ship Quest API Reference

## 🔐 Authentication & Security
The API uses Session-based authentication. Requests must be made from an authenticated browser session or include valid authentication cookies.
- **Access Control**: Strictly limited to `owner` and `admin` roles.
- **Validation**: All requests are validated against `team_members` for the requested `teamId`.

---

## 📦 Data Archiving

### `GET /api/archive`
Generates a complete data snapshot for a specific team, suitable for data warehousing or offline analysis.

#### Parameters
| Type  | Name     | Required | Description |
| :---: | :------- | :------: | :---------- |
| Query | `teamId` | **Yes**  | The UUID of the alliance/team to archive. |

#### Response Schema
Returns a JSON object with the following structure:

```json
{
  "metadata": {
    "timestamp": "ISO-8601 Date String",
    "exported_by": "User UUID",
    "team_id": "Team UUID",
    "version": "1.0"
  },
  "stats": {
    "quest_count": "Integer",
    "task_count": "Integer",
    "profile_count": "Integer"
  },
  "data": {
    "quests": [
      {
        "id": "UUID",
        "name": "String",
        "description": "String",
        "start_date": "Date",
        "end_date": "Date",
        "is_active": "Boolean"
      }
    ],
    "tasks": [
      {
        "id": "UUID",
        "title": "String",
        "status_id": "UUID",
        "assigned_to": "UUID",
        "xp_points": "Integer (via join in future v2, raw in v1)",
        "created_at": "Date"
      }
    ],
    "profiles": [
      {
        "id": "UUID",
        "email": "String",
        "total_xp": "Integer (Synchronized)",
        "first_name": "String",
        "last_name": "String"
      }
    ]
  }
}
```

#### Example Usage
```bash
# Browser or Client
GET https://ship-quest.app/api/archive?teamId=your-team-uuid-here
```

#### Error Codes
- `400 Bad Request`: Missing `teamId`.
- `401 Unauthorized`: Not logged in.
- `403 Forbidden`: User is not an admin/owner of the requested team.
- `500 Internal Error`: Database or execution failure.
