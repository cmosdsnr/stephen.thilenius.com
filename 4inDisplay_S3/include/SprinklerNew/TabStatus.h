/**
 * @file TabStatus.h
 * @brief Sprinkler rules list / edit tab.
 */

#ifndef STATUS_H
#define STATUS_H
#include <Arduino.h>
#include <TFT_eSPI.h>
#include "Tab.h"
#include "Button.h"
#include "SprinklerNew/Clock.h"
#include "SprinklerNew/Structs.h"

#define MAX_RULES          20  ///< Maximum number of stored rules
#define LIST_ROW_H         44  ///< Height of each row in list view
#define MAX_LIST_ROWS       5  ///< Maximum visible rows (no scroll beyond this)
#define EDIT_CHANNELS       6  ///< Channels shown in edit view (excludes spare ch6)

/**
 * @brief A derived watering rule — same start/durations applied on multiple days.
 */
struct FwRule {
    uint16_t startTime;               ///< Minutes from midnight (0–1439)
    uint16_t dayMask;                 ///< Bitmask: bit i set = day i active (0–13)
    uint8_t  durations[NUM_CHANNELS]; ///< Per-channel duration in minutes
};

/**
 * @brief Sprinkler status tab showing rules list with add / edit / delete.
 */
class TabStatus : public Tab
{
public:
    TabStatus(TFT_eSPI *tft);
    ~TabStatus();

    /** @brief No-op stub kept for API compatibility. */
    void SetBoundary(BoundaryData boundary);

    /** @brief Re-derive rules from schedule and request a redraw. */
    void refreshRules();

    void draw()   override;
    void loop()   override;
    void handle(uint16_t x, uint16_t y, uint32_t lastClick) override;

private:
    TFT_eSPI *_tft;
    int _top; ///< Y of content area top
    int _w;   ///< Screen width
    int _h;   ///< Content area height

    // ── View state ────────────────────────────────────────────────────────────
    enum View { VIEW_LIST, VIEW_EDIT } _view = VIEW_LIST;
    int _editIndex = -1; ///< Index into _rules[], or -1 for new rule

    // ── Rules (derived from schedule) ─────────────────────────────────────────
    FwRule _rules[MAX_RULES];
    int    _ruleCount = 0;

    void deriveRules();
    void addOrMergeRule(uint16_t startTime, int day, uint8_t durations[]);
    void applyRulesToSchedule();

    // ── Edit state ────────────────────────────────────────────────────────────
    uint16_t _editStartTime = 360; ///< default 6:00
    uint16_t _editDayMask   = 0;
    uint8_t  _editDurations[NUM_CHANNELS];

    /// -1=none, 0=startTime, 1–EDIT_CHANNELS=duration channel 0-based
    int _expandedControl = -1;

    /// Long-press tracking — which control button is held
    /// 0=timeMinus, 1=timePlus, 2..7=durMinus ch0-5, 8..13=durPlus ch0-5; -1=none
    int      _holdBtn    = -1;
    uint32_t _holdStart  = 0;
    uint32_t _lastRepeat = 0;

    void openEdit(int ruleIndex);
    void applyTimeStep(int delta);
    void applyDurStep(int ch, int delta);

    // ── Drawing helpers ───────────────────────────────────────────────────────
    void drawList();
    void drawRuleRow(int ruleIdx, int y);
    void drawEdit();
    void drawDayButton(int dayIdx);
    void drawStartTime();
    void drawDuration(int ch);
    void drawStepBtn(int x, int y, int w, int h, const char *lbl, uint8_t font = 4);
    void formatTime(uint16_t minutes, char *buf, size_t len);

    // ── Buttons — list view ───────────────────────────────────────────────────
    Button *_addButton = nullptr;

    // ── Buttons — edit view (nav + day toggles only) ──────────────────────────
    Button *_backButton = nullptr;
    Button *_saveButton = nullptr;
    Button *_delButton  = nullptr;
    Button *_dayButtons[NUM_DAYS];
};

#endif
