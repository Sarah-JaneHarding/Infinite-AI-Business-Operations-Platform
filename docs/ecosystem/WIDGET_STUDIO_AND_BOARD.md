# Widget Studio, Wiring Board and classroom tools

Status: ingested 2026-11-10. The widgets are archived and indexed; **none is wired yet** (see "What wiring means here").

## Where things are

| What                                                            | Where                                                                 |
| --------------------------------------------------------------- | --------------------------------------------------------------------- |
| 80 single-file widgets and `index.json` (id, agent, gate, hash) | `apps/web/public/widgets/`                                            |
| Rebuild or check the index                                      | `node scripts/build-widget-index.mjs` (`--check`)                     |
| Rules: release, ratify, forward-only roll back, publish, accept | `packages/widget-registry` and `docs/WIDGET_REGISTRY_DESIGN.md`       |
| Studio, Board intake, adapters, classroom source, test drivers  | `tools/widget-studio/`                                                |
| Catalogue of 64 classroom tools and what is built               | `docs/TOOLBOX_CATALOGUE.md`, `docs/data/toolbox-catalogue.{json,csv}` |

The 80: CE-W01 to W13, DW-W01 to W09, PD-W01 to W19, PF-W01 to W07, SA-W01 to W12, TB-W01 to W20.

## The Studio panel (in every widget)

1. Run the widget, or press **Load synthetic sample** then **Run**.
2. **Document view**: the output as a document. Click text to change it, give a reason, **Save my edits**. A saved edit makes a new schema revision.
3. **File view**: the same output as JSON, a table (.csv), a document (.md) or a web page (.html). JSON and CSV can be edited and read back.
4. **Agent contract**: checks the output, laid out the way the agent asks, against that agent's own schema. Adapters exist for PD-W01 to W08, TB-W01 to W11 and DW-W01 to W04 (23 widgets). Where a widget cannot supply a field it says "needs input" and names it. Nothing is guessed. The other 23 widgets with agents (all SA, all CE, DW-W07 to W09) cannot be laid out from a page: see OQ-040 and OQ-041.
5. **Ratify this revision**: the signed-in person presses it. With a platform identity the name is locked to it and the account id recorded. Without one the name is typed, the package is marked unverified and the registry refuses it. Codes and single words are refused.
6. **Send to code** (enabled only after ratification) downloads `<widget>-release-vX.Y.Z.json`.
7. **Versions and rollback**: load earlier release packages, name a person and a reason, and a new forward revision restores the old content. A named person ratifies it like any change. History is never rewritten.

Nothing is stored or sent by the page.

## The Wiring Board (PF-W06), custom widgets

- **Add and audit**: widget contract, POPIA (purpose, retention, no personal information), boundaries (no network calls, `eval`, outside addresses), standing rules, and the agent contract. A widget that declares `agentId: null` passes the agent check as not applicable; the boundary checks still apply.
- **SMT**: at least two named members ratify. The page produces an alert file; it cannot send one.
- **Private or public**: private stays in the school. Public first needs the school-information clean (OQ-037) and one named SMT member to confirm it. The offer file records only how many items were removed. It is marked _submitted for platform review_ and is not live until Infinite-AI appointed staff approve it (OQ-039).
- **Offers to this school**: audited again on arrival. The school's named person accepts or rejects with a reason; accepting loads the widget into the Board for testing, editing to the school's template, ratification and wiring.

## Classroom tools TB-W14 to TB-W20

Class Register and Lunch Count, Random Student Picker, Random Group Maker, Rotations Timer, Score Keeper, Noise Levels, Survey and Graph. Original code and artwork. Learner codes only; a label typed for the board never leaves the page. No network calls, no microphone, nothing stored. Each has a human gate before anything is passed on. The registry tests enforce the network, dynamic-code and microphone rules on these seven files.

## What wiring means here

Wiring is a registry step: `addRelease` then `wire` in `@infinite-ai/widget-registry`, both of which refuse an unratified release or one whose ratification is for a different content hash. Nobody has ratified a release of any of the 80, so **no release exists to wire**. A named, signed-in person produces each one from the Studio panel (Send to code). This ingest does not fabricate ratifications. See OQ-045.

## Not done, on purpose

- No route serves the widgets (OQ-044).
- No database table for releases: the registry rules are pure TypeScript. A storage service is a later decision (OQ-037 to OQ-039 context).
- The shared widget kit that built the pages was not in the hand-over, so the archived HTML is the source of truth.
