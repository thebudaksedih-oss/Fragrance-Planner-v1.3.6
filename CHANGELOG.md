# Changelog

## [1.3.5] - 2026-04-16
### Fixed
- Fixed issue where Sell Tracker Entry names could not be edited due to `window.prompt` limitations in iframe.
- Improved sequential numbering in Sales Records table (numeric 1, 2, 3... index).
- Refined UI for creating and editing Entries (Batches) with a dedicated modal.
- Improved clarity in Order/Record editing modal by updating labels and placeholders.

### Changed
- "Add Item" in Sales Records renamed to "Add Record" to distinguish from Shop Items.
- Updated application versioning to 1.3.5.

## [1.3.4] - 2026-04-16
### Added
- Integrated Price Tracker with global application settings.
- Centralized currency management in `appSettings`.
- Dynamic currency symbol display across all tabs.

### Changed
- Optimized Export/Import logic to include global settings.
- Removed legacy redundant state variables.
