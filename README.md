# VS Code Fork Extension Installer

This Chrome extension allows you to install extensions directly from the Visual Studio Marketplace onto various VS Code forks like VSCodium, Code - OSS, Theia, and others by automatically modifying the installation links.

## Installation

1.  **Download:** Download the extension files (or clone this repository).
2.  **Open Chrome Extensions:** Open Google Chrome, type `chrome://extensions/` in the address bar, and press Enter.
3.  **Enable Developer Mode:** Ensure the "Developer mode" toggle in the top-right corner is enabled.
4.  **Load Unpacked:** Click the "Load unpacked" button.
5.  **Select Folder:** Navigate to and select the `VSCodeForkInstaller` folder containing the extension files (`manifest.json`, etc.).
6.  The extension should now be installed and visible in your extensions list.

## Usage

1.  **Click the Extension Icon:** Click the VS Code Fork Extension Installer icon in your Chrome toolbar.
2.  **Select Your Fork:** A popup window will appear. Use the dropdown menu to select the VS Code fork you are using (e.g., VSCodium, Code - OSS).
3.  **Save:** Click the "Save" button. A confirmation message will appear briefly.
4.  **Browse Marketplace:** Navigate to the [Visual Studio Marketplace](https://marketplace.visualstudio.com/).
5.  **Install Extensions:** Find an extension you want to install. The installation button/link should now be modified to say "Install on [Your Selected Fork]" and clicking it will attempt to launch the installation process in your chosen fork.

## Supported Forks

The extension currently supports modifying installation links for the following VS Code forks:

*   VSCodium (`codium:`)
*   Code - OSS (`code-oss:`)
*   Theia (`theia:`)
*   Trae (`trae:`)
*   Windsurf (`windsurf:`)
*   Cursor (`cursor:`)
*   Positron (`positron:`)
*   MarsCode (`marscode:`)

## Known Limitations & Disclaimer

*   **Functionality:** This extension only modifies the link protocol (`vscode:` to `yourfork:`). It does not guarantee that every extension from the marketplace is compatible with every fork.
*   **Marketplace Changes:** The Visual Studio Marketplace website structure might change, which could break the extension's ability to find and modify installation links. Error handling is included, but updates may be required.
*   **Terms of Use:** Modifying website behavior might be against the Visual Studio Marketplace terms of use. Use this extension at your own risk.

## Contributing

Contributions are very welcome. Feel free to submit pull requests for new features and bug fixes. For new features, ideally you would raise an issue for the proposed change first so that we can discuss ideas. This will go a long way to ensuring your pull request is accepted.

## License

This work is licensed under a GNU GENERAL PUBLIC LICENSE (v2)