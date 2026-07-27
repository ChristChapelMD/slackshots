# File/folder selector tabs

The production SlackShots uploader currently uses a single file picker. The
original two-tab visual treatment is preserved in
`components/reference/file-folder-selector-tabs.tsx` for reuse in other
projects.

Pass the file-picker card and folder-picker card as `filesContent` and
`folderContent`. The reference component owns only the selected tab and the
HeroUI tab styling. Keep file input refs, validation, filtering, and form state
in the consuming feature so the visual component stays reusable.

For folder selection in Chromium-based browsers, render a hidden multiple file
input with the `webkitdirectory` attribute. Filter the returned `FileList`
against the accepted extensions before placing it in upload state.
