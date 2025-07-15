# Heavymeta CLI Documentation

---

## Overview

**Heavymeta CLI** is a machine-oriented command-line interface designed to serve as a backend or automation tool for other applications in the Heavymeta ecosystem. It is not intended for direct, manual use by end-users, but rather as a robust, scriptable interface for tasks such as NFT metadata generation, blockchain project templating, and container management.

**Primary Use Cases:**
- **Integration with Blender:** Scripts in Blender call the CLI to generate and retrieve NFT metadata, automate project setup, and manage assets.
- **Automated Project Templating:** Used by external scripts to scaffold, update, and deploy blockchain projects (e.g., for ICP).
- **Container Management:** Provides a programmatic interface for pulling and running Apptainer containers, with user interaction only when necessary.

**User Interaction:**  
Popups and UI prompts are only triggered when absolutely required (e.g., file/folder selection, password entry). Most commands are designed for non-interactive, script-driven use.

---

## Command Reference

### NFT/Collection Data Commands

#### `parse-blender-hvym-interactables`
- **Purpose:** Parse interactable data from Blender-exported JSON for Heavymeta GLTF extension.
- **Arguments:** `obj_data` (str, JSON)
- **Returns:** Parsed data structure (JSON)
- **Typical Use:** Called by Blender scripts to process interactable metadata.

#### `parse-blender-hvym-collection`
- **Purpose:** Parse collection data from Blender-exported JSON.
- **Arguments:** Multiple JSON strings for collection, menu, nodes, actions.
- **Returns:** Structured collection data (JSON)
- **Typical Use:** Automated by Blender scripts.

#### `collection-data`, `contract-data`, `mat-prop-data`, etc.
- **Purpose:** Generate and return structured data for various NFT and asset properties.
- **Arguments:** Vary by command (see code).
- **Returns:** JSON data structures.
- **Typical Use:** Used by external scripts for NFT metadata generation.

---

### ICP/Blockchain Project Commands

#### `icp-install`, `didc-install`
- **Purpose:** Install required third-party CLIs (`dfx`, `didc`).
- **Note:** These are third-party dependencies; ensure they are installed and configured before using related commands.

#### `icp-project`, `icp-init`, `icp-update-model`, etc.
- **Purpose:** Automate project creation, initialization, and template rendering for ICP blockchain projects.
- **Arguments:** Project names, types, models, etc.
- **Returns:** Paths, status messages, or writes files.
- **Typical Use:** Automated by scripts for project scaffolding and deployment.

#### `icp-deploy-assets`, `icp-start-assets`, `icp-stop-assets`
- **Purpose:** Deploy, start, or stop asset canisters.
- **Note:** Interacts with `dfx` CLI; ensure it is installed.

#### `icp-account`, `icp-principal`, `icp-balance`, etc.
- **Purpose:** Query and manage ICP accounts.
- **Security:** Relies on `dfx`'s own encryption and key management.

---

### Apptainer/Pintheon Commands

#### `pintheon-pull-popup`
- **Purpose:** Pull the Pintheon image to a user-selected directory. Stores the SIF file path in `APP_DATA`.
- **Automation:** Can be called by scripts; only triggers a popup if user input is needed.

#### `apptainer-set-cache-dir`
- **Purpose:** Set the Apptainer cache directory in `APP_DATA`.
- **Usage:** Optional; up to the user or calling script to use this for storage management.

#### `pintheon-set-port`
- **Purpose:** Set the port for the Pintheon tunnel and instance.
- **Default:** 9999, but can be changed as needed.

#### `pintheon-start`, `pintheon-stop`, `pintheon-tunnel`
- **Purpose:** Start/stop the Pintheon instance or open a tunnel using Pinggy.
- **Automation:** Designed for script-driven use; will warn if required files/fields are missing.

#### `pintheon-setup`
- **Purpose:** One-shot setup for the Pintheon gateway (adds remote, installs Pinggy, pulls image).

---

### Stellar Commands

#### `stellar-set-account`, `stellar-new-account`, `stellar-remove-account`, etc.
- **Purpose:** Manage Stellar accounts and keys.
- **Security:** Wallet/account data is encrypted in the Heavymeta CLI, providing more secure storage than the standard Stellar CLI (which stores seeds in plaintext).

#### `stellar-load-shared-pub`, `stellar-select-shared-pub`, etc.
- **Purpose:** Load or select Stellar keys, with password popups as needed.

---

### Utility/Other Commands

#### `img-to-url`, `svg-to-data-url`, `png-to-data-url`
- **Purpose:** Convert images to base64 data URLs.
- **Usage:** Used by scripts or apps needing asset embedding.

#### `update-npm-modules`, `update-proprium-js-file`
- **Purpose:** Update local npm modules or JS files.

#### `custom-prompt`, `custom-choice-prompt`, etc.
- **Purpose:** Show popups for user interaction when required.

#### `version`, `about`, `splash`, `check`, `test`
- **Purpose:** Show version, about info, splash screen, or run test/setup checks.

---

## Security and Best Practices

- **ICP Account Management:**  
  The CLI interacts directly with `dfx`, which handles its own encryption and key management. Users should follow `dfx`'s best practices for wallet security.
- **Stellar Account Management:**  
  The CLI encrypts wallet/account data, making it more secure than the standard Stellar CLI (which stores seeds in plaintext).
- **Third-Party Dependencies:**  
  Many commands require external CLIs (e.g., `dfx`, `apptainer`, `pinggy`). These must be installed and configured on the host system.
- **Automation:**  
  Most commands are designed for non-interactive use and can be called from scripts. Popups are only used when user input is unavoidable.

---

## Extensibility

- **Future Support:**  
  The CLI is designed to be extensible. Support for additional blockchains, container systems, or asset types can be added as needed.

---

## Error Handling

- **Missing Dependencies:**  
  If a required CLI is not installed, related commands will fail. Ensure all dependencies are present.
- **Permissions:**  
  Some commands (e.g., those using `sudo` or writing to protected directories) may require elevated permissions.
- **Missing Data:**  
  Commands that require certain files or configuration (e.g., SIF file for Pintheon) will warn the user if prerequisites are not met.

---

## Example Integration: Blender

A typical workflow for a Blender script might be:
1. Call `parse-blender-hvym-collection` to process NFT metadata.
2. Use `icp-init` and `icp-update-model` to scaffold and update a blockchain project.
3. Use `pintheon-pull-popup` and `pintheon-start` to manage the Pintheon container for local testing or deployment.
4. Use account management commands as needed for blockchain operations.

---

## FAQ

**Q: Can I use this CLI directly as a user?**  
A: While possible, it is designed for use by other applications and scripts. Direct use is not the primary intent.

**Q: How do I ensure all dependencies are installed?**  
A: Install `dfx`, `apptainer`, `pinggy`, and any other required CLIs as per their official documentation.

**Q: Is my wallet/account data secure?**  
A: For ICP, security is handled by `dfx`. For Stellar, the Heavymeta CLI encrypts account data for improved security.

---

## Contact & Support

For questions, feature requests, or bug reports, please contact the Heavymeta development team or open an issue in the relevant repository. 