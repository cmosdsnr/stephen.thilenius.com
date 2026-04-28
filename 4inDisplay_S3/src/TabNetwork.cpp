/**
 * @file TabNetwork.cpp
 * @brief Network status and selection tab.
 */

#include "TabNetwork.h"
#include "HostName.h"
#include "Tabs.h"
#include "Report.h"
#include "Buzzer.h"
#include "Networks.h"

// ── Shared overlay layout (scan list + saved list) ────────────────────────────
#define OVL_BTN_Y       (TAB_H + 5)
#define OVL_BTN_H       32
#define OVL_LIST_TOP    (TAB_H + 44)
#define OVL_ROW_H       18
#define OVL_COL_LEFT    10
#define OVL_COL_RIGHT_R 472
#define BACK_BTN_X      5
#define BACK_BTN_W      80
#define ACTION_BTN_X    390   //!< Rescan / Edit button
#define ACTION_BTN_W    85
#define MANUAL_BTN_X    100   //!< Manual network entry button (scan list only)
#define MANUAL_BTN_W    90

// ── Main-view layout ──────────────────────────────────────────────────────────
#define MAIN_BTN_Y      (TAB_H + 8)
#define MAIN_BTN_H      32
#define MAIN_BTN_W      105
#define AP_BTN_X        155   //!< AP Mode button (between status and saved)
#define AP_BTN_W        90
#define SAVED_BTN_X     255
#define SCAN_BTN_X      370
#define STATUS_BTN_X    10    //!< Status badge (left of Saved/Scan buttons)
#define STATUS_BTN_W    135

// Info rows (below the button row)
#define INFO_ROW0_Y     (MAIN_BTN_Y + MAIN_BTN_H + 8)
#define INFO_ROW_DY     28
#define LABEL_X         10
#define VALUE_X         100

// ── On-screen keyboard geometry (480 × 320 display, TAB_H = 65) ──────────────
#define KB_PW_Y         (TAB_H + 5)    //!< top label y
#define KB_PW_FIELD_Y   (TAB_H + 24)   //!< entry field y
#define KB_PW_FIELD_H   26
#define KB_PW_FIELD_W   375            //!< field width (shorter to fit Show/Hide)
#define KB_PW_SHOW_X    382            //!< Show/Hide button x (382+93=475, 5px margin)
#define KB_PW_SHOW_W    93
#define KB_Y0           (TAB_H + 56)   //!< Key row 0 (QWERTY / numbers)
#define KB_KEY_H        38
#define KB_KEY_W        44
#define KB_STEP         46             //!< key_w + 2 px gap
#define KB_Y1           (KB_Y0 + 40)
#define KB_Y2           (KB_Y1 + 40)
#define KB_Y3           (KB_Y2 + 40)   //!< Shift + Mode + Space row
#define KB_BTN_Y        (KB_Y3 + 40)   //!< Cancel / Connect buttons
#define KB_BTN_H        34
// Row start X (centred on 480 px display)
#define KB_R0_X         11             //!< 10 keys: (480-10*44-9*2)/2
#define KB_R1_X         34             //!<  9 keys
#define KB_R2_X         11             //!<  7 letters, aligned with row 0
#define KB_BSP_X        333            //!< 11 + 7*46 = 333
#define KB_BSP_W        136            //!< fills to right edge
// Row 3: [Shift 72px] [Mode 72px] [Space 308px]  (all + gaps = 472, 8px margins)
#define KB_R3_SHIFT_X   8
#define KB_R3_SHIFT_W   72
#define KB_R3_MODE_X    86             //!< 8+72+6 gap
#define KB_R3_MODE_W    72
#define KB_R3_SP_X      164            //!< 86+72+6 gap
#define KB_R3_SP_W      308            //!< 164+308=472
// Cancel / Connect buttons
#define KB_CANCEL_X     10
#define KB_CANCEL_W     110
#define KB_CONN_X       360
#define KB_CONN_W       110

/**
 * @brief Draw a single rounded-rect key with centred label.
 */
static void drawKey(TFT_eSPI *tft, int16_t x, int16_t y, int16_t w, int16_t h,
                    const char *label, uint16_t bg, uint16_t fg)
{
    tft->fillRoundRect(x, y, w, h, 4, bg);
    tft->setTextColor(fg);
    tft->setTextDatum(MC_DATUM);
    tft->drawString(label, x + w / 2, y + h / 2);
}

// ── Constructor ───────────────────────────────────────────────────────────────

/**
 * @brief Construct a new Tab Network object.
 */
TabNetwork::TabNetwork(TFT_eSPI *tft, Networks *wifiNetworks) : Tab()
{
    name = "Network";
    _tft = tft;
    _wifiNetworks = wifiNetworks;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;
    scanning = true;
}

// ── Main view ─────────────────────────────────────────────────────────────────

/**
 * @brief Draws the network tab main view.
 *
 * Status badge (Connected / Connecting... / AP Mode / Not Connected),
 * Saved and Scan buttons, then IP / SSID / RSSI / MAC / GW / DNS rows.
 */
void TabNetwork::draw()
{
    changed = false;
    //! Sync cached state so loop() doesn't immediately re-trigger a draw
    ip          = WiFi.localIP();
    ssid        = _wifiNetworks->getSelectedSSID();
    rssi        = _wifiNetworks->getSelectedRSSI();
    _connecting = _wifiNetworks->isConnecting();
    _apMode     = _wifiNetworks->isApMode();
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);

    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextDatum(MC_DATUM);

    // ── Status badge ─────────────────────────────────────────────────────────
    uint16_t statusColor;
    const char *statusLabel;
    if (_wifiNetworks->isApMode())
    {
        statusColor = TFT_RED;
        statusLabel = "AP Mode";
    }
    else if (_wifiNetworks->isConnecting())
    {
        statusColor = TFT_ORANGE;
        statusLabel = "Connecting...";
    }
    else if (ip != IPAddress(0, 0, 0, 0))
    {
        statusColor = 0x03E0; // dark green
        statusLabel = "Connected";
    }
    else
    {
        statusColor = TFT_DARKGREY;
        statusLabel = "Not Connected";
    }
    _tft->fillRoundRect(STATUS_BTN_X, MAIN_BTN_Y, STATUS_BTN_W, MAIN_BTN_H, 6, statusColor);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString(statusLabel, STATUS_BTN_X + STATUS_BTN_W / 2, MAIN_BTN_Y + MAIN_BTN_H / 2);

    // ── AP Mode / Saved / Scan buttons ───────────────────────────────────────
    _tft->fillRoundRect(AP_BTN_X, MAIN_BTN_Y, AP_BTN_W, MAIN_BTN_H, 6, _wifiNetworks->isApMode() ? TFT_RED : TFT_DARKGREY);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString("AP Mode", AP_BTN_X + AP_BTN_W / 2, MAIN_BTN_Y + MAIN_BTN_H / 2);

    _tft->fillRoundRect(SAVED_BTN_X, MAIN_BTN_Y, MAIN_BTN_W, MAIN_BTN_H, 6, TFT_DARKGREY);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString("Saved", SAVED_BTN_X + MAIN_BTN_W / 2, MAIN_BTN_Y + MAIN_BTN_H / 2);

    _tft->fillRoundRect(SCAN_BTN_X, MAIN_BTN_Y, MAIN_BTN_W, MAIN_BTN_H, 6, TFT_DARKGREY);
    _tft->drawString("Scan", SCAN_BTN_X + MAIN_BTN_W / 2, MAIN_BTN_Y + MAIN_BTN_H / 2);

    _tft->setTextDatum(TL_DATUM);

    // ── Info rows ─────────────────────────────────────────────────────────────
    _tft->setFreeFont(nullptr);
    _tft->setTextFont(4);

    int y = INFO_ROW0_Y;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("IP:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(ip.toString());
    y += INFO_ROW_DY;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("SSID:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(ssid);
    y += INFO_ROW_DY;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("RSSI:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(String(rssi) + " dBm");
    y += INFO_ROW_DY;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("MAC:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(WiFi.macAddress());
    y += INFO_ROW_DY;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("GW:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(WiFi.gatewayIP().toString());
    y += INFO_ROW_DY;

    _tft->setTextColor(TFT_BLACK); _tft->setCursor(LABEL_X, y); _tft->print("DNS:");
    _tft->setTextColor(TFT_BLUE);  _tft->setCursor(VALUE_X, y); _tft->print(WiFi.dnsIP().toString());

    // ── Device name at bottom right ───────────────────────────────────────────
    String str = REPORT_NAME;
    _tft->setTextFont(2);
    _tft->setTextColor(TFT_BLACK);
    _tft->setCursor(_tft->width() - 10 - _tft->textWidth(str.c_str()), _tft->height() - 10);
    _tft->printf("%s", str.c_str());
}

// ── Overlays ──────────────────────────────────────────────────────────────────

/**
 * @brief Draw the full-screen scan list overlay.
 *
 * Networks are sorted by RSSI (strongest first). Buttons: Back, Manual, Rescan.
 * Tap a network row to open the password keyboard.
 */
void TabNetwork::drawScanList()
{
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
    _tft->setFreeFont(&FreeSans9pt7b);

    // Back button
    _tft->fillRoundRect(BACK_BTN_X, OVL_BTN_Y, BACK_BTN_W, OVL_BTN_H, 5, TFT_DARKGREY);
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextDatum(MC_DATUM);
    _tft->drawString("Back", BACK_BTN_X + BACK_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);

    // Manual entry button
    _tft->fillRoundRect(MANUAL_BTN_X, OVL_BTN_Y, MANUAL_BTN_W, OVL_BTN_H, 5, TFT_NAVY);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString("Manual", MANUAL_BTN_X + MANUAL_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);

    // Rescan button
    _tft->fillRoundRect(ACTION_BTN_X, OVL_BTN_Y, ACTION_BTN_W, OVL_BTN_H, 5, TFT_BLUE);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString("Rescan", ACTION_BTN_X + ACTION_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);

    // Column headers
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextDatum(TL_DATUM);
    _tft->drawString("SSID", OVL_COL_LEFT, OVL_LIST_TOP);
    _tft->setTextDatum(TR_DATUM);
    _tft->drawString("dBm", OVL_COL_RIGHT_R, OVL_LIST_TOP);
    _tft->drawFastHLine(0, OVL_LIST_TOP + OVL_ROW_H - 2, _tft->width(), TFT_DARKGREY);

    // Network rows (returned sorted by RSSI via getVisibleNetworks)
    int count;
    VisibleNetwork *networks = _wifiNetworks->getVisibleNetworks(count);
    char buf[8];
    for (int j = 0; j < count; j++)
    {
        int y = OVL_LIST_TOP + OVL_ROW_H + 4 + j * OVL_ROW_H;
        if (y + OVL_ROW_H > _tft->height()) break;
        _tft->setTextColor(TFT_BLACK);
        _tft->setTextDatum(TL_DATUM);
        _tft->drawString(networks[j].ssid.substring(0, 30).c_str(), OVL_COL_LEFT, y);
        _tft->setTextDatum(TR_DATUM);
        snprintf(buf, sizeof(buf), "%d", networks[j].rssi);
        _tft->drawString(buf, OVL_COL_RIGHT_R, y);
    }
    delete[] networks;

    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Draw the full-screen saved-networks overlay.
 *
 * Shows "In range" and "Not found" sections. Edit button toggles tap-to-forget
 * mode: rows turn red with an X indicator; tapping any row removes it.
 */
void TabNetwork::drawSavedList()
{
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
    _tft->setFreeFont(&FreeSans9pt7b);

    // Back button
    _tft->fillRoundRect(BACK_BTN_X, OVL_BTN_Y, BACK_BTN_W, OVL_BTN_H, 5, TFT_DARKGREY);
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextDatum(MC_DATUM);
    _tft->drawString("Back", BACK_BTN_X + BACK_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);

    // Edit / Done button
    uint16_t editBtnColor = _deleteMode ? TFT_ORANGE : TFT_DARKGREY;
    _tft->fillRoundRect(ACTION_BTN_X, OVL_BTN_Y, ACTION_BTN_W, OVL_BTN_H, 5, editBtnColor);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString(_deleteMode ? "Done" : "Edit", ACTION_BTN_X + ACTION_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);

    int count;
    SavedNetwork *saved = _wifiNetworks->getSavedNetworks(count);
    int y = OVL_LIST_TOP;

    // ── Section 1: In range ───────────────────────────────────────────────────
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(_deleteMode ? "Tap to forget:" : "In range  (tap to connect)", OVL_COL_LEFT, y);
    _tft->setTextDatum(TR_DATUM);
    if (!_deleteMode) _tft->drawString("dBm", OVL_COL_RIGHT_R, y);
    _tft->drawFastHLine(0, y + OVL_ROW_H - 2, _tft->width(), TFT_DARKGREY);
    y += OVL_ROW_H + 4;

    for (int i = 0; i < count; i++)
    {
        if (!saved[i].visible) continue;
        if (y + OVL_ROW_H > _tft->height()) break;
        uint16_t rowColor = _deleteMode ? TFT_RED
                          : (_wifiNetworks->isSelected(i) ? TFT_BLUE : TFT_BLACK);
        _tft->setTextColor(rowColor);
        _tft->setTextDatum(TL_DATUM);
        _tft->drawString(saved[i].ssid.substring(0, 30).c_str(), OVL_COL_LEFT, y);
        _tft->setTextDatum(TR_DATUM);
        if (_deleteMode)
        {
            _tft->drawString("X", OVL_COL_RIGHT_R, y);
        }
        else
        {
            char buf[8];
            snprintf(buf, sizeof(buf), "%d", saved[i].rssi);
            _tft->drawString(buf, OVL_COL_RIGHT_R, y);
        }
        y += OVL_ROW_H;
    }

    // ── Section 2: Not found ──────────────────────────────────────────────────
    y += 8;
    if (y + OVL_ROW_H <= _tft->height())
    {
        _tft->setTextDatum(TL_DATUM);
        _tft->setTextColor(_deleteMode ? TFT_RED : TFT_DARKGREY);
        _tft->drawString("Not found", OVL_COL_LEFT, y);
        _tft->drawFastHLine(0, y + OVL_ROW_H - 2, _tft->width(), TFT_LIGHTGREY);
        y += OVL_ROW_H + 4;

        for (int i = 0; i < count; i++)
        {
            if (saved[i].visible) continue;
            if (y + OVL_ROW_H > _tft->height()) break;
            _tft->setTextColor(_deleteMode ? TFT_RED : TFT_DARKGREY);
            _tft->setTextDatum(TL_DATUM);
            _tft->drawString(saved[i].ssid.substring(0, 30).c_str(), OVL_COL_LEFT, y);
            if (_deleteMode)
            {
                _tft->setTextDatum(TR_DATUM);
                _tft->drawString("X", OVL_COL_RIGHT_R, y);
            }
            y += OVL_ROW_H;
        }
    }

    delete[] saved;
    _tft->setTextDatum(TL_DATUM);
}

// ── Keyboard ──────────────────────────────────────────────────────────────────

/**
 * @brief Redraws only the entry field and the Show/Hide button.
 *
 * When _enteringSSID: shows the SSID text being typed (full-width field, no Show/Hide).
 * When entering password: shows stars or plain text plus the Show/Hide toggle.
 */
void TabNetwork::redrawPwField()
{
    int fieldW = _enteringSSID ? 470 : KB_PW_FIELD_W;
    _tft->fillRoundRect(5, KB_PW_FIELD_Y, fieldW, KB_PW_FIELD_H, 4, TFT_WHITE);
    _tft->drawRoundRect(5, KB_PW_FIELD_Y, fieldW, KB_PW_FIELD_H, 4, TFT_DARKGREY);

    _tft->setFreeFont(&FreeSans9pt7b);
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextDatum(ML_DATUM);

    String display;
    if (_enteringSSID)
    {
        display = _kbSSID + "|";
    }
    else if (_showPw)
    {
        display = _kbPassword + "|";
    }
    else
    {
        for (unsigned int i = 0; i < _kbPassword.length(); i++) display += '*';
        display += '|';
    }
    _tft->drawString(display.c_str(), 10, KB_PW_FIELD_Y + KB_PW_FIELD_H / 2);

    // Show/Hide button — only when entering a password
    if (!_enteringSSID)
    {
        uint16_t btnColor = _showPw ? 0x03E0 : TFT_DARKGREY; // dark green = visible
        _tft->fillRoundRect(KB_PW_SHOW_X, KB_PW_FIELD_Y, KB_PW_SHOW_W, KB_PW_FIELD_H, 4, btnColor);
        _tft->setTextColor(TFT_WHITE);
        _tft->setTextDatum(MC_DATUM);
        _tft->drawString(_showPw ? "Hide" : "Show",
                         KB_PW_SHOW_X + KB_PW_SHOW_W / 2, KB_PW_FIELD_Y + KB_PW_FIELD_H / 2);
    }

    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Draw the full-screen on-screen keyboard overlay.
 *
 * Rows: QWERTY or 123 keys, then Shift | Mode | Space, then Cancel / Next-or-Connect.
 * Key labels reflect current case (_kbCaps). Shift button is blue when uppercase active.
 */
void TabNetwork::drawKeyboard()
{
    _tft->fillRect(0, TAB_H - CORNER_RADIUS, _tft->width(), _tft->height() - TAB_H + CORNER_RADIUS, bgColor);
    _tft->setFreeFont(&FreeSans9pt7b);

    // Top label: "Enter SSID:" when in SSID entry mode, otherwise show the target SSID
    _tft->setTextColor(TFT_BLACK);
    _tft->setTextDatum(TL_DATUM);
    if (_enteringSSID)
        _tft->drawString("Enter SSID:", 5, KB_PW_Y);
    else
        _tft->drawString(_kbSSID.substring(0, 30).c_str(), 5, KB_PW_Y);

    redrawPwField();

    // Key character maps
    static const char *R0[] = {"Q","W","E","R","T","Y","U","I","O","P"};
    static const char *R1[] = {"A","S","D","F","G","H","J","K","L"};
    static const char *R2[] = {"Z","X","C","V","B","N","M"};
    static const char *N0[] = {"1","2","3","4","5","6","7","8","9","0"};
    static const char *N1[] = {"!","@","#","$","%","^","&","*","/"};
    static const char *N2[] = {"-","_",".",  "(",")","+","="};

    const char **row0 = _kbNumbers ? N0 : R0;
    const char **row1 = _kbNumbers ? N1 : R1;
    const char **row2 = _kbNumbers ? N2 : R2;

    // Letter rows: show lowercase labels when caps is off and not in number mode
    for (int i = 0; i < 10; i++) {
        String lbl = String(row0[i]);
        if (!_kbNumbers && !_kbCaps) lbl.toLowerCase();
        drawKey(_tft, KB_R0_X + i * KB_STEP, KB_Y0, KB_KEY_W, KB_KEY_H, lbl.c_str(), TFT_LIGHTGREY, TFT_BLACK);
    }
    for (int i = 0; i < 9; i++) {
        String lbl = String(row1[i]);
        if (!_kbNumbers && !_kbCaps) lbl.toLowerCase();
        drawKey(_tft, KB_R1_X + i * KB_STEP, KB_Y1, KB_KEY_W, KB_KEY_H, lbl.c_str(), TFT_LIGHTGREY, TFT_BLACK);
    }
    for (int i = 0; i < 7; i++) {
        String lbl = String(row2[i]);
        if (!_kbNumbers && !_kbCaps) lbl.toLowerCase();
        drawKey(_tft, KB_R2_X + i * KB_STEP, KB_Y2, KB_KEY_W, KB_KEY_H, lbl.c_str(), TFT_LIGHTGREY, TFT_BLACK);
    }

    // Backspace — wide key at end of row 2
    drawKey(_tft, KB_BSP_X, KB_Y2, KB_BSP_W, KB_KEY_H, "<", TFT_ORANGE, TFT_WHITE);

    // Row 3: Shift | Mode | Space
    uint16_t shiftColor = (!_kbNumbers && _kbCaps) ? TFT_BLUE : TFT_DARKGREY;
    drawKey(_tft, KB_R3_SHIFT_X, KB_Y3, KB_R3_SHIFT_W, KB_KEY_H,
            _kbCaps ? "ABC" : "abc", shiftColor, TFT_WHITE);
    drawKey(_tft, KB_R3_MODE_X, KB_Y3, KB_R3_MODE_W, KB_KEY_H,
            _kbNumbers ? "ABC" : "123", TFT_DARKGREY, TFT_WHITE);
    drawKey(_tft, KB_R3_SP_X, KB_Y3, KB_R3_SP_W, KB_KEY_H, "Space", TFT_LIGHTGREY, TFT_BLACK);

    // Cancel / Next-or-Connect buttons
    drawKey(_tft, KB_CANCEL_X, KB_BTN_Y, KB_CANCEL_W, KB_BTN_H, "Cancel", TFT_DARKGREY, TFT_WHITE);
    drawKey(_tft, KB_CONN_X,   KB_BTN_Y, KB_CONN_W,   KB_BTN_H,
            _enteringSSID ? "Next" : "Connect", TFT_BLUE, TFT_WHITE);

    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Handle touch input while the keyboard overlay is active.
 *
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 */
void TabNetwork::handleKeyboard(uint16_t x, uint16_t y)
{
    // ── Show/Hide password button ─────────────────────────────────────────────
    if (!_enteringSSID &&
        y >= KB_PW_FIELD_Y && y < (uint16_t)(KB_PW_FIELD_Y + KB_PW_FIELD_H) &&
        x >= KB_PW_SHOW_X  && x < (uint16_t)(KB_PW_SHOW_X + KB_PW_SHOW_W))
    {
        quickBeep();
        _showPw = !_showPw;
        redrawPwField();
        return;
    }

    static const char *R0[] = {"Q","W","E","R","T","Y","U","I","O","P"};
    static const char *R1[] = {"A","S","D","F","G","H","J","K","L"};
    static const char *R2[] = {"Z","X","C","V","B","N","M"};
    static const char *N0[] = {"1","2","3","4","5","6","7","8","9","0"};
    static const char *N1[] = {"!","@","#","$","%","^","&","*","/"};
    static const char *N2[] = {"-","_",".",  "(",")","+","="};

    // ── Cancel / Next-or-Connect ──────────────────────────────────────────────
    if (y >= KB_BTN_Y && y < KB_BTN_Y + KB_BTN_H)
    {
        if (x >= KB_CANCEL_X && x < KB_CANCEL_X + KB_CANCEL_W)
        {
            quickBeep();
            _showKeyboard = false;
            _showScanList = true;
            _enteringSSID = false;
            _showPw       = false;
            drawScanList();
        }
        else if (x >= KB_CONN_X && x < KB_CONN_X + KB_CONN_W)
        {
            quickBeep();
            if (_enteringSSID)
            {
                if (_kbSSID.length() == 0) return; // require non-empty SSID
                _enteringSSID = false;
                _kbPassword   = "";
                _kbCaps       = true;
                _kbNumbers    = false;
                _showPw       = false;
                drawKeyboard();
            }
            else
            {
                attemptConnect();
            }
        }
        return;
    }

    bool edited = false;

    // Helper: append a character to the active field with correct case
    auto appendChar = [&](const char *ch) {
        String s = String(ch);
        if (!_kbNumbers && !_kbCaps) s.toLowerCase();
        if (_enteringSSID) _kbSSID    += s;
        else               _kbPassword += s;
        edited = true;
    };

    // ── Key rows ──────────────────────────────────────────────────────────────
    if (y >= KB_Y0 && y < KB_Y0 + KB_KEY_H)
    {
        const char **row = _kbNumbers ? N0 : R0;
        int col = (x - KB_R0_X) / KB_STEP;
        int kx  = KB_R0_X + col * KB_STEP;
        if (col >= 0 && col < 10 && x >= (uint16_t)kx && x < (uint16_t)(kx + KB_KEY_W))
        { quickBeep(); appendChar(row[col]); }
    }
    else if (y >= KB_Y1 && y < KB_Y1 + KB_KEY_H)
    {
        const char **row = _kbNumbers ? N1 : R1;
        int col = (x - KB_R1_X) / KB_STEP;
        int kx  = KB_R1_X + col * KB_STEP;
        if (col >= 0 && col < 9 && x >= (uint16_t)kx && x < (uint16_t)(kx + KB_KEY_W))
        { quickBeep(); appendChar(row[col]); }
    }
    else if (y >= KB_Y2 && y < KB_Y2 + KB_KEY_H)
    {
        if (x >= KB_BSP_X && x < KB_BSP_X + KB_BSP_W)
        {
            quickBeep();
            if (_enteringSSID) { if (_kbSSID.length()     > 0) _kbSSID.remove(_kbSSID.length() - 1); }
            else               { if (_kbPassword.length() > 0) _kbPassword.remove(_kbPassword.length() - 1); }
            edited = true;
        }
        else
        {
            const char **row = _kbNumbers ? N2 : R2;
            int col = (x - KB_R2_X) / KB_STEP;
            int kx  = KB_R2_X + col * KB_STEP;
            if (col >= 0 && col < 7 && x >= (uint16_t)kx && x < (uint16_t)(kx + KB_KEY_W))
            { quickBeep(); appendChar(row[col]); }
        }
    }
    else if (y >= KB_Y3 && y < KB_Y3 + KB_KEY_H)
    {
        // Shift (toggle caps)
        if (x >= KB_R3_SHIFT_X && x < KB_R3_SHIFT_X + KB_R3_SHIFT_W)
        {
            quickBeep();
            _kbCaps = !_kbCaps;
            drawKeyboard();
            return;
        }
        // Mode toggle (123 / ABC)
        if (x >= KB_R3_MODE_X && x < KB_R3_MODE_X + KB_R3_MODE_W)
        {
            quickBeep();
            _kbNumbers = !_kbNumbers;
            drawKeyboard();
            return;
        }
        // Space
        if (x >= KB_R3_SP_X && x < KB_R3_SP_X + KB_R3_SP_W)
        {
            quickBeep();
            if (_enteringSSID) _kbSSID    += ' ';
            else               _kbPassword += ' ';
            edited = true;
        }
    }

    if (edited)
        redrawPwField();
}

/**
 * @brief Save password and attempt WiFi connection to the keyboard SSID.
 *
 * Calls addPassword() which persists to flash; if the network is currently
 * visible in scan results, wifiConnect() is called immediately. Returns to
 * main view.
 */
void TabNetwork::attemptConnect()
{
    _showKeyboard = false;
    _showPw       = false;
    _wifiNetworks->addPassword(_kbSSID, _kbPassword);
    draw();
}

// ── Loop ──────────────────────────────────────────────────────────────────────

/**
 * @brief Periodically checks for network state changes and redraws.
 */
void TabNetwork::loop()
{
    bool nowConnecting = _wifiNetworks->isConnecting();
    bool nowApMode     = _wifiNetworks->isApMode();

    if (ip          != WiFi.localIP()                   ||
        ssid        != _wifiNetworks->getSelectedSSID() ||
        rssi        != _wifiNetworks->getSelectedRSSI() ||
        _connecting != nowConnecting                     ||
        _apMode     != nowApMode)
    {
        ip          = WiFi.localIP();
        ssid        = _wifiNetworks->getSelectedSSID();
        rssi        = _wifiNetworks->getSelectedRSSI();
        _connecting = nowConnecting;
        _apMode     = nowApMode;
        if (!_showScanList && !_showSavedList && !_showKeyboard)
            draw();
    }

    static long lastMillis = millis();
    if (millis() - lastMillis > 5000)
        if (_wifiNetworks->didNetworksChange())
        {
            if (_showScanList)
                drawScanList();
            else if (_showSavedList)
                drawSavedList();
            else if (!_showKeyboard)
                draw();
            lastMillis = millis();
        }
}

// ── Touch handler ─────────────────────────────────────────────────────────────

/**
 * @brief Handles touch events on the network tab.
 *
 * @param x Touch X coordinate
 * @param y Touch Y coordinate
 * @param lastClick Milliseconds since the last touch event
 */
void TabNetwork::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // ── Keyboard overlay ──────────────────────────────────────────────────────
    if (_showKeyboard)
    {
        handleKeyboard(x, y);
        return;
    }

    // ── Scan list overlay ─────────────────────────────────────────────────────
    if (_showScanList)
    {
        // Back
        if (x >= BACK_BTN_X && x <= BACK_BTN_X + BACK_BTN_W &&
            y >= OVL_BTN_Y  && y <= OVL_BTN_Y + OVL_BTN_H)
        {
            quickBeep();
            _showScanList = false;
            draw();
        }
        // Manual entry — open keyboard for typing a hidden SSID
        else if (x >= MANUAL_BTN_X && x <= MANUAL_BTN_X + MANUAL_BTN_W &&
                 y >= OVL_BTN_Y    && y <= OVL_BTN_Y + OVL_BTN_H)
        {
            quickBeep();
            _kbSSID       = "";
            _kbPassword   = "";
            _kbNumbers    = false;
            _kbCaps       = true;
            _showPw       = false;
            _enteringSSID = true;
            _showScanList = false;
            _showKeyboard = true;
            drawKeyboard();
        }
        // Rescan
        else if (x >= ACTION_BTN_X && x <= ACTION_BTN_X + ACTION_BTN_W &&
                 y >= OVL_BTN_Y    && y <= OVL_BTN_Y + OVL_BTN_H)
        {
            quickBeep();
            _tft->fillRoundRect(ACTION_BTN_X, OVL_BTN_Y, ACTION_BTN_W, OVL_BTN_H, 5, TFT_DARKGREY);
            _tft->setFreeFont(&FreeSans9pt7b);
            _tft->setTextColor(TFT_WHITE);
            _tft->setTextDatum(MC_DATUM);
            _tft->drawString("Scanning...", ACTION_BTN_X + ACTION_BTN_W / 2, OVL_BTN_Y + OVL_BTN_H / 2);
            _tft->setTextDatum(TL_DATUM);
            _wifiNetworks->scanNetworks();
            drawScanList();
        }
        // Tap a network row → open password keyboard
        else if (y > OVL_LIST_TOP + OVL_ROW_H)
        {
            int j = (y - OVL_LIST_TOP - OVL_ROW_H - 4) / OVL_ROW_H;
            int count;
            VisibleNetwork *nets = _wifiNetworks->getVisibleNetworks(count);
            if (nets && j >= 0 && j < count)
            {
                quickBeep();
                _kbSSID       = nets[j].ssid;
                _kbPassword   = "";
                _kbNumbers    = false;
                _kbCaps       = true;
                _showPw       = false;
                _enteringSSID = false;
                _showScanList = false;
                _showKeyboard = true;
                drawKeyboard();
            }
            delete[] nets;
        }
        return;
    }

    // ── Saved list overlay ────────────────────────────────────────────────────
    if (_showSavedList)
    {
        // Back
        if (x >= BACK_BTN_X && x <= BACK_BTN_X + BACK_BTN_W &&
            y >= OVL_BTN_Y  && y <= OVL_BTN_Y + OVL_BTN_H)
        {
            quickBeep();
            _deleteMode    = false;
            _showSavedList = false;
            draw();
        }
        // Edit / Done toggle
        else if (x >= ACTION_BTN_X && x <= ACTION_BTN_X + ACTION_BTN_W &&
                 y >= OVL_BTN_Y    && y <= OVL_BTN_Y + OVL_BTN_H)
        {
            quickBeep();
            _deleteMode = !_deleteMode;
            drawSavedList();
        }
        // Tap a network row
        else if (y > OVL_LIST_TOP + OVL_ROW_H)
        {
            int count;
            SavedNetwork *saved = _wifiNetworks->getSavedNetworks(count);

            // ── Section 1: In range ───────────────────────────────────────────
            int secTop   = OVL_LIST_TOP + OVL_ROW_H + 4;
            int visCount = 0;
            for (int i = 0; i < count; i++)
                if (saved[i].visible) visCount++;
            int secBot = secTop + visCount * OVL_ROW_H;

            if (y >= (uint16_t)secTop && y < (uint16_t)secBot)
            {
                int visRow = (y - secTop) / OVL_ROW_H;
                int v = 0;
                for (int i = 0; i < count; i++)
                {
                    if (!saved[i].visible) continue;
                    if (v == visRow)
                    {
                        quickBeep();
                        if (_deleteMode)
                        {
                            _wifiNetworks->removeNetwork(i);
                            Report.printf("forgot saved[%d]\r\n", i);
                            delete[] saved;
                            drawSavedList();
                            return;
                        }
                        else
                        {
                            _wifiNetworks->selectNetwork(i);
                            Report.printf("selected saved[%d]\r\n", i);
                            delete[] saved;
                            _showSavedList = false;
                            _deleteMode    = false;
                            draw();
                            return;
                        }
                    }
                    v++;
                }
            }
            else if (_deleteMode)
            {
                // ── Section 2: Not found (only deletable in Edit mode) ────────
                // sec2Top mirrors the drawSavedList layout:
                // secBot + 8 (gap) + OVL_ROW_H + 4 (header+divider)
                int sec2Top = secBot + 8 + OVL_ROW_H + 4;
                if (y >= (uint16_t)sec2Top)
                {
                    int notRow = (y - sec2Top) / OVL_ROW_H;
                    int n = 0;
                    for (int i = 0; i < count; i++)
                    {
                        if (saved[i].visible) continue;
                        if (n == notRow)
                        {
                            quickBeep();
                            _wifiNetworks->removeNetwork(i);
                            Report.printf("forgot not-found saved[%d]\r\n", i);
                            drawSavedList();
                            break;
                        }
                        n++;
                    }
                }
            }

            delete[] saved;
        }
        return;
    }

    // ── Main view ─────────────────────────────────────────────────────────────
    if (x >= AP_BTN_X && x <= AP_BTN_X + AP_BTN_W &&
        y >= MAIN_BTN_Y && y <= MAIN_BTN_Y + MAIN_BTN_H)
    {
        quickBeep();
        _wifiNetworks->enterApMode();
    }
    else if (x >= SAVED_BTN_X && x <= SAVED_BTN_X + MAIN_BTN_W &&
        y >= MAIN_BTN_Y  && y <= MAIN_BTN_Y + MAIN_BTN_H)
    {
        quickBeep();
        _deleteMode    = false;
        _showSavedList = true;
        drawSavedList();
    }
    else if (x >= SCAN_BTN_X && x <= SCAN_BTN_X + MAIN_BTN_W &&
             y >= MAIN_BTN_Y && y <= MAIN_BTN_Y + MAIN_BTN_H)
    {
        quickBeep();
        _showScanList = true;
        drawScanList();
    }
}
