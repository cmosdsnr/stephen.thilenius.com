/**
 * @file TabStatus.cpp
 * @brief Sprinkler rules list / edit tab implementation.
 *
 * Views:
 *   LIST  — scrollable rule list with Add button; tap row to edit, tap ✗ to delete.
 *   EDIT  — day toggles, start-time ±, per-channel duration ±, Save / Delete / Back.
 *
 * Edit view interaction:
 *   - Tap the time or a duration value to expand it (showing - / + step buttons).
 *   - Tap anywhere else to collapse the expanded control.
 *   - Short tap: ±1 min.  Long-hold (≥750 ms): ±5 min every 750 ms.
 */

#ifdef SPRINKLER_NEW
#include <cstring>
#include "Tabs.h"
#include "SprinklerNew/TabStatus.h"
#include "SprinklerNew/Structs.h"
#include "SprinklerNew/DataFile.h"
#include "Report.h"
#include "Buzzer.h"
#include "Colors.h"

// ── Static label tables ───────────────────────────────────────────────────────
static const char *DAY_ABBR[]  = { "Su","Mo","Tu","We","Th","Fr","Sa" };
// Only EDIT_CHANNELS labels used in UI (excludes spare ch6)
static const char *CH_LABEL[]  = { "Pmp","Ch1","Ch2","Ch3","Ch4","Ch5" };

// ── Edit view layout constants ────────────────────────────────────────────────
// All y-values relative to _top.
static const int kSepY1    = 90;   ///< Separator below day buttons
static const int kStZoneY  = 91;   ///< Start-time zone top (44 px tall)
static const int kStZoneH  = 43;   ///< Start-time zone height
static const int kSepY2    = 134;  ///< Separator below start-time zone
static const int kDurLblY  = 137;  ///< "Durations" label y
static const int kDurRowY  = 152;  ///< First duration row top
static const int kDurRowH  = 34;   ///< Duration row height (fits font-4 value + margin)
static const int kDurBtnH  = 28;   ///< Height of the ±  step buttons

// ─────────────────────────────────────────────────────────────────────────────
// Constructor / destructor
// ─────────────────────────────────────────────────────────────────────────────

TabStatus::TabStatus(TFT_eSPI *tft) : Tab()
{
    name = "Status";
    _tft = tft;
    nameWidth = _tft->textWidth(name.c_str());
    changed = true;

    _top = TAB_H - CORNER_RADIUS + 1;
    _w   = _tft->width();
    _h   = _tft->height() - _top;

    memset(_editDurations, 0, sizeof(_editDurations));
    for (int i = 0; i < NUM_DAYS; i++) _dayButtons[i] = nullptr;

    // ── List-view buttons ─────────────────────────────────────────────────────
    _addButton = new Button(_tft, _w - 80, _top + 4, 75, 28, "+ Add",
        rgbTo565(150, 215, 170), TFT_BLACK,
        [this]() { quickBeep(); openEdit(-1); });

    // ── Edit-view navigation buttons ──────────────────────────────────────────
    _backButton = new Button(_tft, 5, _top + 4, 65, 28, "Back",
        TFT_CYAN, TFT_BLACK,
        [this]() { quickBeep(); _view = VIEW_LIST; drawList(); });

    _saveButton = new Button(_tft, _w - 85, _top + 4, 80, 28, "Save",
        TFT_GREEN, TFT_BLACK,
        [this]() {
            quickBeep();
            FwRule r;
            r.startTime = _editStartTime;
            r.dayMask   = _editDayMask;
            memcpy(r.durations, _editDurations, NUM_CHANNELS);
            if (_editIndex < 0) {
                if (_ruleCount < MAX_RULES) _rules[_ruleCount++] = r;
            } else {
                _rules[_editIndex] = r;
            }
            applyRulesToSchedule();
            _view = VIEW_LIST;
            drawList();
        });

    _delButton = new Button(_tft, _w - 170, _top + 4, 80, 28, "Delete",
        TFT_RED, TFT_WHITE,
        [this]() {
            quickBeep();
            if (_editIndex >= 0 && _editIndex < _ruleCount) {
                for (int i = _editIndex; i < _ruleCount - 1; i++)
                    _rules[i] = _rules[i + 1];
                _ruleCount--;
                applyRulesToSchedule();
            }
            _view = VIEW_LIST;
            drawList();
        });

    // ── Day toggle buttons (14, two rows of 7) ────────────────────────────────
    int dayColW = (_w - 38) / 7;
    for (int i = 0; i < NUM_DAYS; i++) {
        int col = i % 7;
        int by  = _top + 36 + (i < 7 ? 0 : 26);
        _dayButtons[i] = new Button(_tft,
            38 + col * dayColW, by, dayColW - 2, 24,
            DAY_ABBR[i % 7], TFT_DARKGREY, TFT_WHITE,
            [this, i]() {
                quickBeep();
                _editDayMask ^= (1u << i);
                drawDayButton(i);
            });
    }
    // Time and duration buttons are drawn directly (not Button objects).
    // Rules are derived lazily in drawList() after schedule is loaded.
}

TabStatus::~TabStatus()
{
    delete _addButton;
    delete _backButton;
    delete _saveButton;
    delete _delButton;
    for (int i = 0; i < NUM_DAYS; i++) delete _dayButtons[i];
}

// ── API stubs ────────────────────────────────────────────────────────────────

void TabStatus::SetBoundary(BoundaryData /*boundary*/) { /* unused */ }

void TabStatus::refreshRules() { _ruleCount = 0; changed = true; }

// ─────────────────────────────────────────────────────────────────────────────
// Rule derivation
// ─────────────────────────────────────────────────────────────────────────────

void TabStatus::addOrMergeRule(uint16_t startTime, int day, uint8_t durations[])
{
    for (int i = 0; i < _ruleCount; i++) {
        if (_rules[i].startTime != startTime) continue;
        if (memcmp(_rules[i].durations, durations, NUM_CHANNELS) != 0) continue;
        _rules[i].dayMask |= (1u << day);
        return;
    }
    if (_ruleCount < MAX_RULES) {
        _rules[_ruleCount].startTime = startTime;
        _rules[_ruleCount].dayMask   = (1u << day);
        memcpy(_rules[_ruleCount].durations, durations, NUM_CHANNELS);
        _ruleCount++;
    }
}

void TabStatus::deriveRules()
{
    _ruleCount = 0;

    for (int day = 0; day < NUM_DAYS; day++) {
        struct Item { uint16_t start; uint8_t ch; uint8_t dur; };
        Item items[64]; int cnt = 0;
        for (const ScheduleItem &e : schedule)
            if (e.day == (uint8_t)day && cnt < 64)
                items[cnt++] = { e.start, e.channel, e.duration };

        for (int a = 0; a < cnt - 1; a++)
            for (int b = a + 1; b < cnt; b++)
                if (items[b].start < items[a].start ||
                   (items[b].start == items[a].start && items[b].ch < items[a].ch))
                { Item t = items[a]; items[a] = items[b]; items[b] = t; }

        uint16_t bStart = 0;
        uint8_t  bDur[NUM_CHANNELS] = {};
        int  lastCh  = -1;
        uint16_t lastEnd = 0;
        bool inBlock = false;

        for (int k = 0; k < cnt; k++) {
            bool newBlock = !inBlock
                || (int)items[k].ch <= lastCh
                || items[k].start != lastEnd;
            if (newBlock) {
                if (inBlock) addOrMergeRule(bStart, day, bDur);
                bStart = items[k].start;
                memset(bDur, 0, sizeof(bDur));
                inBlock = true;
                lastEnd = items[k].start;
                lastCh  = -1;
            }
            bDur[items[k].ch] = items[k].dur;
            lastCh  = items[k].ch;
            lastEnd = items[k].start + items[k].dur;
        }
        if (inBlock) addOrMergeRule(bStart, day, bDur);
    }

    for (int a = 0; a < _ruleCount - 1; a++)
        for (int b = a + 1; b < _ruleCount; b++)
            if (_rules[b].startTime < _rules[a].startTime)
            { FwRule t = _rules[a]; _rules[a] = _rules[b]; _rules[b] = t; }
}

void TabStatus::applyRulesToSchedule()
{
    schedule.clear();
    for (int r = 0; r < _ruleCount; r++) {
        for (int day = 0; day < NUM_DAYS; day++) {
            if (!(_rules[r].dayMask & (1u << day))) continue;
            uint16_t chStart = _rules[r].startTime;
            for (int ch = 0; ch < NUM_CHANNELS; ch++) {
                if (_rules[r].durations[ch] == 0) continue;
                schedule.push_back({ (uint8_t)day, (uint8_t)ch,
                                     _rules[r].durations[ch], chStart });
                chStart += _rules[r].durations[ch];
            }
        }
    }
    saveDataFile();
}

// ─────────────────────────────────────────────────────────────────────────────
// Step helpers
// ─────────────────────────────────────────────────────────────────────────────

void TabStatus::applyTimeStep(int delta)
{
    int t = (int)_editStartTime + delta;
    if (t < 0)    t += 1440;
    if (t >= 1440) t -= 1440;
    _editStartTime = (uint16_t)t;
    drawStartTime();
}

void TabStatus::applyDurStep(int ch, int delta)
{
    int v = (int)_editDurations[ch] + delta;
    if (v < 0)   v = 0;
    if (v > 250) v = 250;
    _editDurations[ch] = (uint8_t)v;
    drawDuration(ch);
}

// ─────────────────────────────────────────────────────────────────────────────
// Drawing helpers
// ─────────────────────────────────────────────────────────────────────────────

void TabStatus::formatTime(uint16_t minutes, char *buf, size_t len)
{
    snprintf(buf, len, "%d:%02d", minutes / 60, minutes % 60);
}

/**
 * @brief Draws a single ± step button (manual, not a Button object).
 */
void TabStatus::drawStepBtn(int x, int y, int w, int h, const char *lbl, uint8_t font)
{
    _tft->fillRoundRect(x, y, w, h, 4, TFT_NAVY);
    _tft->setTextDatum(MC_DATUM);
    _tft->setTextColor(TFT_WHITE);
    _tft->drawString(lbl, x + w / 2, y + h / 2, font);
    _tft->setTextDatum(TL_DATUM);
}

// ── List view ─────────────────────────────────────────────────────────────────

void TabStatus::drawList()
{
    deriveRules();

    _tft->fillRect(0, _top, _w, _h, bgColor);

    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString("Rules", 10, _top + 6, 4);
    _addButton->draw();

    _tft->drawLine(0, _top + 40, _w, _top + 40, TFT_DARKGREY);

    if (_ruleCount == 0) {
        _tft->setTextDatum(TL_DATUM);
        _tft->setTextColor(TFT_DARKGREY);
        _tft->drawString("No rules.  Tap '+ Add' to create one.", 10, _top + 55, 2);
        return;
    }

    int visible = (_ruleCount < MAX_LIST_ROWS) ? _ruleCount : MAX_LIST_ROWS;
    for (int r = 0; r < visible; r++)
        drawRuleRow(r, _top + 42 + r * LIST_ROW_H);
}

void TabStatus::drawRuleRow(int r, int y)
{
    const FwRule &rule = _rules[r];

    uint16_t rowBg = (r % 2 == 0)
        ? rgbTo565(235, 245, 255)
        : rgbTo565(210, 228, 248);
    _tft->fillRect(0, y, _w - 48, LIST_ROW_H - 1, rowBg);
    _tft->fillRect(_w - 48, y, 48, LIST_ROW_H - 1, rgbTo565(200, 30, 30));

    int ty2 = y + (LIST_ROW_H - 16) / 2; // font 2 centre
    int ty4 = y + (LIST_ROW_H - 26) / 2; // font 4 centre

    _tft->setTextDatum(TL_DATUM);

    // Rule number
    char buf[8];
    snprintf(buf, sizeof(buf), "#%d", r + 1);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(buf, 4, ty2, 2);

    // Start time — font 4 for visibility
    formatTime(rule.startTime, buf, sizeof(buf));
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(buf, 30, ty4, 4);

    // Day indicators: letter if active, '-' if off; space between weeks
    static const char DOW[] = "SMTWTFS";
    char dayStr[18] = {};
    for (int d = 0; d < NUM_DAYS; d++) {
        char ch = (rule.dayMask & (1u << d))
            ? DOW[(boundaryData.boundaryInfo.tm_wday + d) % 7]
            : '-';
        dayStr[d + (d >= 7 ? 1 : 0)] = ch;
    }
    dayStr[7] = ' ';
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(dayStr, 105, ty2, 2);

    // Total duration
    uint16_t total = 0;
    for (int ch = 0; ch < NUM_CHANNELS; ch++) total += rule.durations[ch];
    snprintf(buf, sizeof(buf), "%dm", total);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(buf, _w - 110, ty2, 2);

    // Delete mark
    _tft->setTextColor(TFT_WHITE);
    _tft->setTextDatum(MC_DATUM);
    _tft->drawString("X", _w - 24, y + LIST_ROW_H / 2, 4);
    _tft->setTextDatum(TL_DATUM);
}

// ── Edit view ─────────────────────────────────────────────────────────────────

void TabStatus::openEdit(int ruleIndex)
{
    _editIndex = ruleIndex;
    _expandedControl = -1;
    _holdBtn = -1;
    if (ruleIndex >= 0 && ruleIndex < _ruleCount) {
        _editStartTime = _rules[ruleIndex].startTime;
        _editDayMask   = _rules[ruleIndex].dayMask;
        memcpy(_editDurations, _rules[ruleIndex].durations, NUM_CHANNELS);
    } else {
        _editStartTime = 6 * 60;
        _editDayMask   = 0;
        memset(_editDurations, 0, sizeof(_editDurations));
    }
    _view = VIEW_EDIT;
    drawEdit();
}

void TabStatus::drawDayButton(int i)
{
    bool active = (_editDayMask >> i) & 1u;
    // Muted steel-blue when active, dark-grey when inactive
    _dayButtons[i]->setColors(
        active ? rgbTo565(70, 130, 190) : rgbTo565(90, 90, 90),
        TFT_WHITE);
    _dayButtons[i]->draw();
    _tft->setTextDatum(TL_DATUM);
}

/**
 * @brief Draws the start-time zone.
 *
 * Collapsed: shows "H:MM" in font 4, centred, with a subtle tap-me border.
 * Expanded:  shows  [ - ]  H:MM  [ + ]  step buttons flanking the value.
 */
void TabStatus::drawStartTime()
{
    int zoneY = _top + kStZoneY;
    int zoneH = kStZoneH;

    // Erase zone
    _tft->fillRect(0, zoneY, _w, zoneH, bgColor);

    // "Start:" label
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString("Start:", 4, zoneY + (zoneH - 16) / 2, 2);

    char buf[8];
    formatTime(_editStartTime, buf, sizeof(buf));

    if (_expandedControl == 0) {
        // Expanded: draw [-]  HH:MM  [+]
        // Positions: minus at x=68, value centred at x=185, plus at x=270
        drawStepBtn(68,  zoneY + (zoneH - kDurBtnH) / 2, 52, kDurBtnH, "-");
        drawStepBtn(270, zoneY + (zoneH - kDurBtnH) / 2, 52, kDurBtnH, "+");

        _tft->setTextDatum(MC_DATUM);
        _tft->setTextColor(TFT_BLACK);
        _tft->drawString(buf, 185, zoneY + zoneH / 2, 4);
        _tft->setTextDatum(TL_DATUM);
    } else {
        // Collapsed: value only, with a light border hint
        _tft->drawRoundRect(55, zoneY + 4, _w - 60, zoneH - 8, 4, TFT_LIGHTGREY);
        _tft->setTextDatum(MC_DATUM);
        _tft->setTextColor(TFT_BLACK);
        _tft->drawString(buf, _w / 2, zoneY + zoneH / 2, 4);
        _tft->setTextDatum(TL_DATUM);
    }
}

/**
 * @brief Draws one channel's duration zone.
 *
 * Collapsed: label + value in font 4.
 * Expanded:  label + [ - ]  value  [ + ].
 */
void TabStatus::drawDuration(int ch)
{
    int colW  = _w / 3;
    int col   = ch % 3, row = ch / 3;
    int xBase = col * colW;
    int dY    = _top + kDurRowY + row * kDurRowH;

    // Erase this channel's cell
    _tft->fillRect(xBase, dY, colW, kDurRowH, bgColor);

    // Channel label (font 2, vertically centred)
    char lbl[8];
    snprintf(lbl, sizeof(lbl), "%s:", CH_LABEL[ch]);
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(lbl, xBase + 3, dY + (kDurRowH - 16) / 2, 2);

    char buf[6];
    snprintf(buf, sizeof(buf), "%d", _editDurations[ch]);

    // Font-2 step buttons (24×24) centred in the row; value (font 4, up to 54px wide)
    // placed between them.  Positions:
    //   [-] at xBase+38..62,  value centred at xBase+90,  [+] at xBase+118..142
    int btnY = dY + (kDurRowH - 24) / 2;

    if (_expandedControl == ch + 1) {
        drawStepBtn(xBase + 38, btnY, 24, 24, "-", 2);
        drawStepBtn(xBase + 118, btnY, 24, 24, "+", 2);

        _tft->setTextDatum(MC_DATUM);
        _tft->setTextColor(TFT_BLACK);
        _tft->drawString(buf, xBase + 90, dY + kDurRowH / 2, 4);
        _tft->setTextDatum(TL_DATUM);
    } else {
        // Collapsed: show value to the right of the label, with border hint
        _tft->drawRoundRect(xBase + 38, dY + 3, colW - 42, kDurRowH - 6, 3, TFT_LIGHTGREY);
        _tft->setTextDatum(MC_DATUM);
        _tft->setTextColor(TFT_BLACK);
        int valCx = xBase + 38 + (colW - 42) / 2;
        _tft->drawString(buf, valCx, dY + kDurRowH / 2, 4);
        _tft->setTextDatum(TL_DATUM);
    }
}

void TabStatus::drawEdit()
{
    _tft->fillRect(0, _top, _w, _h, bgColor);

    // ── Header ────────────────────────────────────────────────────────────────
    _tft->setTextDatum(TC_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString(_editIndex < 0 ? "New Rule" : "Edit Rule", _w / 2, _top + 6, 4);
    _tft->setTextDatum(TL_DATUM);

    _backButton->draw();
    _saveButton->draw();
    if (_editIndex >= 0) _delButton->draw();
    _tft->setTextDatum(TL_DATUM);

    // ── Day buttons ───────────────────────────────────────────────────────────
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString("Wk1:", 4, _top + 40, 2);
    _tft->drawString("Wk2:", 4, _top + 66, 2);
    for (int i = 0; i < NUM_DAYS; i++) drawDayButton(i);

    // ── Separator ─────────────────────────────────────────────────────────────
    _tft->drawLine(0, _top + kSepY1, _w, _top + kSepY1, TFT_DARKGREY);

    // ── Start time ────────────────────────────────────────────────────────────
    drawStartTime();

    // ── Separator ─────────────────────────────────────────────────────────────
    _tft->drawLine(0, _top + kSepY2, _w, _top + kSepY2, TFT_DARKGREY);

    // ── Duration controls ─────────────────────────────────────────────────────
    _tft->setTextDatum(TL_DATUM);
    _tft->setTextColor(TFT_BLACK);
    _tft->drawString("Durations (min):", 4, _top + kDurLblY, 2);

    for (int ch = 0; ch < EDIT_CHANNELS; ch++)
        drawDuration(ch);
}

// ─────────────────────────────────────────────────────────────────────────────
// Tab interface
// ─────────────────────────────────────────────────────────────────────────────

void TabStatus::draw()
{
    changed = false;
    if (_view == VIEW_LIST) drawList();
    else                    drawEdit();
}

void TabStatus::loop() {}

/**
 * @brief Routes touch events to the active view.
 *
 * Edit-view long-press logic:
 *   _holdBtn encodes which ± button is physically held.
 *   While the same region is touched repeatedly, handle() bypasses the normal
 *   300-ms debounce and instead fires a ×5 step every 750 ms once the initial
 *   750-ms hold threshold is crossed.
 */
void TabStatus::handle(uint16_t x, uint16_t y, uint32_t lastClick)
{
    // ── LIST view ─────────────────────────────────────────────────────────────
    if (_view == VIEW_LIST) {
        if (lastClick < 300) return;

        if (_addButton->handle(x, y)) return;

        int listTop = _top + 42;
        if (y >= (uint16_t)listTop) {
            int row = (y - listTop) / LIST_ROW_H;
            if (row >= 0 && row < _ruleCount && row < MAX_LIST_ROWS) {
                quickBeep();
                if (x >= (uint16_t)(_w - 48)) {
                    for (int i = row; i < _ruleCount - 1; i++)
                        _rules[i] = _rules[i + 1];
                    _ruleCount--;
                    applyRulesToSchedule();
                    drawList();
                } else {
                    openEdit(row);
                }
            }
        }
        return;
    }

    // ── EDIT view ─────────────────────────────────────────────────────────────

    // --- Nav and day buttons (standard debounce) ------------------------------
    if (lastClick >= 300) {
        if (_backButton->handle(x, y))  return;
        if (_saveButton->handle(x, y))  return;
        if (_editIndex >= 0 && _delButton->handle(x, y)) return;
        for (int i = 0; i < NUM_DAYS; i++)
            if (_dayButtons[i]->handle(x, y)) return;
    }

    // --- Start-time zone ------------------------------------------------------
    int stZoneY = _top + kStZoneY;
    int stZoneB = stZoneY + kStZoneH;

    if (y >= (uint16_t)stZoneY && y < (uint16_t)stZoneB) {
        if (_expandedControl == 0) {
            // Check ± buttons: minus x=[68,120), plus x=[270,322)
            int btnY   = stZoneY + (kStZoneH - kDurBtnH) / 2;
            bool minus = (x >= 68 && x < 120 && y >= (uint16_t)btnY && y < (uint16_t)(btnY + kDurBtnH));
            bool plus  = (x >= 270 && x < 322 && y >= (uint16_t)btnY && y < (uint16_t)(btnY + kDurBtnH));

            if (minus || plus) {
                int btnId  = plus ? 1 : 0;
                int delta1 = plus ? 1 : -1;
                int delta5 = plus ? 5 : -5;
                uint32_t now = millis();

                if (lastClick < 300 && _holdBtn == btnId) {
                    // Finger still held on same button — fire ×5 only after 750 ms
                    if (now - _holdStart >= 750 && now - _lastRepeat >= 750) {
                        applyTimeStep(delta5);
                        _lastRepeat = now;
                    }
                } else {
                    // New press (finger lifted and re-pressed, or first touch)
                    _holdBtn    = btnId;
                    _holdStart  = now;
                    _lastRepeat = now;
                    quickBeep();
                    applyTimeStep(delta1);
                }
                return;
            }
            // Tap outside buttons → collapse (debounce so the original expand-tap
            // doesn't immediately re-collapse before the finger lifts)
            if (lastClick < 300) return;
            _expandedControl = -1;
            _holdBtn = -1;
            drawStartTime();
        } else {
            // Tap on collapsed start-time → expand (collapse any open duration)
            if (lastClick < 300) return;
            int prev = _expandedControl;
            _expandedControl = 0;
            _holdBtn = -1;
            if (prev >= 1 && prev <= EDIT_CHANNELS) drawDuration(prev - 1);
            drawStartTime();
        }
        return;
    }

    // --- Duration zones -------------------------------------------------------
    int colW = _w / 3;
    for (int ch = 0; ch < EDIT_CHANNELS; ch++) {
        int col   = ch % 3, row = ch / 3;
        int xBase = col * colW;
        int dY    = _top + kDurRowY + row * kDurRowH;

        if (x < (uint16_t)xBase || x >= (uint16_t)(xBase + colW)) continue;
        if (y < (uint16_t)dY    || y >= (uint16_t)(dY + kDurRowH)) continue;

        // Touch is in this channel's cell
        if (_expandedControl == ch + 1) {
            // Check ± buttons: minus x=[xBase+38, xBase+62), plus x=[xBase+118, xBase+142)
            int btnY    = dY + (kDurRowH - 24) / 2;
            bool minus  = (x >= (uint16_t)(xBase + 38) && x < (uint16_t)(xBase + 62)
                        && y >= (uint16_t)btnY && y < (uint16_t)(btnY + 24));
            bool plus   = (x >= (uint16_t)(xBase + 118) && x < (uint16_t)(xBase + 142)
                        && y >= (uint16_t)btnY && y < (uint16_t)(btnY + 24));

            if (minus || plus) {
                int btnId  = plus ? (8 + ch) : (2 + ch);
                int delta1 = plus ? 1 : -1;
                int delta5 = plus ? 5 : -5;
                uint32_t now = millis();

                if (lastClick < 300 && _holdBtn == btnId) {
                    // Finger still held — fire ×5 only after 750 ms
                    if (now - _holdStart >= 750 && now - _lastRepeat >= 750) {
                        applyDurStep(ch, delta5);
                        _lastRepeat = now;
                    }
                } else {
                    // New press
                    _holdBtn    = btnId;
                    _holdStart  = now;
                    _lastRepeat = now;
                    quickBeep();
                    applyDurStep(ch, delta1);
                }
                return;
            }
            // Tap outside buttons → collapse this channel (debounced)
            if (lastClick < 300) return;
            _expandedControl = -1;
            _holdBtn = -1;
            drawDuration(ch);
        } else {
            // Tap on collapsed channel → expand it (collapse any other)
            if (lastClick < 300) return;
            int prev = _expandedControl;
            _expandedControl = ch + 1;
            _holdBtn = -1;
            // Redraw previously expanded control (now collapsed)
            if (prev == 0) drawStartTime();
            else if (prev >= 1 && prev <= EDIT_CHANNELS && prev != ch + 1)
                drawDuration(prev - 1);
            drawDuration(ch);
        }
        return;
    }

    // Tap outside all known zones → collapse everything (debounced)
    if (_expandedControl >= 0 && lastClick >= 300) {
        int prev = _expandedControl;
        _expandedControl = -1;
        _holdBtn = -1;
        if (prev == 0) drawStartTime();
        else if (prev >= 1 && prev <= EDIT_CHANNELS) drawDuration(prev - 1);
    }
}

#endif
