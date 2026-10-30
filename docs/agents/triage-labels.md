# Local statuses

The upstream triage role strings are recorded in Markdown, never created as remote labels:

| Role | Local status |
| --- | --- |
| needs-triage | needs-triage |
| needs-info | needs-info |
| ready-for-agent | ready-for-agent |
| ready-for-human | ready-for-human |
| wontfix | wontfix |

Implementation tickets move from `ready-for-agent` to `in-progress` to `done`. Fix-cycle bugs use `open`, `fixed`, `confirmed`; only the user can confirm a bug. Closing a cycle does not confirm its bugs.
