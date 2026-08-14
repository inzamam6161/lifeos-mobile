# Device E2E smoke test

The included Maestro flow is intentionally small: it proves the installed app can launch, navigate through the real native shell, and open Diagnostics.

Set the real application identifier before running:

```bash
APP_ID=com.yourcompany.lifeos maestro test e2e/maestro/smoke.example.yaml
```

Extend this suite only after stable accessibility labels/test IDs exist for a flow. High-value next flows are:

- create and persist a task
- record a shopping checkout and verify Money updates
- start/recover/finish a workout
- start/recover/finish a study session
- create a reminder
- lock/unlock LifeOS
- encrypted backup export/restore

E2E tests complement unit/component tests; they do not replace release testing on real iOS and Android devices.
