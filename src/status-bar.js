// src/status-bar.js

const vscode = require('vscode');
const { STATUS_BAR } = require('./constants');

/**
 * Reference to the status bar item
 */
let statusBarItem = null;

/**
 * Creates the status bar item if it doesn't exist
 */
function createStatusBarItem() {
    if (statusBarItem === null) {
        statusBarItem = vscode.window.createStatusBarItem(
            vscode.StatusBarAlignment.Left,
            STATUS_BAR.PRIORITY
        );
        statusBarItem.show();
    }
    return statusBarItem;
}

/**
 * Updates the status bar with the given configuration
 * @param {Object} config - Object with text, tooltip, and command properties
 */
function updateStatusBar(config) {
    const item = createStatusBarItem();
    item.text = config.text;
    item.tooltip = config.tooltip;
    item.command = config.command;
}

/**
 * Returns the status bar item (creates it if necessary)
 */
function getStatusBarItem() {
    return createStatusBarItem();
}

/**
 * Disposes the status bar item
 */
function disposeStatusBar() {
    if (statusBarItem !== null) {
        statusBarItem.dispose();
        statusBarItem = null;
    }
}

module.exports = {
    updateStatusBar,
    getStatusBarItem,
    disposeStatusBar
};