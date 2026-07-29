# Golden Reference Integrity

Reference images must not originate from the runtime currently under test.

Approved sources:

- user-provided screenshot or mockup;
- approved Figma frame or node export;
- approved PDF crop;
- approved historical golden captured from a known-good revision and recorded in provenance;
- explicitly approved design artifact.

The implementation under test may generate `actual` screenshots only. It may never generate, refresh, overwrite, approve, or promote `golden` references during the same run.

## Manifest

Every reference set requires `.visual-fidelity/references/manifest.json` with one entry per golden:

- `referenceId`
- `approvedSourceType`
- `approvedSourceLocation`
- `sourceHash`
- `approvedRevisionOrDesignId`
- `cropRect`
- `viewport`
- `browserFrameIncluded`
- `createdFromRuntimeUnderTest: false`
- `createdBeforeCurrentImplementation: true`
- `derivedArtifacts`
- `reviewerOrApprovalMarker`

Fail when:

- manifest is missing;
- provenance is incomplete;
- golden was created from current runtime under test;
- golden timestamp is after implementation under test;
- approved original is not preserved;
- derived crops do not point to the original;
- comparison is actual vs actual;
- diff is perfect but provenance is absent or suspect;
- baseline was updated during the same execution.

