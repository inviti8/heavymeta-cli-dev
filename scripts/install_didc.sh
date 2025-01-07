#!/usr/bin/env bash
set -eo pipefail

echo "Installing didc cli..."

BASE_DIR="${XDG_CONFIG_HOME:-$HOME}"
LOCAL_DIR="${LOCAL_DIR-"$BASE_DIR/.local"}"
DIDC_DIR="$LOCAL_DIR/share/didc"

BIN_URL="https://github.com/dfinity/candid/releases/download/2024-07-29/didc-linux64"
if [[ "$OSTYPE" == "darwin"* ]]; then
    BIN_URL="https://github.com/dfinity/candid/releases/download/2024-07-29/didc-macos"
fi

BIN_PATH="$DIDC_DIR/didc"

# Create didc directory and hvym binary if it doesn't exist.
mkdir -p "$DIDC_DIR"
curl -sSf -L "$BIN_URL" -o "$BIN_PATH"
chmod +x "$BIN_PATH"

# Store the correct profile file (i.e. .profile for bash or .zshenv for ZSH).
case $SHELL in
*/zsh)
    PROFILE="${ZDOTDIR-"$HOME"}/.zshenv"
    PREF_SHELL=zsh
    ;;
*/bash)
    PROFILE=$HOME/.bashrc
    PREF_SHELL=bash
    ;;
*/fish)
    PROFILE=$HOME/.config/fish/config.fish
    PREF_SHELL=fish
    ;;
*/ash)
    PROFILE=$HOME/.profile
    PREF_SHELL=ash
    ;;
*)
    echo "could not detect shell, manually add ${DIDC_DIR} to your PATH."
    exit 1
esac

# Only add hvym if it isn't already in PATH.
if [[ ":$PATH:" != *":${DIDC_DIR}:"* ]]; then
    # Add the hvym directory to the path and ensure the old PATH variables remain.
    # If the shell is fish, echo fish_add_path instead of export.
    if [[ "$PREF_SHELL" == "fish" ]]; then
        echo >> "$PROFILE" && echo "fish_add_path -a $DIDC_DIR" >> "$PROFILE"
    else
        echo >> "$PROFILE" && echo "export PATH=\"\$PATH:$DIDC_DIR\"" >> "$PROFILE"
    fi
fi